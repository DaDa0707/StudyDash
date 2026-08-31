"use client";

import { TriangleAlert } from "lucide-react";
import { useActionState, useState } from "react";

import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SelectField } from "@/components/form/select-field";
import { SubmitButton } from "@/components/form/submit-button";
import {
  createClassSessionAction,
  updateClassSessionAction,
} from "@/lib/actions/class-sessions";
import { idleFormState } from "@core/form";
import {
  DEFAULT_PERIOD_TIMES,
  PERIODS,
  WEEKDAYS,
  findSlotConflicts,
  formatTime,
  weekdayLabel,
} from "@core/timetable";
import type { Subject } from "@core/database";

/** 重複判定に必要な最小限の情報 */
export interface SlotSummary {
  id: string;
  weekday: number;
  period: number;
  subjectName: string | null;
}

interface Props {
  subjects: Subject[];
  /** 既存の全授業。重複警告に使う */
  existingSlots: SlotSummary[];
  defaultWeekday: number;
  session?: {
    id: string;
    subject_id: string | null;
    weekday: number;
    period: number;
    start_time: string;
    end_time: string;
    room: string | null;
    note: string | null;
  };
}

export function ClassSessionForm({
  subjects,
  existingSlots,
  defaultWeekday,
  session,
}: Props) {
  const isEdit = Boolean(session);
  const [state, formAction] = useActionState(
    isEdit ? updateClassSessionAction : createClassSessionAction,
    idleFormState,
  );

  const [weekday, setWeekday] = useState(session?.weekday ?? defaultWeekday);
  const [period, setPeriod] = useState(session?.period ?? 1);
  const [startTime, setStartTime] = useState(
    session ? formatTime(session.start_time) : DEFAULT_PERIOD_TIMES[1].start,
  );
  const [endTime, setEndTime] = useState(
    session ? formatTime(session.end_time) : DEFAULT_PERIOD_TIMES[1].end,
  );

  /**
   * 時限を変えたら既定時刻を入れ直す。
   * §5.1 のとおり時刻はユーザー設定なので、あくまで初期値の補助。
   */
  function handlePeriodChange(next: number) {
    setPeriod(next);
    const times = DEFAULT_PERIOD_TIMES[next];
    if (times) {
      setStartTime(times.start);
      setEndTime(times.end);
    }
  }

  // §5.1「同一曜日・同一時限の重複登録は警告するが保存は許可する」
  const conflicts = findSlotConflicts(existingSlots, { weekday, period }, session?.id);

  return (
    <form action={formAction} className="space-y-5" noValidate>
      {session ? <input type="hidden" name="id" value={session.id} /> : null}

      <SelectField
        label="科目"
        name="subjectId"
        defaultValue={session?.subject_id ?? ""}
        required
        error={state.fieldErrors?.subjectId}
      >
        <option value="" disabled>
          選択してください
        </option>
        {subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.name}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="曜日"
        name="weekday"
        value={String(weekday)}
        onChange={(event) => setWeekday(Number(event.target.value))}
        error={state.fieldErrors?.weekday}
      >
        {WEEKDAYS.map((day) => (
          <option key={day.value} value={day.value}>
            {day.longLabel}
          </option>
        ))}
      </SelectField>

      <SelectField
        label="時限"
        name="period"
        value={String(period)}
        onChange={(event) => handlePeriodChange(Number(event.target.value))}
        error={state.fieldErrors?.period}
      >
        {PERIODS.map((value) => (
          <option key={value} value={value}>
            {value}限
          </option>
        ))}
      </SelectField>

      {conflicts.length > 0 ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-lg bg-amber-500/10 px-3 py-2.5 text-sm text-amber-700 dark:text-amber-400"
        >
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {weekdayLabel(weekday)}曜{period}限には
            {conflicts.map((c) => c.subjectName ?? "科目なし").join("・")}
            があります。このまま保存もできます。
          </span>
        </p>
      ) : null}

      <div className="grid grid-cols-2 gap-3">
        <Field
          label="開始時刻"
          name="startTime"
          type="time"
          value={startTime}
          onChange={(event) => setStartTime(event.target.value)}
          required
          error={state.fieldErrors?.startTime}
        />
        <Field
          label="終了時刻"
          name="endTime"
          type="time"
          value={endTime}
          onChange={(event) => setEndTime(event.target.value)}
          required
          error={state.fieldErrors?.endTime}
        />
      </div>

      <Field
        label="教室"
        name="room"
        defaultValue={session?.room ?? ""}
        maxLength={50}
        placeholder="任意"
        error={state.fieldErrors?.room}
      />

      <Field
        label="メモ"
        name="note"
        defaultValue={session?.note ?? ""}
        maxLength={500}
        placeholder="任意"
        error={state.fieldErrors?.note}
      />

      <FormMessage state={state} />
      <SubmitButton>{isEdit ? "保存" : "授業を追加"}</SubmitButton>
    </form>
  );
}
