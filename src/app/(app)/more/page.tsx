import {
  BarChart3,
  BookOpen,
  ChevronRight,
  ListChecks,
  NotebookPen,
  FileText,
  MessageSquare,
  Settings,
  Sparkles,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { isPro } from "@core/entitlements";
import { getEntitlement } from "@/lib/entitlements.server";

export const metadata: Metadata = { title: "その他" };

export default async function MorePage() {
  const entitlement = await getEntitlement();

  const links = [
    { href: "/assignments", label: "課題", icon: NotebookPen, note: undefined },
    { href: "/todos", label: "Todo", icon: ListChecks, note: undefined },
    { href: "/subjects", label: "科目", icon: BookOpen, note: undefined },
    { href: "/analytics", label: "分析", icon: BarChart3, note: undefined },
    {
      href: "/pro",
      label: "Pro",
      icon: Sparkles,
      note: isPro(entitlement) ? "利用中" : undefined,
    },
    { href: "/settings", label: "設定", icon: Settings, note: undefined },
    { href: "/feedback", label: "ご意見・ご要望", icon: MessageSquare, note: undefined },
    { href: "/terms", label: "利用規約", icon: FileText, note: undefined },
    { href: "/privacy", label: "プライバシーポリシー", icon: FileText, note: undefined },
  ];

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">その他</h1>

      <ul className="divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
        {links.map(({ href, label, icon: Icon, note }) => (
          <li key={href}>
            <Link
              href={href}
              className="flex min-h-14 items-center gap-3 bg-card px-4 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
            >
              <Icon className="size-5 text-muted-foreground" aria-hidden />
              <span className="flex-1 text-sm font-medium">{label}</span>
              {note ? <span className="text-xs text-muted-foreground">{note}</span> : null}
              <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
            </Link>
          </li>
        ))}
      </ul>
    </div>
  );
}
