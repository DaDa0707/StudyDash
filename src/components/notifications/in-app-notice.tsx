"use client";

import { AlertTriangle, ChevronRight, X } from "lucide-react";
import Link from "next/link";
import { useState, useSyncExternalStore } from "react";

const subscribeToNothing = () => () => {};
const onClient = () => true;
const onServer = () => false;

const STORAGE_PREFIX = "studydash:notice-dismissed:";

function readDismissed(key: string): boolean {
  try {
    return window.localStorage.getItem(STORAGE_PREFIX + key) === "1";
  } catch {
    // プライベートウィンドウなど、保存できない環境では毎回表示する
    return false;
  }
}

function writeDismissed(key: string) {
  try {
    window.localStorage.setItem(STORAGE_PREFIX + key, "1");
  } catch {
    // 保存できなくても表示の閉じる動作自体は成立させる
  }
}

/**
 * §3.1 F-08「対応不可環境ではアプリ内通知」。
 * プッシュ通知が使えなくても、アプリを開けば締切が目に入るようにする。
 *
 * @param dayKey その日の識別子。日付が変わればまた表示する。
 */
export function InAppNotice({
  overdueCount,
  upcomingCount,
  dayKey,
}: {
  overdueCount: number;
  upcomingCount: number;
  dayKey: string;
}) {
  const mounted = useSyncExternalStore(subscribeToNothing, onClient, onServer);
  const [dismissed, setDismissed] = useState(false);

  if (!mounted) return null;
  if (dismissed || readDismissed(dayKey)) return null;

  const parts: string[] = [];
  if (overdueCount > 0) parts.push(`期限切れ${overdueCount}件`);
  if (upcomingCount > 0) parts.push(`まもなく締切${upcomingCount}件`);
  if (parts.length === 0) return null;

  return (
    <div
      role="status"
      className="flex items-center gap-2 rounded-xl bg-amber-500/10 py-2 pl-3 pr-1 text-sm text-amber-800 dark:text-amber-300"
    >
      <AlertTriangle className="size-4 shrink-0" aria-hidden />
      <Link
        href="/assignments"
        className="flex min-w-0 flex-1 items-center gap-1 py-1.5 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <span className="truncate font-medium">{parts.join("・")}</span>
        <ChevronRight className="size-4 shrink-0" aria-hidden />
      </Link>
      <button
        type="button"
        aria-label="お知らせを閉じる"
        onClick={() => {
          writeDismissed(dayKey);
          setDismissed(true);
        }}
        className="flex size-9 shrink-0 items-center justify-center rounded-full transition-colors hover:bg-amber-500/20 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  );
}
