import { BarChart3, ChevronRight, Settings, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { getEntitlement } from "@/lib/entitlements.server";
import { isPro } from "@/lib/entitlements";

export const metadata: Metadata = { title: "その他" };

export default async function MorePage() {
  const entitlement = await getEntitlement();

  const links = [
    { href: "/analytics", label: "分析", icon: BarChart3, note: "Phase 4" },
    { href: "/pro", label: "Pro", icon: Sparkles, note: isPro(entitlement) ? "利用中" : "Phase 5" },
    { href: "/settings", label: "設定", icon: Settings, note: undefined },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">その他</h1>

      <ul className="divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
        {links.map(({ href, label, icon: Icon, note }) => {
          const isReady = href === "/settings";
          const content = (
            <>
              <Icon className="size-5 text-muted-foreground" aria-hidden />
              <span className="flex-1 text-sm font-medium">{label}</span>
              {note ? <span className="text-xs text-muted-foreground">{note}</span> : null}
              {isReady ? <ChevronRight className="size-4 text-muted-foreground" aria-hidden /> : null}
            </>
          );

          return (
            <li key={href}>
              {isReady ? (
                <Link
                  href={href}
                  className="flex min-h-14 items-center gap-3 bg-card px-4 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  {content}
                </Link>
              ) : (
                <div
                  aria-disabled
                  className="flex min-h-14 items-center gap-3 bg-card px-4 opacity-60"
                >
                  {content}
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
