import { BookOpen, CircleCheck, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ClassSessionCard } from "@/components/timetable/class-session-card";
import { WeekdayTabs } from "@/components/timetable/weekday-tabs";
import { Button } from "@/components/ui/button";
import { listClassSessions, listSubjects } from "@/lib/queries/timetable";
import { createClient } from "@/lib/supabase/server";
import { WEEKDAYS, groupByWeekday, zonedWeekdayAndMinutes } from "@/lib/timetable";

export const metadata: Metadata = { title: "時間割" };

function parseDay(value: string | string[] | undefined, fallback: number): number {
  const day = Number(Array.isArray(value) ? value[0] : value);
  return Number.isInteger(day) && day >= 1 && day <= 7 ? day : fallback;
}

export default async function TimetablePage({ searchParams }: PageProps<"/timetable">) {
  const [params, sessions, subjects, supabase] = await Promise.all([
    searchParams,
    listClassSessions(),
    listSubjects(),
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
  const today = zonedWeekdayAndMinutes(new Date(), timezone).weekday;
  const selectedDay = parseDay(params.day, today);

  // 保存後はフォームから離れるため、遷移先で結果を伝える（§11 保存フィードバック）
  const justSaved = (Array.isArray(params.saved) ? params.saved[0] : params.saved) === "1";

  const grouped = groupByWeekday(sessions);
  const counts = new Map(
    WEEKDAYS.map((day) => [day.value, grouped.get(day.value)?.length ?? 0]),
  );
  const daySessions = grouped.get(selectedDay) ?? [];
  const selectedLabel = WEEKDAYS.find((d) => d.value === selectedDay)?.longLabel ?? "";

  return (
    <div className="space-y-5">
      <header className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">時間割</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            全{sessions.length}コマ／科目{subjects.length}件
          </p>
        </div>
        <Button
          render={<Link href="/subjects" />}
          nativeButton={false}
          variant="outline"
          size="lg"
          className="h-11 shrink-0"
        >
          <BookOpen className="size-4" aria-hidden />
          科目
        </Button>
      </header>

      {justSaved ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-400"
        >
          <CircleCheck className="size-4 shrink-0" aria-hidden />
          保存しました
        </p>
      ) : null}

      <WeekdayTabs selected={selectedDay} today={today} counts={counts} />

      <section aria-label={`${selectedLabel}の授業`} className="space-y-3">
        {subjects.length === 0 ? (
          <div className="rounded-xl border border-dashed p-5 text-center">
            <p className="text-sm text-muted-foreground">
              まず科目を登録すると、時間割に授業を追加できます。
            </p>
            <Button
              render={<Link href="/subjects" />}
              nativeButton={false}
              className="mt-4 h-11 px-5 text-base"
            >
              科目を登録する
            </Button>
          </div>
        ) : daySessions.length === 0 ? (
          <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
            {selectedLabel}の授業はまだありません。
          </p>
        ) : (
          <ul className="space-y-2">
            {daySessions.map((session) => (
              <ClassSessionCard key={session.id} session={session} />
            ))}
          </ul>
        )}

        {subjects.length > 0 ? (
          <Button
            render={<Link href={`/timetable/new?day=${selectedDay}`} />}
            nativeButton={false}
            variant="outline"
            className="h-11 w-full text-base"
          >
            <Plus className="size-4" aria-hidden />
            {selectedLabel}に授業を追加
          </Button>
        ) : null}
      </section>
    </div>
  );
}
