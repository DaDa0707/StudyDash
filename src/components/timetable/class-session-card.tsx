import { ChevronRight, MapPin } from "lucide-react";
import Link from "next/link";

import { formatTimeRange } from "@core/timetable";
import type { SessionWithSubject } from "@core/timetable";

/** 週表示の1コマ。タップで編集画面へ移動する。 */
export function ClassSessionCard({ session }: { session: SessionWithSubject }) {
  return (
    <li>
      <Link
        href={`/timetable/${session.id}/edit`}
        className="flex items-stretch gap-3 overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 hover:bg-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        <span
          aria-hidden
          className="w-1.5 shrink-0"
          style={{ backgroundColor: session.subject?.color ?? "#94a3b8" }}
        />
        <div className="flex min-w-0 flex-1 items-center gap-3 py-3 pr-3">
          <div className="w-12 shrink-0 text-center">
            <div className="text-sm font-semibold">{session.period}限</div>
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium">
              {session.subject?.name ?? "科目なし"}
            </p>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span>{formatTimeRange(session.start_time, session.end_time)}</span>
              {session.room ? (
                <span className="inline-flex items-center gap-0.5">
                  <MapPin className="size-3" aria-hidden />
                  {session.room}
                </span>
              ) : null}
            </p>
          </div>
          <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </div>
      </Link>
    </li>
  );
}
