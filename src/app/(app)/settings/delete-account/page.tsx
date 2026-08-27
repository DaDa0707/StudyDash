import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { DeleteAccountForm } from "@/components/settings/delete-account-form";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "アカウントの削除" };

const DELETED_DATA = [
  "登録した科目と時間割",
  "課題とTodo",
  "勉強タイマーの記録と学習履歴",
  "通知の設定とプロフィール",
];

export default async function DeleteAccountPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <div className="space-y-6">
      <Link
        href="/settings"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        設定
      </Link>

      <header>
        <h1 className="text-2xl font-bold tracking-tight">アカウントの削除</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {user?.email} のアカウントと、保存されているデータをすべて削除します。
        </p>
      </header>

      <section className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
        <h2 className="text-sm font-semibold">削除されるもの</h2>
        <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
          {DELETED_DATA.map((item) => (
            <li key={item} className="flex gap-2">
              <span aria-hidden>・</span>
              <span>{item}</span>
            </li>
          ))}
        </ul>
      </section>

      <p className="rounded-xl bg-destructive/10 p-4 text-sm text-destructive">
        削除したデータは元に戻せません。
        有料プランを契約中の場合は、先に解約してから削除してください。
      </p>

      <DeleteAccountForm />
    </div>
  );
}
