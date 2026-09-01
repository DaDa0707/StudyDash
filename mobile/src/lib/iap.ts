import { SITE_URL } from "@/lib/config";

/**
 * 購入の検証をサーバーへ依頼する。
 *
 * 権限を与えてよいかの判断はサーバーだけが行う（§9）。
 * アプリは Apple が署名した取引をそのまま渡すだけで、
 * 「買えたから Pro にする」といった判断をしない。
 */
export async function verifyPurchaseOnServer(
  signedTransaction: string,
): Promise<boolean> {
  const response = await fetch(`${SITE_URL}/api/apple/verify`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ signedTransaction }),
  });

  if (!response.ok) return false;

  const result = (await response.json()) as { applied?: boolean };
  return result.applied === true;
}
