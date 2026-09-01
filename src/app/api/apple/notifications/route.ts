import { isAppleConfigured, getVerifier } from "@/lib/apple/client";
import { applyNotification } from "@/lib/apple/sync";

/**
 * App Store Server Notifications V2 の受け口
 * （§9「支払いWebhookは署名検証を行い、成功後にentitlementを更新する」）。
 *
 * Apple は署名付きの JWS を1つだけ送ってくる。
 * 検証を通す前に中身は一切見ない。送信元を信用できないため。
 */

export async function POST(request: Request) {
  if (!isAppleConfigured) {
    return new Response("apple not configured", { status: 503 });
  }

  let signedPayload: string;
  try {
    const body = (await request.json()) as { signedPayload?: unknown };
    if (typeof body.signedPayload !== "string" || body.signedPayload === "") {
      return new Response("missing signedPayload", { status: 400 });
    }
    signedPayload = body.signedPayload;
  } catch {
    return new Response("invalid body", { status: 400 });
  }

  let payload;
  try {
    // 署名・証明書チェーン・bundleId・環境をここでまとめて確かめる
    payload = await getVerifier().verifyAndDecodeNotification(signedPayload);
  } catch {
    // 検証に通らない＝送信元を信用できない。内容は一切見ない。
    return new Response("invalid signature", { status: 400 });
  }

  try {
    const result = await applyNotification(payload);
    if (!result.applied) {
      // 状態を変えない通知（TEST など）も受領は返す。再送させない。
      console.info("apple notification skipped", payload.notificationType, result.reason);
    }
  } catch (error) {
    console.error("apple notification handling failed", payload.notificationType, error);
    // 5xx を返すと Apple が再送してくれる
    return new Response("handler error", { status: 500 });
  }

  return new Response("ok", { status: 200 });
}
