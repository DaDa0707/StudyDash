import { ChevronRight, Plus } from "lucide-react";
import Link from "next/link";

import { DueBadge } from "@/components/assignments/due-badge";
import { ToggleAssignment } from "@/components/assignments/toggle-assignment";
import { Button } from "@/components/ui/button";
import { HOME_ASSIGNMENT_LIMIT, upcomingAssignments } from "@core/assignments";
import type { AssignmentWithSubject } from "@/lib/queries/assignments";

/** §4.2「締切が近い課題（最大3件）」 */
export function HomeAssignmentsCard({
  assignments,
  now,
  timezone,
}: {
  assignments: AssignmentWithSubject[];
  now: Date;
  timezone: string;
}) {
  const upcoming = upcomingAssignments(assignments, HOME_ASSIGNMENT_LIMIT);

  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">締切が近い課題</h2>
        <Link
          href="/assignments"
          className="inline-flex min-h-8 items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          すべて見る
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      {upcoming.length === 0 ? (
        <>
          <p className="mt-2 text-sm text-muted-foreground">未完了の課題はありません。</p>
          <Button
            render={<Link href="/assignments/new" />}
            nativeButton={false}
            variant="outline"
            className="mt-3 h-11 w-full text-base"
          >
            <Plus className="size-4" aria-hidden />
            課題を追加
          </Button>
        </>
      ) : (
        <ul className="mt-1 divide-y">
          {upcoming.map((assignment) => (
            <li key={assignment.id} className="flex items-center gap-1">
              <ToggleAssignment
                id={assignment.id}
                done={false}
                title={assignment.title}
              />
              <Link
                href={`/assignments/${assignment.id}/edit`}
                className="flex min-w-0 flex-1 items-center gap-2 py-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{assignment.title}</span>
                  {assignment.subject ? (
                    <span className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <span
                        aria-hidden
                        className="size-2 rounded-full"
                        style={{ backgroundColor: assignment.subject.color }}
                      />
                      {assignment.subject.name}
                    </span>
                  ) : null}
                </span>
                <DueBadge
                  dueAt={assignment.due_at}
                  now={now}
                  timezone={timezone}
                  allDay={assignment.due_all_day}
                />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
