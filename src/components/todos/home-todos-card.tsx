import { ChevronRight } from "lucide-react";
import Link from "next/link";

import { TodoItem } from "@/components/todos/todo-item";
import { TodoQuickAdd } from "@/components/todos/todo-quick-add";
import { groupTodos } from "@/lib/todos";
import type { Todo } from "@/types/database";

/** §4.2「今日のTodo」。1タップで完了・追加できる。 */
export function HomeTodosCard({
  todos,
  now,
  timezone,
  canAdd,
}: {
  todos: Todo[];
  now: Date;
  timezone: string;
  canAdd: boolean;
}) {
  const today = groupTodos(todos, now, timezone).today;

  return (
    <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-muted-foreground">今日のTodo</h2>
        <Link
          href="/todos"
          className="inline-flex min-h-8 items-center gap-0.5 text-xs text-muted-foreground hover:text-foreground"
        >
          すべて見る
          <ChevronRight className="size-3.5" aria-hidden />
        </Link>
      </div>

      {today.length === 0 ? (
        <p className="mt-2 text-sm text-muted-foreground">今日のTodoはありません。</p>
      ) : (
        <ul className="mt-2 space-y-1.5">
          {today.slice(0, 5).map((todo) => (
            <TodoItem key={todo.id} todo={todo} now={now} timezone={timezone} />
          ))}
        </ul>
      )}

      <div className="mt-3">
        <TodoQuickAdd disabled={!canAdd} showDueDate={false} />
      </div>
    </section>
  );
}
