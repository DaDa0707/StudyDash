"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import { useSyncExternalStore } from "react";

import { cn } from "@/lib/utils";

/** ハイドレーション後かどうかを、レンダー中の setState なしで判定する */
const subscribeToNothing = () => () => {};
const isClient = () => true;
const isServer = () => false;

const OPTIONS = [
  { value: "light", label: "ライト", icon: Sun },
  { value: "dark", label: "ダーク", icon: Moon },
  { value: "system", label: "端末に合わせる", icon: Monitor },
] as const;

/**
 * ライト/ダークの切り替え（F-09）。
 * 追加テーマ・アクセントカラーは Pro 機能のため Phase 5 以降で拡張する。
 */
export function ThemeToggle() {
  const { theme, setTheme } = useTheme();

  // next-themes はサーバー描画時に実際の値を持たない。
  // ハイドレーション不一致を避けるため、クライアント確定後にだけ選択状態を出す。
  const mounted = useSyncExternalStore(subscribeToNothing, isClient, isServer);

  return (
    <div
      role="radiogroup"
      aria-label="テーマ"
      className="inline-flex rounded-lg bg-muted p-1"
    >
      {OPTIONS.map(({ value, label, icon: Icon }) => {
        const selected = mounted && theme === value;
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={label}
            onClick={() => setTheme(value)}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-md px-3 text-sm transition-colors",
              // 狭い画面ではアイコンのみ（390px 幅で横スクロールを出さない / A-08）
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              selected
                ? "bg-background text-foreground shadow-sm"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            <Icon className="size-4 shrink-0" aria-hidden />
            <span className="hidden sm:inline">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
