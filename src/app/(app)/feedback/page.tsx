import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { FeedbackForm } from "@/components/feedback/feedback-form";

export const metadata: Metadata = { title: "ご意見・ご要望" };

export default function FeedbackPage() {
  return (
    <div className="space-y-6">
      <Link
        href="/more"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        その他
      </Link>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">ご意見・ご要望</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          使ってみて気づいたことを教えてください。
        </p>
      </header>

      <FeedbackForm />

      <p className="rounded-lg bg-muted px-3 py-2.5 text-xs leading-relaxed text-muted-foreground">
        送信されるのは、選んだ種類・入力した内容・送信元の画面・アプリの版だけです。
        課題やTodoの中身が一緒に送られることはありません。
      </p>
    </div>
  );
}
