"use client";

import { Trash2 } from "lucide-react";
import { useActionState, useState } from "react";

import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { Button } from "@/components/ui/button";
import { deleteAssignmentAction } from "@/lib/actions/assignments";
import { idleFormState } from "@core/form";

export function DeleteAssignmentButton({ assignmentId }: { assignmentId: string }) {
  const [state, formAction] = useActionState(deleteAssignmentAction, idleFormState);
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
        この課題を削除
      </Button>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="id" value={assignmentId} />
      <p className="rounded-lg bg-muted px-3 py-2.5 text-sm">この課題を削除します。</p>
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
