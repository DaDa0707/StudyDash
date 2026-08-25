"use client";

import { CalendarDays, House, MoreHorizontal, Plus, Timer } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { toast } from "sonner";

import { cn } from "@/lib/utils";

/** §11 下部ナビ。主要操作を片手で届く位置に置く。 */
const ITEMS = [
  { href: "/home", label: "ホーム", icon: House },
  { href: "/timetable", label: "時間割", icon: CalendarDays },
  { href: "/timer", label: "タイマー", icon: Timer },
  { href: "/more", label: "その他", icon: MoreHorizontal },
] as const;

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function BottomNav() {
  const pathname = usePathname();

  // ＋（クイック追加）を中央に挟んだ 2 + 1 + 2 の配置
  const left = ITEMS.slice(0, 2);
  const right = ITEMS.slice(2);

  return (
    <nav
      aria-label="メインナビゲーション"
      className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80"
    >
      <ul className="mx-auto flex max-w-2xl items-stretch pb-[env(safe-area-inset-bottom)]">
        {left.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}

        <li className="flex flex-1 items-center justify-center">
          <button
            type="button"
            aria-label="課題やTodoを追加"
            onClick={() =>
              toast("クイック追加はPhase 3で実装します", {
                description: "課題・Todoのフォームを追加予定です。",
              })
            }
            className="-mt-4 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Plus className="size-6" aria-hidden />
          </button>
        </li>

        {right.map((item) => (
          <NavItem key={item.href} {...item} active={isActive(pathname, item.href)} />
        ))}
      </ul>
    </nav>
  );
}

interface NavItemProps {
  href: string;
  label: string;
  icon: typeof House;
  active: boolean;
}

function NavItem({ href, label, icon: Icon, active }: NavItemProps) {
  return (
    <li className="flex-1">
      <Link
        href={href}
        aria-current={active ? "page" : undefined}
        className={cn(
          "flex min-h-14 flex-col items-center justify-center gap-0.5 text-[11px] transition-colors",
          "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
          active ? "text-foreground" : "text-muted-foreground hover:text-foreground",
        )}
      >
        <Icon className={cn("size-5", active && "stroke-[2.5]")} aria-hidden />
        <span>{label}</span>
      </Link>
    </li>
  );
}
