"use client";

import { X } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { formatDuration } from "@core/date";
import { deleteStudySessionAction } from "@/lib/actions/study";
import { idleFormState } from "@core/form";
import { subjectLabel } from "@core/timer";
import { useActionToast } from "@/lib/use-action-toast";

export interface HistoryRow {
  id: string;
  /** 例: 8月25日(火) */
  dateLabel: string;
  /** 例: 19:00–20:30 */
  timeLabel: string;
  durationSec: number;
  subjectName: string | null;
  subjectColor: string | null;
}

function DeleteButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={`${label} の記録を削除`}
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
    >
      <X className="size-4" aria-hidden />
    </button>
  );
}

function HistoryItem({ row }: { row: HistoryRow }) {
  const [state, formAction] = useActionState(deleteStudySessionAction, idleFormState);
  useActionToast(state, { silentOnSuccess: true });

  return (
    <li className="flex items-center gap-2 rounded-xl bg-card py-2 pl-4 pr-1 ring-1 ring-foreground/10">
      <div className="min-w-0 flex-1">
        <p className="flex items-center gap-1.5 text-sm font-medium">
          {row.subjectColor ? (
            <span
              aria-hidden
              className="size-2 shrink-0 rounded-full"
              style={{ backgroundColor: row.subjectColor }}
            />
          ) : null}
          <span className="truncate">{subjectLabel(row.subjectName)}</span>
        </p>
        <p className="mt-0.5 text-xs text-muted-foreground">{row.timeLabel}</p>
      </div>

      <span className="shrink-0 text-sm font-semibold tabular-nums">
        {formatDuration(row.durationSec)}
      </span>

      <form action={formAction}>
        <input type="hidden" name="id" value={row.id} />
        <DeleteButton label={`${row.dateLabel} ${row.timeLabel}`} />
      </form>
    </li>
  );
}

/** 日別にまとめた学習履歴（F-07） */
export function HistoryList({
  groups,
}: {
  groups: { dateLabel: string; totalSec: number; rows: HistoryRow[] }[];
}) {
  if (groups.length === 0) {
    return (
      <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
        まだ記録がありません。タイマーで勉強時間を記録すると、ここに残ります。
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {groups.map((group) => (
        <section key={group.dateLabel} className="space-y-2">
          <div className="flex items-baseline justify-between gap-2">
            <h3 className="text-sm font-semibold">{group.dateLabel}</h3>
            <span className="text-xs text-muted-foreground">
              {formatDuration(group.totalSec)}
            </span>
          </div>
          <ul className="space-y-2">
            {group.rows.map((row) => (
              <HistoryItem key={row.id} row={row} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
