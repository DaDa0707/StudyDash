import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { ClassSessionForm, type SlotSummary } from "@/components/timetable/class-session-form";
import { DeleteClassSessionButton } from "@/components/timetable/delete-class-session-button";
import { getClassSession, listClassSessions, listSubjects } from "@/lib/queries/timetable";

export const metadata: Metadata = { title: "授業の編集" };

export default async function EditClassSessionPage({
  params,
}: PageProps<"/timetable/[id]/edit">) {
  const { id } = await params;

  const [session, subjects, sessions] = await Promise.all([
    getClassSession(id),
    listSubjects(),
    listClassSessions(),
  ]);

  if (!session) notFound();

  const slots: SlotSummary[] = sessions.map((item) => ({
    id: item.id,
    weekday: item.weekday,
    period: item.period,
    subjectName: item.subject?.name ?? null,
  }));

  return (
    <div className="space-y-6">
      <Link
        href={`/timetable?day=${session.weekday}`}
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        時間割
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">授業の編集</h1>

      <ClassSessionForm
        subjects={subjects}
        existingSlots={slots}
        defaultWeekday={session.weekday}
        session={session}
      />

      <div className="border-t pt-6">
        <DeleteClassSessionButton sessionId={session.id} weekday={session.weekday} />
      </div>
    </div>
  );
}
