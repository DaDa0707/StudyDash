import { CalendarPlus, MapPin } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import {
  findCurrentOrNextClass,
  formatTimeRange,
  formatTimeUntil,
  weekdayLabel,
  type SessionWithSubject,
} from "@/lib/timetable";

interface Props {
  sessions: SessionWithSubject[];
  now: Date;
  timezone: string;
  /** 科目が未登録なら、授業追加ではなく科目登録へ誘導する */
  hasSubjects: boolean;
}

/**
 * ホーム上部の「次の授業」（§4.2 / §5.1）。
 * 授業中はその授業を「今の授業」として出す。
 */
export function NextClassCard({ sessions, now, timezone, hasSubjects }: Props) {
  const upcoming = findCurrentOrNextClass(sessions, now, timezone);

  if (!upcoming) {
    return (
      <section className="rounded-xl border border-dashed p-4">
        <h2 className="text-sm font-semibold text-muted-foreground">次の授業</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          時間割を登録すると、次の授業がここに出ます。
        </p>
        <Button
          render={<Link href={hasSubjects ? "/timetable" : "/subjects"} />}
          nativeButton={false}
          variant="outline"
          className="mt-3 h-11 w-full text-base"
        >
          <CalendarPlus className="size-4" aria-hidden />
          {hasSubjects ? "時間割を登録する" : "科目を登録する"}
        </Button>
      </section>
    );
  }

  const { session, inProgress, minutesUntilStart } = upcoming;

  return (
    <section className="overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10">
      <div className="flex items-stretch gap-3">
        <span
          aria-hidden
          className="w-1.5 shrink-0"
          style={{ backgroundColor: session.subject?.color ?? "#94a3b8" }}
        />
        <div className="min-w-0 flex-1 py-4 pr-4">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-muted-foreground">
              {inProgress ? "今の授業" : "次の授業"}
            </h2>
            <span
              className={
                inProgress
                  ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                  : "text-xs text-muted-foreground"
              }
            >
              {inProgress ? "進行中" : formatTimeUntil(minutesUntilStart)}
            </span>
          </div>

          <p className="mt-1.5 truncate text-lg font-bold">
            {session.subject?.name ?? "科目なし"}
          </p>

          <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-sm text-muted-foreground">
            <span>
              {weekdayLabel(session.weekday)} {session.period}限
            </span>
            <span>{formatTimeRange(session.start_time, session.end_time)}</span>
            {session.room ? (
              <span className="inline-flex items-center gap-0.5">
                <MapPin className="size-3.5" aria-hidden />
                {session.room}
              </span>
            ) : null}
          </p>
        </div>
      </div>
    </section>
  );
}
