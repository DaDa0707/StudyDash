"use client";

import { useActionState } from "react";

import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { requestPasswordResetAction } from "@/lib/actions/auth";
import { idleFormState } from "@core/form";

export function ResetPasswordForm() {
  const [state, formAction] = useActionState(requestPasswordResetAction, idleFormState);

  if (state.status === "success") {
    return <FormMessage state={state} />;
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Field
        label="メールアドレス"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        error={state.fieldErrors?.email}
      />

      <FormMessage state={state} />
      <SubmitButton>再設定リンクを送る</SubmitButton>
    </form>
  );
}
