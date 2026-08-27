"use client";

import { Bell, BellOff, Check } from "lucide-react";
import { useState, useSyncExternalStore } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";

const subscribeToNothing = () => () => {};
const onClient = () => true;
const onServer = () => false;

/**
 * ブラウザ通知の許可を求める（F-08）。
 *
 * 許可が取れない環境（iOS のホーム画面追加前の Safari など）でも
 * アプリ内通知で同じ情報が届くため、ここは任意の上乗せとして扱う。
 */
export function NotificationPermissionRequest() {
  const mounted = useSyncExternalStore(subscribeToNothing, onClient, onServer);
  const [permission, setPermission] = useState<NotificationPermission | "unsupported">(
    "default",
  );

  // 初回描画では判定せず、クライアント確定後の値を使う
  const current =
    !mounted
      ? "default"
      : permission !== "default"
        ? permission
        : typeof window !== "undefined" && "Notification" in window
          ? Notification.permission
          : "unsupported";

  if (!mounted) return null;

  if (current === "unsupported") {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
        <BellOff className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          この環境ではブラウザ通知を使えません。アプリを開いたときに、アプリ内でお知らせします。
        </span>
      </p>
    );
  }

  if (current === "granted") {
    return (
      <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-400">
        <Check className="size-4 shrink-0" aria-hidden />
        ブラウザ通知は許可済みです。
      </p>
    );
  }

  if (current === "denied") {
    return (
      <p className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground">
        <BellOff className="mt-0.5 size-4 shrink-0" aria-hidden />
        <span>
          ブラウザ通知がブロックされています。使うにはブラウザのサイト設定から許可してください。
        </span>
      </p>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      className="h-11 w-full text-base"
      onClick={async () => {
        const result = await Notification.requestPermission();
        setPermission(result);

        if (result === "granted") {
          toast.success("ブラウザ通知を許可しました");
        } else if (result === "denied") {
          toast("ブラウザ通知は使いません", {
            description: "アプリ内のお知らせは引き続き表示されます。",
          });
        }
      }}
    >
      <Bell className="size-4" aria-hidden />
      ブラウザ通知を許可する
    </Button>
  );
}
