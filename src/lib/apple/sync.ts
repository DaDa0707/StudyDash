import "server-only";

import type {
  JWSTransactionDecodedPayload,
  ResponseBodyV2DecodedPayload,
} from "@apple/app-store-server-library";

import {
  appleStatusFromNotification,
  appleStatusFromTransaction,
  normalizeAppleStatus,
  toSubscriptionUpdate,
} from "@core/billing";
import { grantsPro } from "@core/products";
import { createAdminClient } from "@/lib/supabase/admin";
import { getVerifier } from "@/lib/apple/client";

/**
 * App Store の購読状態を subscriptions テーブルへ反映する（§9）。
 *
 * subscriptions は本人でも書き込めない（RLS に INSERT/UPDATE ポリシーが無い）。
 * ここだけが service_role で書き込む。呼び出し元は署名検証を通った通知に限ること。
 *
 * Stripe 版（かつての src/lib/stripe/sync.ts）と同じ三層の分け方にしてある。
 * 署名検証と振り分けは route が持ち、DB 書き込みはここだけ、
 * 権限の解釈は core/billing.ts だけ。
 */

/**
 * 通知からユーザーを特定する。
 *
 * 購入時にアプリが appAccountToken へ user_id を入れている。
 * 更新など、それが載らない通知のために originalTransactionId でも引けるようにする。
 */
async function resolveUserId(
  transaction: JWSTransactionDecodedPayload,
): Promise<string | null> {
  const fromToken = transaction.appAccountToken;
  if (typeof fromToken === "string" && fromToken !== "") return fromToken;

  const originalTransactionId = transaction.originalTransactionId;
  if (!originalTransactionId) return null;

  const admin = createAdminClient();
  const { data } = await admin
    .from("subscriptions")
    .select("user_id")
    .eq("provider", "apple")
    .eq("customer_id", originalTransactionId)
    .maybeSingle();

  return data?.user_id ?? null;
}

export interface ApplyResult {
  applied: boolean;
  userId: string | null;
  reason?: string;
}

/**
 * 検証済みの取引を DB へ反映する。
 * 通知経路と、購入直後の反映経路の両方から使う。
 *
 * @param appleStatus App Store Server API と同じ status。null なら状態を変えない。
 */
async function applyTransaction(
  transaction: JWSTransactionDecodedPayload,
  appleStatus: number | null,
  now: Date,
): Promise<ApplyResult> {
  // 自分の商品でなければ触らない
  if (!transaction.productId || !grantsPro(transaction.productId)) {
    return { applied: false, userId: null, reason: "対象外の商品" };
  }

  const userId = await resolveUserId(transaction);
  if (!userId) {
    return { applied: false, userId: null, reason: "利用者を特定できない" };
  }

  if (appleStatus === null) {
    return { applied: false, userId, reason: "状態を変えない通知" };
  }

  const update = toSubscriptionUpdate({
    status: normalizeAppleStatus(appleStatus),
    currentPeriodEnd: transaction.expiresDate ? new Date(transaction.expiresDate) : null,
    now,
  });

  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({
      provider: "apple",
      // 購読の一意な識別子。更新のたびに変わらない値を使う。
      customer_id: transaction.originalTransactionId ?? null,
      subscription_id: transaction.transactionId ?? null,
      ...update,
    })
    .eq("user_id", userId);

  if (error) {
    throw new Error(`subscriptions を更新できませんでした: ${error.message}`);
  }

  // profiles.plan は表示用のキャッシュ。権限の正は subscriptions。
  await admin.from("profiles").update({ plan: update.entitlement }).eq("id", userId);

  return { applied: true, userId };
}

/**
 * 購入直後にアプリから送られてきた取引を反映する。
 *
 * Apple のサーバー通知は遅れることがあるため、待たずに反映する経路。
 * 署名はこの中で検証するので、呼び出し元は生の JWS を渡してよい。
 * 偽造できないうえ、反映先は取引に載っている利用者に限られるため、
 * 再送されても同じ結果になるだけで害はない。
 */
export async function applySignedTransaction(
  signedTransaction: string,
  now: Date = new Date(),
): Promise<ApplyResult> {
  const transaction = await getVerifier().verifyAndDecodeTransaction(signedTransaction);

  const status = appleStatusFromTransaction(
    {
      expiresDate: transaction.expiresDate ?? null,
      revocationDate: transaction.revocationDate ?? null,
    },
    now,
  );

  return applyTransaction(transaction, status, now);
}

/**
 * 検証済みの通知を DB へ反映する。
 * 署名検証は呼び出し元が済ませていること。
 */
export async function applyNotification(
  payload: ResponseBodyV2DecodedPayload,
  now: Date = new Date(),
): Promise<ApplyResult> {
  const signedTransaction = payload.data?.signedTransactionInfo;
  if (!signedTransaction) {
    return { applied: false, userId: null, reason: "取引情報が無い通知" };
  }

  const transaction = await getVerifier().verifyAndDecodeTransaction(signedTransaction);

  const status = appleStatusFromNotification(
    typeof payload.notificationType === "string" ? payload.notificationType : undefined,
    typeof payload.subtype === "string" ? payload.subtype : undefined,
  );

  return applyTransaction(transaction, status, now);
}
