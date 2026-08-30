"use client";

import { useActionState, useState } from "react";

import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { completeOnboardingAction } from "@/lib/actions/auth";
import { idleFormState } from "@/lib/form";
import { SCHOOL_TYPES } from "@/lib/validation/auth";
import { cn } from "@/lib/utils";
import type { SchoolType } from "@core/database";

interface Props {
  defaultDisplayName: string;
  defaultSchoolType: SchoolType;
}

export function OnboardingForm({ defaultDisplayName, defaultSchoolType }: Props) {
  const [state, formAction] = useActionState(completeOnboardingAction, idleFormState);
  const [schoolType, setSchoolType] = useState<SchoolType>(defaultSchoolType);

  return (
    <form action={formAction} className="space-y-6" noValidate>
      <Field
        label="表示名"
        name="displayName"
        defaultValue={defaultDisplayName}
        maxLength={50}
        autoComplete="nickname"
        required
        hint="本名でなくてかまいません"
        error={state.fieldErrors?.displayName}
      />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">学校の種類</legend>
        <input type="hidden" name="schoolType" value={schoolType} />
        <div className="grid grid-cols-2 gap-2">
          {SCHOOL_TYPES.map((option) => {
            const selected = schoolType === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSchoolType(option.value)}
                className={cn(
                  "min-h-11 rounded-lg border px-3 py-2.5 text-sm transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
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
        {state.fieldErrors?.schoolType ? (
          <p className="text-xs text-destructive">{state.fieldErrors.schoolType}</p>
        ) : null}
      </fieldset>

      <FormMessage state={state} />
      <SubmitButton>StudyDashを始める</SubmitButton>
    </form>
  );
}
