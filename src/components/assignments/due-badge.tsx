import { describeDueDate } from "@core/deadline";
import { cn } from "@/lib/utils";

/** 締切の相対表示（§5.2）。期限切れ・今日だけ警告色を使う（§11）。 */
export function DueBadge({
  dueAt,
  now,
  timezone,
  allDay,
  className,
}: {
  dueAt: string;
  now: Date;
  timezone: string;
  allDay: boolean;
  className?: string;
}) {
  const due = describeDueDate(new Date(dueAt), now, timezone, allDay);

  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium",
        due.tone === "overdue" && "bg-destructive/15 text-destructive",
        due.tone === "today" && "bg-amber-500/15 text-amber-700 dark:text-amber-400",
        due.tone === "tomorrow" && "bg-muted text-foreground",
        due.tone === "upcoming" && "bg-muted text-muted-foreground",
        className,
      )}
    >
      {due.label}
      {due.timeText ? <span className="font-normal opacity-80">{due.timeText}</span> : null}
    </span>
  );
}
