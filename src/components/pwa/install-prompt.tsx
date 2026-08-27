"use client";

import { Download, X } from "lucide-react";
import { useEffect, useState } from "react";

import { Button } from "@/components/ui/button";

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: "accepted" | "dismissed" }>;
}

const STORAGE_KEY = "studydash:install-dismissed";

/**
 * ホーム画面への追加を促す（§1 PWA 対応）。
 *
 * beforeinstallprompt に対応しない環境（iOS Safari など）では何も出さない。
 * その場合の追加手順は設定画面で案内する。
 */
export function InstallPrompt() {
  const [deferred, setDeferred] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    try {
      if (window.localStorage.getItem(STORAGE_KEY) === "1") return;
    } catch {
      // 保存できない環境でも案内自体は出す
    }

    const onPrompt = (event: Event) => {
      event.preventDefault();
      setDeferred(event as BeforeInstallPromptEvent);
    };

    window.addEventListener("beforeinstallprompt", onPrompt);
    return () => window.removeEventListener("beforeinstallprompt", onPrompt);
  }, []);

  if (!deferred) return null;

  const dismiss = () => {
    try {
      window.localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      // 保存できなくても閉じる動作は成立させる
    }
    setDeferred(null);
  };

  return (
    <div className="flex items-center gap-2 rounded-xl bg-card p-3 ring-1 ring-foreground/10">
      <Download className="size-5 shrink-0 text-muted-foreground" aria-hidden />
      <p className="min-w-0 flex-1 text-sm">
        ホーム画面に追加すると、アプリのように開けます。
      </p>
      <Button
        type="button"
        size="sm"
        className="h-9 shrink-0"
        onClick={async () => {
          await deferred.prompt();
          await deferred.userChoice;
          dismiss();
        }}
      >
        追加
      </Button>
      <button
        type="button"
        aria-label="閉じる"
        onClick={dismiss}
        className="flex size-9 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
