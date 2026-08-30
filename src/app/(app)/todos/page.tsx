import type { Metadata } from "next";
import Link from "next/link";

import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { QuotaNotice } from "@/components/quota-notice";
import { TodoItem } from "@/components/todos/todo-item";
import { TodoQuickAdd } from "@/components/todos/todo-quick-add";
import { checkQuota, UPSELL_MESSAGES } from "@core/entitlements";
import { getEntitlement } from "@/lib/entitlements.server";
import { listTodos } from "@/lib/queries/assignments";
import { createClient } from "@/lib/supabase/server";
import { countOpen, groupTodos } from "@core/todos";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Todo" };

const TABS = [
  { key: "today", label: "今日" },
  { key: "week", label: "今週" },
  { key: "done", label: "完了済み" },
] as const;

type TabKey = (typeof TABS)[number]["key"];

export default async function TodosPage({ searchParams }: PageProps<"/todos">) {
  const [params, todos, entitlement, supabase] = await Promise.all([
    searchParams,
    listTodos(),
    getEntitlement(),
    createClient(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user!.id)
    .single();

  const timezone = profile?.timezone ?? "Asia/Tokyo";
  const now = new Date();

  const raw = Array.isArray(params.tab) ? params.tab[0] : params.tab;
  const tab: TabKey = TABS.some((t) => t.key === raw) ? (raw as TabKey) : "today";

  const grouped = groupTodos(todos, now, timezone);
  const openCount = countOpen(todos);
  const quota = checkQuota(entitlement, "openTodos", openCount);

  const counts: Record<TabKey, number> = {
    today: grouped.today.length,
    week: grouped.thisWeek.length + grouped.later.length,
    done: grouped.done.length,
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">Todo</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          未完了 {openCount}件
          {quota.limit === null ? "" : ` / ${quota.limit}件まで`}
        </p>
      </header>

      <TodoQuickAdd disabled={!quota.allowed} />
      <QuotaNotice quota={quota} message={UPSELL_MESSAGES.openTodos} />
      {quota.shouldUpsell ? (
        <TrackOnMount event="quota_reached" properties={{ feature: "openTodos" }} />
      ) : null}

      <div className="flex gap-1" role="tablist" aria-label="表示切替">
        {TABS.map((item) => (
          <Link
            key={item.key}
            href={`/todos?tab=${item.key}`}
            role="tab"
            aria-selected={tab === item.key}
            className={cn(
              "flex min-h-11 flex-1 items-center justify-center gap-1.5 rounded-lg text-sm transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              tab === item.key
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted",
            )}
          >
            {item.label}
            <span className="text-xs opacity-70">{counts[item.key]}</span>
          </Link>
        ))}
      </div>

      {tab === "today" ? (
        <TodoList
          todos={grouped.today}
          now={now}
          timezone={timezone}
          empty="今日のTodoはありません。"
        />
      ) : null}

      {tab === "week" ? (
        <div className="space-y-5">
          <TodoList
            todos={grouped.thisWeek}
            now={now}
            timezone={timezone}
            empty="今週の予定はありません。"
          />
          {grouped.later.length > 0 ? (
            <section className="space-y-2">
              <h2 className="text-sm font-semibold text-muted-foreground">それ以降</h2>
              <TodoList todos={grouped.later} now={now} timezone={timezone} empty="" />
            </section>
          ) : null}
        </div>
      ) : null}

      {tab === "done" ? (
        <TodoList
          todos={grouped.done}
          now={now}
          timezone={timezone}
          empty="完了したTodoはまだありません。"
        />
      ) : null}
    </div>
  );
}

function TodoList({
  todos,
  now,
  timezone,
  empty,
}: {
  todos: Awaited<ReturnType<typeof listTodos>>;
  now: Date;
  timezone: string;
  empty: string;
}) {
  if (todos.length === 0) {
    if (!empty) return null;
    return (
      <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
        {empty}
      </p>
    );
  }

  return (
    <ul className="space-y-2">
      {todos.map((todo) => (
        <TodoItem key={todo.id} todo={todo} now={now} timezone={timezone} />
      ))}
    </ul>
  );
}
