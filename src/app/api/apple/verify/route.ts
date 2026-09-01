import { isAppleConfigured } from "@/lib/apple/client";
import { applySignedTransaction } from "@/lib/apple/sync";

/**
 * 購入直後の反映（§10.2 手順6「再読込せず可能なら即時に Pro 機能を解放」）。
 *
 * Apple のサーバー通知は遅れることがあるので、アプリが購入結果をここへ送る。
 * 受け取るのは Apple が署名した取引だけで、署名はこの中で検証する。
 * 偽造できないうえ、反映先は取引に載っている利用者に限られるため、
 * 追加の認証は課さない（再送されても同じ結果になるだけ）。
 */

export async function POST(request: Request) {
  if (!isAppleConfigured) {
    return new Response("apple not configured", { status: 503 });
  }

  let signedTransaction: string;
  try {
    const body = (await request.json()) as { signedTransaction?: unknown };
    if (typeof body.signedTransaction !== "string" || body.signedTransaction === "") {
      return new Response("missing signedTransaction", { status: 400 });
    }
    signedTransaction = body.signedTransaction;
  } catch {
    return new Response("invalid body", { status: 400 });
  }

  try {
    const result = await applySignedTransaction(signedTransaction);
    // 反映できたかをアプリへ返す。アプリはこれを見て権限を取り直す。
    return Response.json({ applied: result.applied, reason: result.reason ?? null });
  } catch (error) {
    // 署名が通らない場合もここに来る。理由は返さない。
    console.error("apple verify failed", error);
    return new Response("verification failed", { status: 400 });
  }
}
