"use client";

import { useActionState } from "react";

import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { ResendConfirmation } from "@/components/auth/resend-confirmation";
import { signInAction } from "@/lib/actions/auth";
import { idleFormState } from "@/lib/form";

export function LoginForm({ next }: { next?: string }) {
  const [state, formAction] = useActionState(signInAction, idleFormState);

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {next ? <input type="hidden" name="next" value={next} /> : null}

      <Field
        label="メールアドレス"
        name="email"
        type="email"
        autoComplete="email"
        inputMode="email"
        required
        error={state.fieldErrors?.email}
      />
      <Field
        label="パスワード"
        name="password"
        type="password"
        autoComplete="current-password"
        required
        error={state.fieldErrors?.password}
      />

      <FormMessage state={state} />
      <SubmitButton>ログイン</SubmitButton>

      {/* メール未確認で弾かれた人が、その場で送り直せるようにする */}
      {state.status === "error" && state.message?.includes("確認が完了していません") ? (
        <ResendConfirmation />
      ) : null}
    </form>
  );
}
