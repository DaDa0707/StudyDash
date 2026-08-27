"use client";

import { useEffect } from "react";

/**
 * ルートレイアウトごと壊れたときの最後の受け皿。
 * ここでは独自の <html> を返す必要がある。
 */
export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <html lang="ja">
      <body
        style={{
          minHeight: "100dvh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "1rem",
          padding: "1.25rem",
          textAlign: "center",
          fontFamily: "system-ui, sans-serif",
          background: "#ffffff",
          color: "#171717",
        }}
      >
        <h1 style={{ fontSize: "1.125rem", fontWeight: 600 }}>
          問題が発生しました
        </h1>
        <p style={{ fontSize: "0.875rem", color: "#666", maxWidth: "20rem" }}>
          時間をおいて開き直してください。
        </p>
        <button
          type="button"
          onClick={reset}
          style={{
            minHeight: "2.75rem",
            padding: "0 1.5rem",
            borderRadius: "0.5rem",
            border: 0,
            background: "#171717",
            color: "#ffffff",
            fontSize: "1rem",
          }}
        >
          再読み込み
        </button>
      </body>
    </html>
  );
}
