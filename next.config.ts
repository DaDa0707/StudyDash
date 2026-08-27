import type { NextConfig } from "next";

/**
 * 公開時に付けるセキュリティヘッダ（仕様書 §9）。
 *
 * CSP はここでは付けていない。Next.js のインラインスクリプトに nonce が要り、
 * 付け方を誤ると本番だけ画面が真っ白になる。段階的に入れるほうが安全なので、
 * まず事故の起きにくいものだけを設定する。
 */
const securityHeaders = [
  // 他サイトへの埋め込みを禁じる（クリックジャッキング対策）
  { key: "X-Frame-Options", value: "DENY" },
  // Content-Type の推測を止める
  { key: "X-Content-Type-Options", value: "nosniff" },
  // 外部サイトへ渡すリファラを最小限にする
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  // 使わない端末機能を明示的に切る
  {
    key: "Permissions-Policy",
    value: "camera=(), microphone=(), geolocation=(), payment=()",
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
      {
        // サービスワーカーは常に取り直させる（古い版が残り続けないように）
        source: "/sw.js",
        headers: [{ key: "Cache-Control", value: "public, max-age=0, must-revalidate" }],
      },
    ];
  },
};

export default nextConfig;
