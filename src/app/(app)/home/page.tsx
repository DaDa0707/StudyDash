import type { Metadata } from "next";

import { HomeAssignmentsCard } from "@/components/assignments/home-assignments-card";
import { HomeStudyCard } from "@/components/timer/home-study-card";
import { HomeTodosCard } from "@/components/todos/home-todos-card";
import { NextClassCard } from "@/components/timetable/next-class-card";
import { formatToday, greetingFor } from "@/lib/date";
import { startOfThisWeek, startOfToday } from "@/lib/deadline";
import { checkQuota, isPro } from "@/lib/entitlements";
import { getEntitlement } from "@/lib/entitlements.server";
import { listAssignments, listTodos } from "@/lib/queries/assignments";
import { getRunningSession, listStudySessions } from "@/lib/queries/study";
import { listClassSessions, listSubjects } from "@/lib/queries/timetable";
import { createClient } from "@/lib/supabase/server";
import { inRange, totalSeconds } from "@/lib/study-stats";
import { countOpen } from "@/lib/todos";

export const metadata: Metadata = { title: "ホーム" };

export default async function HomePage() {
  const [supabase, sessions, subjects, assignments, todos, entitlement, running] =
    await Promise.all([
      createClient(),
      listClassSessions(),
      listSubjects(),
      listAssignments(),
      listTodos(),
      getEntitlement(),
      getRunningSession(),
    ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone")
    .eq("id", user!.id)
    .single();

  const timezone = profile?.timezone ?? "Asia/Tokyo";
  const now = new Date();
  const todoQuota = checkQuota(entitlement, "openTodos", countOpen(todos));

  const history = await listStudySessions(entitlement, now, timezone);
  const todayTotal = totalSeconds(inRange(history, startOfToday(now, timezone), now));
  const weekTotal = totalSeconds(inRange(history, startOfThisWeek(now, timezone), now));

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-muted-foreground">{formatToday(now, timezone)}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {greetingFor(now, timezone)}、{profile?.display_name ?? "ゲスト"}さん
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          現在のプラン：{isPro(entitlement) ? "Pro" : "Free"}
        </p>
      </header>

      {/* §4.2：モバイルは1列、タブレット/PCでは2列に並べる */}
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <NextClassCard
            sessions={sessions}
            now={now}
            timezone={timezone}
            hasSubjects={subjects.length > 0}
          />
        </div>

        <HomeAssignmentsCard assignments={assignments} now={now} timezone={timezone} />

        <HomeTodosCard
          todos={todos}
          now={now}
          timezone={timezone}
          canAdd={todoQuota.allowed}
        />

        <div className="sm:col-span-2">
          <HomeStudyCard
            now={now}
            todayTotal={todayTotal}
            weekTotal={weekTotal}
            running={
              running
                ? {
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
        </div>
      </div>
    </div>
  );
}
