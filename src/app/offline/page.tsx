import { WifiOff } from "lucide-react";
import type { Metadata } from "next";

export const metadata: Metadata = { title: "オフライン" };

/** サービスワーカーが通信失敗時に返すページ */
export default function OfflinePage() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
      <span
        aria-hidden
        className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
      >
        <WifiOff className="size-6" />
      </span>
      <h1 className="text-lg font-semibold">オフラインです</h1>
      <p className="max-w-xs text-sm text-muted-foreground">
        通信が回復すると、続きから使えます。電波の届く場所で開き直してください。
      </p>
    </div>
  );
}
