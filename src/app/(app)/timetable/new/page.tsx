import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ClassSessionForm, type SlotSummary } from "@/components/timetable/class-session-form";
import { listClassSessions, listSubjects } from "@/lib/queries/timetable";

export const metadata: Metadata = { title: "授業の追加" };

export default async function NewClassSessionPage({
  searchParams,
}: PageProps<"/timetable/new">) {
  const [params, subjects, sessions] = await Promise.all([
    searchParams,
    listSubjects(),
    listClassSessions(),
  ]);

  // 科目がないと授業を作れないため、先に科目登録へ誘導する
  if (subjects.length === 0) redirect("/subjects");

  const rawDay = Number(Array.isArray(params.day) ? params.day[0] : params.day);
  const defaultWeekday = Number.isInteger(rawDay) && rawDay >= 1 && rawDay <= 7 ? rawDay : 1;

  const slots: SlotSummary[] = sessions.map((session) => ({
    id: session.id,
    weekday: session.weekday,
    period: session.period,
    subjectName: session.subject?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <Link
        href={`/timetable?day=${defaultWeekday}`}
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        時間割
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">授業の追加</h1>

      <ClassSessionForm
        subjects={subjects}
        existingSlots={slots}
        defaultWeekday={defaultWeekday}
      />
    </div>
  );
}
