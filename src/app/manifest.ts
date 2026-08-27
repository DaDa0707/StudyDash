import type { MetadataRoute } from "next";

/**
 * PWA マニフェスト（§1「初期版はWebアプリ（PWA対応）として公開」）。
 * /manifest.webmanifest として配信される。
 */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "StudyDash — 学校生活を、1画面に。",
    short_name: "StudyDash",
    description:
      "次の授業、締切、今日のTodo、勉強時間を一つのダッシュボードで確認できる学習管理アプリ。",
    lang: "ja",
    dir: "ltr",
    start_url: "/home",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#ffffff",
    theme_color: "#4f46e5",
    categories: ["education", "productivity"],
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      {
        src: "/icons/icon-maskable-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
    shortcuts: [
      { name: "タイマーを開く", short_name: "タイマー", url: "/timer" },
      { name: "課題を追加", short_name: "課題", url: "/assignments/new" },
      { name: "時間割", short_name: "時間割", url: "/timetable" },
    ],
  };
}
