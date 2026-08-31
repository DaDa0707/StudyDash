"use client";

import { useActionState } from "react";

import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { updatePasswordAction } from "@/lib/actions/auth";
import { idleFormState } from "@core/form";

export function UpdatePasswordForm() {
  const [state, formAction] = useActionState(updatePasswordAction, idleFormState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Field
        label="新しいパスワード"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="8文字以上"
        error={state.fieldErrors?.password}
      />
      <Field
        label="新しいパスワード（確認）"
        name="confirmPassword"
        type="password"
        autoComplete="new-password"
        required
        error={state.fieldErrors?.confirmPassword}
      />

      <FormMessage state={state} />
      <SubmitButton>パスワードを変更</SubmitButton>
    </form>
  );
}
