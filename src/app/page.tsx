import { CalendarDays, ListChecks, Timer } from "lucide-react";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { APP_STORE_URL } from "@/lib/app-links";

/**
 * 紹介ページ。
 *
 * StudyDash は App Store 経由の iOS / iPad アプリとしてのみ配布する。
 * ブラウザで使う画面は用意しない。ここに残すのは、アプリの紹介と、
 * 規約・プライバシーポリシーへの導線、それにメールのリンクから
 * 戻ってきた人へのお知らせだけ。
 */

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

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function LandingPage({ searchParams }: PageProps<"/">) {
  const params = await searchParams;
  const deleted = single(params.deleted) === "1";
  const confirmed = single(params.confirmed) === "1";
  const linkInvalid = single(params.error) === "link_invalid";

  const notice = deleted
    ? "アカウントを削除しました。ご利用ありがとうございました。"
    : confirmed
      ? "メールアドレスを確認しました。アプリに戻ってログインしてください。"
      : linkInvalid
        ? "リンクの有効期限が切れています。アプリからもう一度お試しください。"
        : null;

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-2xl flex-col px-5 py-6">
      <header className="flex items-center justify-between">
        <span className="text-lg font-bold tracking-tight">StudyDash</span>
      </header>

      <main className="flex flex-1 flex-col justify-center py-12">
        {notice ? (
          <p
            role="status"
            className="mb-6 rounded-lg bg-muted px-3 py-2.5 text-sm text-muted-foreground"
          >
            {notice}
          </p>
        ) : null}

        <h1 className="text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
          学校生活を、1画面に。
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground">
          次の授業、締切、今日のTodo、勉強時間。
          <br />
          バラバラだった情報を、ひとつのダッシュボードにまとめます。
        </p>

        <div className="mt-8">
          {APP_STORE_URL ? (
            <a
              href={APP_STORE_URL}
              className="inline-flex h-12 items-center justify-center rounded-lg bg-primary px-8 text-base font-medium text-primary-foreground"
            >
              App Store で入手
            </a>
          ) : (
            <p className="rounded-lg border border-dashed px-4 py-3 text-sm text-muted-foreground">
              iPhone・iPad 向けアプリを準備中です。
            </p>
          )}
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

      <footer className="space-y-4 border-t pt-6">
        <nav className="flex flex-wrap gap-x-4 gap-y-2 text-xs text-muted-foreground">
          <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
            利用規約
          </Link>
          <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
            プライバシーポリシー
          </Link>
        </nav>
        <div className="flex items-center justify-between">
          <p className="text-xs text-muted-foreground">StudyDash v0.1 (MVP)</p>
          <ThemeToggle />
        </div>
      </footer>
    </div>
  );
}
