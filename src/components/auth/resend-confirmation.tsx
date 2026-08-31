"use client";

import { useActionState, useState } from "react";

import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { Button } from "@/components/ui/button";
import { resendConfirmationAction } from "@/lib/actions/auth";
import { idleFormState } from "@core/form";

/**
 * 確認メールの再送。
 *
 * メールが届かないと利用者は詰んでしまうため、その場で送り直せるようにする。
 * 普段は畳んでおき、必要な人だけが開く。
 */
export function ResendConfirmation({ defaultEmail = "" }: { defaultEmail?: string }) {
  const [state, formAction] = useActionState(resendConfirmationAction, idleFormState);
  const [open, setOpen] = useState(false);

  if (state.status === "success") {
    return <FormMessage state={state} />;
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="ghost"
        onClick={() => setOpen(true)}
        className="h-11 w-full text-sm text-muted-foreground"
      >
        確認メールが届かない場合
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3 rounded-xl border p-4" noValidate>
      <p className="text-sm text-muted-foreground">
        登録に使ったメールアドレスを入れると、確認メールを送り直します。
      </p>

      <Field
        label="メールアドレス"
        name="email"
        type="email"
        inputMode="email"
        autoComplete="email"
        defaultValue={defaultEmail}
        required
        error={state.fieldErrors?.email}
      />

      <FormMessage state={state} />
      <SubmitButton variant="outline">確認メールを送り直す</SubmitButton>
    </form>
  );
}
