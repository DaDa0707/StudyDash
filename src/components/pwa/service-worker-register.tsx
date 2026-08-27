"use client";

import { useEffect } from "react";

/** サービスワーカーを登録する（PWA としてインストール可能にするため） */
export function ServiceWorkerRegister() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    if (process.env.NODE_ENV !== "production") return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch((error) => {
        console.error("service worker registration failed", error);
      });
    };

    // 初回表示を邪魔しないよう、読み込み完了後に登録する
    if (document.readyState === "complete") {
      register();
      return;
    }

    window.addEventListener("load", register);
    return () => window.removeEventListener("load", register);
  }, []);

  return null;
}
