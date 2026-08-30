"use client";

import { useActionState } from "react";

import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { ResendConfirmation } from "@/components/auth/resend-confirmation";

import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { signUpAction } from "@/lib/actions/auth";
import { idleFormState } from "@/lib/form";

export function SignUpForm() {
  const [state, formAction] = useActionState(signUpAction, idleFormState);

  // 確認メール送信後はフォームを畳み、次の操作を案内するだけにする。
  if (state.status === "success") {
    return (
      <div className="space-y-4">
        <TrackOnMount event="signed_up" />
        <FormMessage state={state} />
        <ResendConfirmation />
      </div>
    );
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
      <Field
        label="パスワード"
        name="password"
        type="password"
        autoComplete="new-password"
        required
        hint="8文字以上"
        error={state.fieldErrors?.password}
      />

      <FormMessage state={state} />
      <SubmitButton>アカウントを作成</SubmitButton>
    </form>
  );
}
