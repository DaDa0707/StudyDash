import { ChevronRight } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { ThemeToggle } from "@/components/theme/theme-toggle";
import { Button } from "@/components/ui/button";
import { getEntitlement } from "@/lib/entitlements.server";
import { isPro, limitsFor } from "@core/entitlements";
import { createClient } from "@/lib/supabase/server";
import { SCHOOL_TYPES } from "@core/validation/auth";

import { ProfileForm } from "./profile-form";

export const metadata: Metadata = { title: "設定" };

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="space-y-3">
      <h2 className="text-sm font-semibold text-muted-foreground">{title}</h2>
      {children}
    </section>
  );
}

export default async function SettingsPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, school_type")
    .eq("id", user!.id)
    .single();

  const entitlement = await getEntitlement();
  const limits = limitsFor(entitlement);

  return (
    <div className="space-y-8">
      <h1 className="text-2xl font-bold tracking-tight">設定</h1>

      <Section title="アカウント">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">メールアドレス</dt>
              <dd className="truncate font-medium">{user?.email}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">学校の種類</dt>
              <dd className="font-medium">
                {SCHOOL_TYPES.find((s) => s.value === profile?.school_type)?.label ?? "—"}
              </dd>
            </div>
          </dl>
        </div>

        <ProfileForm
          defaultDisplayName={profile?.display_name ?? ""}
          defaultSchoolType={profile?.school_type ?? "high_school"}
        />
      </Section>

      <Section title="プラン">
        <div className="rounded-xl bg-card p-4 ring-1 ring-foreground/10">
          <p className="text-sm font-medium">{isPro(entitlement) ? "Pro" : "Free"}</p>
          <ul className="mt-2 space-y-1 text-sm text-muted-foreground">
            <li>
              未完了の課題：
              {limits.openAssignments === null ? "無制限" : `${limits.openAssignments}件まで`}
            </li>
            <li>
              未完了のTodo：
              {limits.openTodos === null ? "無制限" : `${limits.openTodos}件まで`}
            </li>
            <li>
              学習履歴：
              {limits.studyHistoryDays === null ? "全期間" : `直近${limits.studyHistoryDays}日`}
            </li>
          </ul>
          <p className="mt-3 text-xs text-muted-foreground">
            プランはサーバー側（subscriptions.entitlement）で判定しています。
          </p>
          <Button
            render={<Link href="/pro" />}
            nativeButton={false}
            variant="outline"
            className="mt-3 h-11 w-full text-base"
          >
            {isPro(entitlement) ? "契約を管理する" : "Proの内容を見る"}
          </Button>
        </div>
      </Section>

      <Section title="テーマ">
        <ThemeToggle />
        {!limits.customThemes ? (
          <p className="text-xs text-muted-foreground">
            追加テーマとアクセントカラーはProの機能です。
          </p>
        ) : null}
      </Section>

      <Section title="通知">
        <Button
          render={<Link href="/settings/notifications" />}
          nativeButton={false}
          variant="outline"
          className="h-11 w-full justify-between text-base"
        >
          締切リマインドの設定
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </Section>

      <Section title="アカウントの削除">
        <Button
          render={<Link href="/settings/delete-account" />}
          nativeButton={false}
          variant="outline"
          className="h-11 w-full justify-between text-base text-destructive"
        >
          アカウントを削除する
          <ChevronRight className="size-4" aria-hidden />
        </Button>
      </Section>

      <form action="/auth/signout" method="post">
        <Button type="submit" variant="outline" className="h-11 w-full text-base">
          ログアウト
        </Button>
      </form>
    </div>
  );
}
