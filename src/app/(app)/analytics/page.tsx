import { Sparkles } from "lucide-react";
import type { Metadata } from "next";

import { HistoryList, type HistoryRow } from "@/components/timer/history-list";
import { formatDuration } from "@core/date";
import {
  formatDueDate,
  startOfThisWeek,
  startOfToday,
  zonedDateKey,
  zonedTimeKey,
} from "@core/deadline";
import { can, limitOf, UPSELL_MESSAGES } from "@core/entitlements";
import { getEntitlement } from "@/lib/entitlements.server";
import { listAssignments } from "@/lib/queries/assignments";
import { listStudySessions } from "@/lib/queries/study";
import { listSubjects } from "@/lib/queries/timetable";
import { createClient } from "@/lib/supabase/server";
import { inRange, sumByDay, sumBySubject, totalSeconds } from "@core/study-stats";
import { subjectLabel } from "@core/timer";

export const metadata: Metadata = { title: "分析" };

export default async function AnalyticsPage() {
  const [supabase, entitlement, subjects, assignments] = await Promise.all([
    createClient(),
    getEntitlement(),
    listSubjects(),
    listAssignments(),
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
  const history = await listStudySessions(entitlement, now, timezone);

  const todayTotal = totalSeconds(inRange(history, startOfToday(now, timezone), now));
  const weekTotal = totalSeconds(inRange(history, startOfThisWeek(now, timezone), now));
  const completedThisWeek = assignments.filter(
    (a) =>
      a.completed_at !== null &&
      Date.parse(a.completed_at) >= startOfThisWeek(now, timezone).getTime(),
  ).length;

  const historyDays = limitOf(entitlement, "studyHistoryDays");
  const showSubjectBreakdown = can(entitlement, "advancedAnalytics");

  const subjectNames = new Map(subjects.map((s) => [s.id, s]));
  const bySubject = sumBySubject(history);
  const subjectMax = bySubject[0]?.seconds ?? 0;

  // 日別にまとめる（F-07）
  const dailyTotals = new Map(sumByDay(history, timezone).map((d) => [d.date, d.seconds]));
  const groupedByDate = new Map<string, HistoryRow[]>();

  for (const session of history) {
    const started = new Date(session.started_at);
    const key = zonedDateKey(started, timezone);
    const rows = groupedByDate.get(key) ?? [];

    rows.push({
      id: session.id,
      dateLabel: formatDueDate(started, timezone),
      timeLabel: `${zonedTimeKey(started, timezone)}–${
        session.ended_at ? zonedTimeKey(new Date(session.ended_at), timezone) : ""
      }`,
      durationSec: session.duration_sec ?? 0,
      subjectName: session.subject?.name ?? null,
      subjectColor: session.subject?.color ?? null,
    });

    groupedByDate.set(key, rows);
  }

  const groups = [...groupedByDate.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([date, rows]) => ({
      dateLabel: rows[0]?.dateLabel ?? date,
      totalSec: dailyTotals.get(date) ?? 0,
      rows,
    }));

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">分析</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {historyDays === null ? "全期間の記録" : `直近${historyDays}日の記録`}
        </p>
      </header>

      <section className="grid grid-cols-3 gap-2">
        {[
          { label: "今日", value: formatDuration(todayTotal) },
          { label: "今週", value: formatDuration(weekTotal) },
          { label: "今週の完了", value: `${completedThisWeek}件` },
        ].map((stat) => (
          <div key={stat.label} className="rounded-xl bg-card p-3 ring-1 ring-foreground/10">
            <p className="text-xs text-muted-foreground">{stat.label}</p>
            <p className="mt-1 text-base font-bold">{stat.value}</p>
          </div>
        ))}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">科目別</h2>

        {!showSubjectBreakdown ? (
          <div
            role="status"
            className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300"
          >
            <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
            <p>{UPSELL_MESSAGES.advancedAnalytics}</p>
          </div>
        ) : bySubject.length === 0 ? (
          <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
            まだ記録がありません。
          </p>
        ) : (
          <ul className="space-y-2">
            {bySubject.map((entry) => {
              const subject = entry.subjectId ? subjectNames.get(entry.subjectId) : undefined;
              const ratio = subjectMax > 0 ? (entry.seconds / subjectMax) * 100 : 0;

              return (
                <li key={entry.subjectId ?? "none"} className="space-y-1">
                  <div className="flex items-baseline justify-between gap-2 text-sm">
                    <span className="flex min-w-0 items-center gap-1.5">
                      <span
                        aria-hidden
                        className="size-2 shrink-0 rounded-full"
                        style={{ backgroundColor: subject?.color ?? "#94a3b8" }}
                      />
                      <span className="truncate">{subjectLabel(subject?.name ?? null)}</span>
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatDuration(entry.seconds)}
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${ratio}%`,
                        backgroundColor: subject?.color ?? "#94a3b8",
                      }}
                    />
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">学習履歴</h2>
        <HistoryList groups={groups} />
        {historyDays !== null ? (
          <p className="text-xs text-muted-foreground">
            {UPSELL_MESSAGES.studyHistoryDays}
          </p>
        ) : null}
      </section>
    </div>
  );
}
