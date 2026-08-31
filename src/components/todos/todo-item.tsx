"use client";

import { Check, X } from "lucide-react";
import { useActionState } from "react";
import { useFormStatus } from "react-dom";

import { DueBadge } from "@/components/assignments/due-badge";
import { deleteTodoAction, toggleTodoAction } from "@/lib/actions/todos";
import { idleFormState } from "@core/form";
import { useActionToast } from "@/lib/use-action-toast";
import { cn } from "@/lib/utils";
import type { Todo } from "@core/database";

function ToggleButton({ done, title }: { done: boolean; title: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-pressed={done}
      aria-label={done ? `${title} を未完了に戻す` : `${title} を完了にする`}
      className="flex size-11 shrink-0 items-center justify-center rounded-full transition-colors focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
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

function DeleteButton({ title }: { title: string }) {
  const { pending } = useFormStatus();

  return (
    <button
      type="submit"
      disabled={pending}
      aria-label={`${title} を削除`}
      className="flex size-11 shrink-0 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-destructive focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring disabled:opacity-50"
    >
      <X className="size-4" aria-hidden />
    </button>
  );
}

export function TodoItem({
  todo,
  now,
  timezone,
}: {
  todo: Todo;
  now: Date;
  timezone: string;
}) {
  const [toggleState, toggleAction] = useActionState(toggleTodoAction, idleFormState);
  const [deleteState, deleteAction] = useActionState(deleteTodoAction, idleFormState);
  const done = todo.status === "done";

  useActionToast(toggleState, { silentOnSuccess: true });
  useActionToast(deleteState, { silentOnSuccess: true });

  return (
    <li className="flex items-center gap-1 rounded-xl bg-card px-1 ring-1 ring-foreground/10">
      <form action={toggleAction}>
        <input type="hidden" name="id" value={todo.id} />
        <ToggleButton done={done} title={todo.title} />
      </form>

      <div className="min-w-0 flex-1 py-2">
        <p className={cn("truncate text-sm", done && "text-muted-foreground line-through")}>
          {todo.title}
        </p>
      </div>

      {todo.due_at && !done ? (
        <DueBadge dueAt={todo.due_at} now={now} timezone={timezone} allDay />
      ) : null}

      <form action={deleteAction}>
        <input type="hidden" name="id" value={todo.id} />
        <DeleteButton title={todo.title} />
      </form>
    </li>
  );
}
