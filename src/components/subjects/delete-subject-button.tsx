"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { Button } from "@/components/ui/button";
import { deleteSubjectAction } from "@/lib/actions/subjects";
import { idleFormState } from "@core/form";

/** 削除は取り消せないため、一度確認を挟む */
export function DeleteSubjectButton({ subjectId }: { subjectId: string }) {
  const [state, formAction] = useActionState(deleteSubjectAction, idleFormState);
  const [confirming, setConfirming] = useState(false);

  if (!confirming) {
    return (
      <Button
        type="button"
        variant="destructive"
        onClick={() => setConfirming(true)}
        className="h-11 w-full text-base"
      >
        <Trash2 className="size-4" aria-hidden />
        この科目を削除
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={subjectId} />
      <p className="rounded-lg bg-muted px-3 py-2.5 text-sm">
        この科目を削除します。時間割の授業は残り、科目なしの表示になります。
      </p>
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
          削除する
        </SubmitButton>
      </div>
    </form>
  );
}
