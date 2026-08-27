"use client";

import { useActionState, useState } from "react";
import { usePathname } from "next/navigation";

import { useAnalytics } from "@/components/analytics/analytics-provider";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { Label } from "@/components/ui/label";
import { submitFeedbackAction } from "@/lib/actions/feedback";
import { idleFormState } from "@/lib/form";
import { cn } from "@/lib/utils";
import { FEEDBACK_CATEGORIES } from "@/lib/validation/feedback";

type Category = (typeof FEEDBACK_CATEGORIES)[number]["value"];

export function FeedbackForm() {
  const [state, formAction] = useActionState(submitFeedbackAction, idleFormState);
  const [category, setCategory] = useState<Category>("request");
  const pathname = usePathname();
  const capture = useAnalytics();

  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <FormMessage state={state} />
        <p className="text-sm text-muted-foreground">
          いただいた内容は今後の改善に使わせてもらいます。返信はできませんが、必ず目を通します。
        </p>
      </div>
    );
  }

  return (
    <form
      action={(formData) => {
        capture("feedback_submitted", { category });
        return formAction(formData);
      }}
      className="space-y-5"
      noValidate
    >
      <input type="hidden" name="pagePath" value={pathname} />

      <fieldset className="space-y-2">
        <legend className="text-sm font-medium">どんな内容ですか</legend>
        <input type="hidden" name="category" value={category} />
        <div className="grid grid-cols-2 gap-2">
          {FEEDBACK_CATEGORIES.map((option) => {
            const selected = category === option.value;
            return (
              <button
                key={option.value}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setCategory(option.value)}
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
      </fieldset>

      <div className="space-y-1.5">
        <Label htmlFor="message" className="text-sm font-medium">
          内容
        </Label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          maxLength={2000}
          placeholder="気づいたこと、困っていることを書いてください。"
          aria-invalid={state.fieldErrors?.message ? true : undefined}
          className={cn(
            "w-full rounded-lg border border-input bg-transparent px-3 py-2.5 text-base",
            "transition-colors outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50",
            "aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20",
            "dark:bg-input/30",
          )}
        />
        {state.fieldErrors?.message ? (
          <p className="text-xs text-destructive">{state.fieldErrors.message}</p>
        ) : null}
      </div>

      <FormMessage state={state} />
      <SubmitButton>送信する</SubmitButton>
    </form>
  );
}
