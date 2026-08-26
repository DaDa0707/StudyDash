import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { DeleteSubjectButton } from "@/components/subjects/delete-subject-button";
import { SubjectForm } from "@/components/subjects/subject-form";
import { getSubject } from "@/lib/queries/timetable";

export const metadata: Metadata = { title: "科目の編集" };

export default async function EditSubjectPage({ params }: PageProps<"/subjects/[id]">) {
  const { id } = await params;
  const subject = await getSubject(id);

  if (!subject) notFound();

  return (
    <div className="space-y-6">
      <Link
        href="/subjects"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        科目一覧
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">科目の編集</h1>

      <SubjectForm subject={subject} />

      <div className="border-t pt-6">
        <DeleteSubjectButton subjectId={subject.id} />
      </div>
    </div>
  );
}
