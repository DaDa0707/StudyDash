"use client";

import { ListChecks, NotebookPen, Plus, X } from "lucide-react";
import Link from "next/link";
import { useState } from "react";

/** §11 下部ナビの ＋：課題/Todo を素早く追加する入口 */
export function QuickAdd() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        aria-label="課題やTodoを追加"
        aria-expanded={open}
        onClick={() => setOpen((value) => !value)}
        className="-mt-4 flex size-12 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform active:scale-95 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring"
      >
        {open ? <X className="size-6" aria-hidden /> : <Plus className="size-6" aria-hidden />}
      </button>

      {open ? (
        <>
          {/* 背景タップで閉じる */}
          <button
            type="button"
            aria-label="閉じる"
            onClick={() => setOpen(false)}
            className="fixed inset-0 z-40 bg-black/40"
          />
          <div className="fixed inset-x-0 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] z-50 mx-auto max-w-2xl px-4">
            <div className="space-y-2 rounded-2xl bg-popover p-2 shadow-xl ring-1 ring-foreground/10">
              <Link
                href="/assignments/new"
                onClick={() => setOpen(false)}
                className="flex min-h-14 items-center gap-3 rounded-xl px-4 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <NotebookPen className="size-5 text-muted-foreground" aria-hidden />
                課題を追加
              </Link>
              <Link
                href="/todos"
                onClick={() => setOpen(false)}
                className="flex min-h-14 items-center gap-3 rounded-xl px-4 text-sm font-medium hover:bg-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-ring"
              >
                <ListChecks className="size-5 text-muted-foreground" aria-hidden />
                Todoを追加
              </Link>
            </div>
          </div>
        </>
      ) : null}
    </>
  );
}
