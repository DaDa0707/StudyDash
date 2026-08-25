import { CalendarDays, ListChecks, Timer } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { isSupabaseConfigured } from "@/lib/env";
import { createClient } from "@/lib/supabase/server";

const FEATURES = [
  {
    icon: CalendarDays,
    title: "次の授業がすぐ分かる",
    body: "曜日・時限で時間割を登録すると、ホームに直近の授業が出ます。",
  },
  {
    icon: ListChecks,
    title: "締切とTodoを一箇所に",
    body: "課題は締切順、Todoは今日の分だけ。優先順位を毎回考え直さずに済みます。",
  },
  {
    icon: Timer,
    title: "勉強時間を記録して振り返る",
    body: "科目を選んでタイマーを開始。今日と今週の合計をホームで確認できます。",
  },
];

export default async function LandingPage() {
  // 設定前でもトップページは表示できるようにする（セットアップ手順は README を参照）
  if (isSupabaseConfigured) {
    const supabase = await createClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (user) redirect("/home");
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-6">
      <header className="flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight">StudyDash</span>
        <Button render={<Link href="/login" />} nativeButton={false} variant="ghost" size="lg">
          ログイン
        </Button>
      </header>

      <main className="flex flex-1 flex-col justify-center py-12">
        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          学校生活を、1画面に。
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          次の授業、締切、今日のTodo、勉強時間。
          <br />
          バラバラだった情報を、ひとつのダッシュボードにまとめます。
        </p>

        <div className="mt-8">
          <Button
            render={<Link href="/signup" />}
            nativeButton={false}
            size="lg"
            className="h-12 w-full text-base sm:w-auto sm:px-8"
          >
            無料で始める
          </Button>
          <p className="mt-2.5 text-xs text-muted-foreground">
            時間割・課題・Todo・タイマーは無料で使えます。
          </p>
        </div>

        <ul className="mt-12 space-y-6">
          {FEATURES.map(({ icon: Icon, title, body }) => (
            <li key={title} className="flex gap-4">
              <span
                className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-muted"
                aria-hidden
              >
                <Icon className="size-5" />
              </span>
              <div>
                <h2 className="font-semibold">{title}</h2>
                <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{body}</p>
              </div>
            </li>
          ))}
        </ul>
      </main>

      <footer className="flex items-center justify-between border-t pt-6">
        <p className="text-xs text-muted-foreground">StudyDash v0.1 (MVP)</p>
        <ThemeToggle />
      </footer>
    </div>
  );
}
