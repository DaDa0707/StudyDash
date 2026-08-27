"use client";

import { useActionState, useState } from "react";

import { Field } from "@/components/form/field";
import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { Button } from "@/components/ui/button";
import { deleteAccountAction } from "@/lib/actions/account";
import { idleFormState } from "@/lib/form";

/** A-10 アカウント削除フロー。確認語の入力を求めてから実行する。 */
export function DeleteAccountForm() {
  const [state, formAction] = useActionState(deleteAccountAction, idleFormState);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="destructive"
        onClick={() => setConfirming(true)}
        className="h-11 w-full text-base"
      >
        アカウントを削除する
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-4" noValidate>
      <Field
        label="確認"
        name="confirmation"
        required
        autoComplete="off"
        placeholder="削除"
        hint="続けるには「削除」と入力してください"
        error={state.fieldErrors?.confirmation}
      />

      <FormMessage state={state} />

      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => setConfirming(false)}
          className="h-11 flex-1 text-base"
        >
          やめる
        </Button>
        <SubmitButton variant="destructive" className="flex-1">
          完全に削除
        </SubmitButton>
      </div>
    </form>
  );
}
