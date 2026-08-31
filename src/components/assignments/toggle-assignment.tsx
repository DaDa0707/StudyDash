"use client";

import { Check } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { toggleAssignmentAction } from "@/lib/actions/assignments";
import { idleFormState } from "@core/form";
import { useActionToast } from "@/lib/use-action-toast";
import { cn } from "@/lib/utils";

function Checkbox({ done, label }: { done: boolean; label: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={done}
      aria-label={label}
      className={cn(
        "flex size-11 shrink-0 items-center justify-center rounded-full transition-colors",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring",
        "disabled:opacity-50",
      )}
    >
      <span
        className={cn(
          "flex size-6 items-center justify-center rounded-md border-2 transition-colors",
          done ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
        )}
      >
        {done ? <Check className="size-4" aria-hidden /> : null}
      </span>
    </button>
  );
}

/** 一覧・ホームから1タップで完了を切り替える（§4.2 UX原則） */
export function ToggleAssignment({ id, done, title }: { id: string; done: boolean; title: string }) {
  const [state, formAction] = useActionState(toggleAssignmentAction, idleFormState);

  // 成功はチェックの見た目で分かるため、失敗だけ知らせる
  useActionToast(state, { silentOnSuccess: true });

  return (
    <form action={formAction}>
      <input type="hidden" name="id" value={id} />
      <Checkbox done={done} label={done ? `${title} を未完了に戻す` : `${title} を完了にする`} />
    </form>
  );
}
