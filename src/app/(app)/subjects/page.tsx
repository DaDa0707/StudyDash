import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { SubjectForm } from "@/components/subjects/subject-form";
import { listSubjects } from "@/lib/queries/timetable";

export const metadata: Metadata = { title: "科目" };

export default async function SubjectsPage() {
  const subjects = await listSubjects();

  return (
    <div className="space-y-8">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">科目</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          時間割や課題で使う科目を登録します。
        </p>
      </header>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">科目を追加</h2>
        <SubjectForm />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-semibold text-muted-foreground">
          登録済み（{subjects.length}件）
        </h2>

        {subjects.length === 0 ? (
          <p className="rounded-xl border border-dashed p-4 text-sm text-muted-foreground">
            まだ科目がありません。上のフォームから追加してください。
          </p>
        ) : (
          <ul className="divide-y overflow-hidden rounded-xl ring-1 ring-foreground/10">
            {subjects.map((subject) => (
              <li key={subject.id}>
                <Link
                  href={`/subjects/${subject.id}`}
                  className="flex min-h-14 items-center gap-3 bg-card px-4 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
                >
                  <span
                    aria-hidden
                    className="size-3 shrink-0 rounded-full"
                    style={{ backgroundColor: subject.color }}
                  />
                  <span className="flex-1 truncate text-sm font-medium">{subject.name}</span>
                  {subject.teacher ? (
                    <span className="truncate text-xs text-muted-foreground">
                      {subject.teacher}
                    </span>
                  ) : null}
                  <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
