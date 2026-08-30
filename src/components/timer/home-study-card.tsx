import { ChevronRight, Play, Timer } from "lucide-react";
import Link from "next/link";

import { Button } from "@/components/ui/button";
import { formatDuration } from "@core/date";
import { elapsedSeconds, formatTimerDisplay, subjectLabel, type TimerFields } from "@core/timer";

interface Props {
  running:
    | (TimerFields & { subjectName: string | null; subjectColor: string | null })
    | null;
  now: Date;
  todayTotal: number;
  weekTotal: number;
}

/** §4.2 の 5「勉強タイマーの開始ボタン」と 6「今日/今週の勉強時間」 */
export function HomeStudyCard({ running, now, todayTotal, weekTotal }: Props) {
  const isRunning = running !== null && running.segment_started_at !== null;

  return (
    <section className="space-y-3">
      <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <div className="flex items-center justify-between gap-2">
          <h2 className="text-sm font-semibold text-muted-foreground">勉強タイマー</h2>
          {running ? (
            <span
              className={
                isRunning
                  ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs font-medium text-emerald-700 dark:text-emerald-400"
                  : "rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground"
              }
            >
              {isRunning ? "計測中" : "一時停止中"}
            </span>
          ) : null}
        </div>

        {running ? (
          <Link
            href="/timer"
            className="mt-3 flex items-center gap-3 rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
          >
            <Timer className="size-5 shrink-0 text-muted-foreground" aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block font-mono text-xl font-bold tabular-nums">
                {formatTimerDisplay(elapsedSeconds(running, now))}
              </span>
              <span className="mt-0.5 flex items-center gap-1.5 text-xs text-muted-foreground">
                {running.subjectColor ? (
                  <span
                    aria-hidden
                    className="size-2 rounded-full"
                    style={{ backgroundColor: running.subjectColor }}
                  />
                ) : null}
                {subjectLabel(running.subjectName)}
              </span>
            </span>
            <ChevronRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
          </Link>
        ) : (
          <Button
            render={<Link href="/timer" />}
            nativeButton={false}
            className="mt-3 h-11 w-full text-base"
          >
            <Play className="size-4" aria-hidden />
            勉強を始める
          </Button>
        )}
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">今日の勉強時間</p>
          <p className="mt-1 text-lg font-bold">{formatDuration(todayTotal)}</p>
        </div>
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-xs text-muted-foreground">今週の合計</p>
          <p className="mt-1 text-lg font-bold">{formatDuration(weekTotal)}</p>
        </div>
      </div>
    </section>
  );
}
