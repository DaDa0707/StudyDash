import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { DueBadge } from "@/components/assignments/due-badge";
import { ToggleAssignment } from "@/components/assignments/toggle-assignment";
import { isHighPriority, priorityLabel } from "@core/assignments";
import type { AssignmentWithSubject } from "@/lib/queries/assignments";
import { cn } from "@/lib/utils";

export function AssignmentCard({
  assignment,
  now,
  timezone,
}: {
  assignment: AssignmentWithSubject;
  now: Date;
  timezone: string;
}) {
  const done = assignment.status === "done";
  const priority = priorityLabel(assignment.priority);

  return (
    <li className="flex items-center gap-1 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="pl-1">
        <ToggleAssignment id={assignment.id} done={done} title={assignment.title} />
      </div>

      <Link
        href={`/assignments/${assignment.id}/edit`}
        className="flex min-w-0 flex-1 items-center gap-2 py-3 pr-3 hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
      >
        <div className="min-w-0 flex-1">
          <p className={cn("truncate font-medium", done && "text-muted-foreground line-through")}>
            {assignment.title}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-1.5">
            {assignment.subject ? (
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground">
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: assignment.subject.color }}
                />
                {assignment.subject.name}
              </span>
            ) : null}
            {priority ? (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px]",
                  isHighPriority(assignment.priority)
                    ? "bg-destructive/15 text-destructive"
                    : "bg-muted text-muted-foreground",
                )}
              >
                優先度{priority}
              </span>
            ) : null}
            {assignment.status === "in_progress" ? (
              <span className="rounded-full bg-muted px-1.5 py-0.5 text-[11px] text-muted-foreground">
                進行中
              </span>
            ) : null}
          </div>
        </div>

        {done ? null : (
          <DueBadge
            dueAt={assignment.due_at}
            now={now}
            timezone={timezone}
            allDay={assignment.due_all_day}
          />
        )}
        <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
      </Link>
    </li>
  );
}
