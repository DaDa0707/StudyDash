"use client";

import { Plus } from "lucide-react";
import { useActionState, useRef } from "react";
import { useFormStatus } from "react-dom";

import { useAnalytics } from "@/components/analytics/analytics-provider";
import { FormMessage } from "@/components/form/form-message";
import { Input } from "@/components/ui/input";
import { createTodoAction } from "@/lib/actions/todos";
import { idleFormState } from "@core/form";

function AddButton() {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label="Todoを追加"
      className="flex size-11 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
    >
      <Plus className="size-5" aria-hidden />
    </button>
  );
}

/**
 * 1行で足せる Todo 入力（§4.2 UX原則：1タップで追加）。
 *
 * ホームは「入力より確認を優先する」ため、期限欄を出さず内容だけで足せるようにする。
 * 期限まで指定したい場合は Todo 画面（showDueDate）を使う。
 */
export function TodoQuickAdd({
  disabled,
  showDueDate = true,
}: {
  disabled?: boolean;
  showDueDate?: boolean;
}) {
  const [state, formAction] = useActionState(createTodoAction, idleFormState);
  const capture = useAnalytics();
  const formRef = useRef<HTMLFormElement>(null);

  return (
    <form
      ref={formRef}
      action={async (formData) => {
        capture("todo_created");
        await formAction(formData);
        formRef.current?.reset();
      }}
      className="space-y-2"
      noValidate
    >
      <div className="flex gap-2">
        <Input
          name="title"
          maxLength={100}
          required
          disabled={disabled}
          placeholder="やること"
          aria-label="やること"
          aria-invalid={state.fieldErrors?.title ? true : undefined}
          className="h-11 text-base"
        />
        {showDueDate ? (
          <Input
            name="dueDate"
            type="date"
            disabled={disabled}
            aria-label="期限（任意）"
            className="h-11 w-[8.5rem] shrink-0 text-sm"
          />
        ) : null}
        {disabled ? null : <AddButton />}
      </div>

      {state.fieldErrors?.title ? (
        <p className="text-xs text-destructive">{state.fieldErrors.title}</p>
      ) : null}
      <FormMessage state={state} />
    </form>
  );
}
