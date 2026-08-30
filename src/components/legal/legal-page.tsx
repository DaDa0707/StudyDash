import { ChevronLeft } from "lucide-react";
import Link from "next/link";
import type { ReactNode } from "react";

import { missingLegalFields } from "@/lib/legal";

/** 規約・ポリシーの共通レイアウト。読みやすさを優先する。 */
export function LegalPage({
  title,
  updatedAt,
  children,
}: {
  title: string;
  updatedAt: string;
  children: ReactNode;
}) {
  const missing = missingLegalFields();

  return (
    <div className="mx-auto w-full max-w-2xl px-5 py-6">
      <Link
        href="/"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        StudyDash
      </Link>

      <header className="mt-4">
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="mt-1 text-sm text-muted-foreground">最終改定日：{updatedAt}</p>
      </header>

      {missing.length > 0 ? (
        <p
          role="status"
          className="mt-5 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm text-amber-800 dark:text-amber-300"
        >
          公開前に {missing.join("・")} を <code>src/lib/legal.ts</code> に記入してください。
        </p>
      ) : null}

      <div className="mt-6 space-y-8 pb-16">{children}</div>
    </div>
  );
}

export function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-base font-bold">{title}</h2>
      <div className="space-y-3 text-sm leading-relaxed text-muted-foreground">{children}</div>
    </section>
  );
}

export function List({ items }: { items: ReactNode[] }) {
  return (
    <ul className="space-y-1.5">
      {items.map((item, index) => (
        <li key={index} className="flex gap-2">
          <span aria-hidden className="shrink-0">
            ・
          </span>
          <span className="min-w-0">{item}</span>
        </li>
      ))}
    </ul>
  );
}
