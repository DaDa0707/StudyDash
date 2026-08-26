import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { AssignmentForm } from "@/components/assignments/assignment-form";
import { DeleteAssignmentButton } from "@/components/assignments/delete-assignment-button";
import { zonedDateKey, zonedTimeKey } from "@/lib/deadline";
import { getAssignment } from "@/lib/queries/assignments";
import { listSubjects } from "@/lib/queries/timetable";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "課題の編集" };

export default async function EditAssignmentPage({
  params,
}: PageProps<"/assignments/[id]/edit">) {
  const { id } = await params;

  const [assignment, subjects, supabase] = await Promise.all([
    getAssignment(id),
    listSubjects(),
    createClient(),
  ]);

  if (!assignment) notFound();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user!.id)
    .single();

  const timezone = profile?.timezone ?? "Asia/Tokyo";
  const dueAt = new Date(assignment.due_at);

  return (
    <div className="space-y-6">
      <Link
        href="/assignments"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        課題
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">課題の編集</h1>

      <AssignmentForm
        subjects={subjects}
        defaultDueDate={zonedDateKey(dueAt, timezone)}
        assignment={{
          id: assignment.id,
          title: assignment.title,
          subject_id: assignment.subject_id,
          dueDate: zonedDateKey(dueAt, timezone),
          dueTime: assignment.due_all_day ? "" : zonedTimeKey(dueAt, timezone),
          priority: assignment.priority,
          status: assignment.status,
          note: assignment.note,
        }}
      />

      <div className="border-t pt-6">
        <DeleteAssignmentButton assignmentId={assignment.id} />
      </div>
    </div>
  );
}
