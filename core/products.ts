/**
 * App 内課金の商品。
 *
 * 金額はここに書かない（仕様書 §6）。App Store Connect の設定を読み出して表示する。
 * ここが持つのは識別子だけで、アプリ（購入する側）とサーバー（検証する側）の
 * 両方が同じ値を見るために core に置く。
 */

/** Pro の月額。App Store Connect と StoreKit 設定ファイルで同じ ID を使う */
export const PRO_MONTHLY_PRODUCT_ID = "com.dada0707.studydash.pro.monthly";

/** 購読として扱う商品。増えたらここに足す */
export const SUBSCRIPTION_PRODUCT_IDS: readonly string[] = [PRO_MONTHLY_PRODUCT_ID];

/** その商品 ID が Pro を与えるものか */
export function grantsPro(productId: string): boolean {
  return SUBSCRIPTION_PRODUCT_IDS.includes(productId);
}
