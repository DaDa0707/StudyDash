import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TimerPanel } from "@/components/timer/timer-panel";
import { formatDuration } from "@/lib/date";
import { startOfThisWeek, startOfToday } from "@/lib/deadline";
import { getEntitlement } from "@/lib/entitlements.server";
import { getRunningSession, listStudySessions } from "@/lib/queries/study";
import { listSubjects } from "@/lib/queries/timetable";
import { createClient } from "@/lib/supabase/server";
import { inRange, totalSeconds } from "@/lib/study-stats";

export const metadata: Metadata = { title: "タイマー" };

export default async function TimerPage() {
  const [supabase, subjects, running, entitlement] = await Promise.all([
    createClient(),
    listSubjects(),
    getRunningSession(),
    getEntitlement(),
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

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold tracking-tight">勉強タイマー</h1>

      <TimerPanel
        subjects={subjects}
        serverNow={now.toISOString()}
        defaultSubjectId={running?.subject_id ?? null}
        running={
          running
            ? {
                id: running.id,
                started_at: running.started_at,
                ended_at: running.ended_at,
                duration_sec: running.duration_sec,
                segment_started_at: running.segment_started_at,
                accumulated_sec: running.accumulated_sec,
                subjectName: running.subject?.name ?? null,
                subjectColor: running.subject?.color ?? null,
              }
            : null
        }
      />

      <section className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">今日</p>
          <p className="mt-1 text-lg font-bold">{formatDuration(todayTotal)}</p>
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">今週</p>
          <p className="mt-1 text-lg font-bold">{formatDuration(weekTotal)}</p>
        </div>
      </section>

      <Link
        href="/analytics"
        className="flex min-h-14 items-center gap-2 rounded-xl bg-card px-4 ring-1 ring-foreground/10 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span className="flex-1 text-sm font-medium">学習履歴を見る</span>
        <ChevronRight className="size-4 text-muted-foreground" aria-hidden />
      </Link>
    </div>
  );
}
