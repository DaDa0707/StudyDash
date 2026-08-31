"use client";

import { useActionState, useState } from "react";

import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { updateNotificationSettingsAction } from "@/lib/actions/notifications";
import { idleFormState } from "@core/form";
import { REMINDER_OPTIONS } from "@core/notifications";
import { cn } from "@/lib/utils";

interface Props {
  remindersEnabled: boolean;
  selectedOffsets: number[];
  quietEnabled: boolean;
  quietStart: string;
  quietEnd: string;
  /** 選べるタイミング数。Free は 1（§6） */
  maxTimings: number | null;
}

function Toggle({
  name,
  label,
  description,
  defaultChecked,
  onChange,
}: {
  name: string;
  label: string;
  description?: string;
  defaultChecked: boolean;
  onChange?: (checked: boolean) => void;
}) {
  return (
    <label className="flex min-h-14 cursor-pointer items-center gap-3">
      <input
        type="checkbox"
        name={name}
        defaultChecked={defaultChecked}
        onChange={(event) => onChange?.(event.target.checked)}
        className="size-5 shrink-0 accent-[var(--primary)]"
      />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-medium">{label}</span>
        {description ? (
          <span className="mt-0.5 block text-xs text-muted-foreground">{description}</span>
        ) : null}
      </span>
    </label>
  );
}

export function NotificationSettingsForm({
  remindersEnabled,
  selectedOffsets,
  quietEnabled,
  quietStart,
  quietEnd,
  maxTimings,
}: Props) {
  const [state, formAction] = useActionState(updateNotificationSettingsAction, idleFormState);
  const [offsets, setOffsets] = useState<number[]>(selectedOffsets);
  const [quietOn, setQuietOn] = useState(quietEnabled);

  const limitReached = maxTimings !== null && offsets.length >= maxTimings;

  function toggleOffset(minutes: number) {
    setOffsets((current) => {
      if (current.includes(minutes)) {
        return current.filter((value) => value !== minutes);
      }
      // Free は1つだけ。選び直せるよう、上限に達していたら入れ替える。
      if (maxTimings === 1) return [minutes];
      if (limitReached) return current;
      return [...current, minutes];
    });
  }

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <Toggle
        name="assignmentReminders"
        label="締切リマインドを受け取る"
        description="課題の締切が近づいたら知らせます。"
        defaultChecked={remindersEnabled}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">知らせるタイミング</legend>
        <p className="text-xs text-muted-foreground">
          {maxTimings === null
            ? "いくつでも選べます。"
            : `${maxTimings}つまで選べます。`}
        </p>

        {offsets.map((minutes) => (
          <input key={minutes} type="hidden" name="offsets" value={minutes} />
        ))}

        <div className="flex flex-wrap gap-2 pt-1">
          {REMINDER_OPTIONS.map((option) => {
            const selected = offsets.includes(option.minutes);
            const disabled = !selected && limitReached && maxTimings !== 1;

            return (
              <button
                key={option.minutes}
                type="button"
                role="checkbox"
                aria-checked={selected}
                disabled={disabled}
                onClick={() => toggleOffset(option.minutes)}
                className={cn(
                  "min-h-11 rounded-lg border px-3 text-sm transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  "disabled:cursor-not-allowed disabled:opacity-40",
                  selected
                    ? "border-primary bg-primary text-primary-foreground"
                    : "border-input hover:bg-muted",
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </fieldset>

      <div className="space-y-2">
        <Toggle
          name="quietHoursEnabled"
          label="通知を控える時間帯"
          description="この時間帯はアプリ内の通知も出しません。"
          defaultChecked={quietEnabled}
          onChange={setQuietOn}
        />

        {quietOn ? (
          <div className="grid grid-cols-2 gap-3">
            <Field label="開始" name="quietHoursStart" type="time" defaultValue={quietStart} />
            <Field label="終了" name="quietHoursEnd" type="time" defaultValue={quietEnd} />
          </div>
        ) : (
          <>
            <input type="hidden" name="quietHoursStart" value={quietStart} />
            <input type="hidden" name="quietHoursEnd" value={quietEnd} />
          </>
        )}
      </div>

      <FormMessage state={state} />
      <SubmitButton>保存</SubmitButton>
    </form>
  );
}
