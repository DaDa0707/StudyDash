import Link from "next/link";

import { WEEKDAYS } from "@/lib/timetable";
import { cn } from "@/lib/utils";

interface Props {
  selected: number;
  today: number;
  /** 曜日ごとの授業数 */
  counts: Map<number, number>;
}

/**
 * 週の全曜日を一列に出し、選んだ日の授業を下に表示する（S-04 週表示）。
 * 390px でも収まるよう、ラベルは1文字＋件数ドットにとどめる。
 */
export function WeekdayTabs({ selected, today, counts }: Props) {
  return (
    <nav aria-label="曜日" className="flex gap-1">
      {WEEKDAYS.map((day) => {
        const isSelected = day.value === selected;
        const count = counts.get(day.value) ?? 0;

        return (
          <Link
            key={day.value}
            href={`/timetable?day=${day.value}`}
            aria-current={isSelected ? "page" : undefined}
            aria-label={`${day.longLabel}（${count}件）`}
            className={cn(
              "flex min-h-14 flex-1 flex-col items-center justify-center gap-1 rounded-lg text-sm transition-colors",
              "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
              isSelected
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted",
            )}
          >
            <span className={cn("font-medium", day.value === today && !isSelected && "text-foreground")}>
              {day.label}
            </span>
            <span
              aria-hidden
              className={cn(
                "size-1.5 rounded-full",
                count === 0
                  ? "bg-transparent"
                  : isSelected
                    ? "bg-primary-foreground/70"
                    : "bg-muted-foreground/50",
              )}
            />
          </Link>
        );
      })}
    </nav>
  );
}
