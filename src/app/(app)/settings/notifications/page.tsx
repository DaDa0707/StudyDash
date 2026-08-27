import { ChevronLeft, Sparkles } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { InstallPrompt } from "@/components/pwa/install-prompt";
import { NotificationPermissionRequest } from "@/components/notifications/permission-request";
import { NotificationSettingsForm } from "@/components/notifications/notification-settings-form";
import { isPro, limitOf, UPSELL_MESSAGES } from "@/lib/entitlements";
import { getEntitlement } from "@/lib/entitlements.server";
import { formatTime } from "@/lib/timetable";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "通知" };

export default async function NotificationSettingsPage() {
  const [supabase, entitlement] = await Promise.all([createClient(), getEntitlement()]);

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: settings } = await supabase
    .from("notification_settings")
    .select("*")
    .eq("user_id", user!.id)
    .maybeSingle();

  const maxTimings = limitOf(entitlement, "notificationTimings");

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
        <h1 className="text-2xl font-bold tracking-tight">通知</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          課題の締切が近づいたときの知らせ方を設定します。
        </p>
      </header>

      <NotificationPermissionRequest />
      <InstallPrompt />

      <NotificationSettingsForm
        remindersEnabled={settings?.assignment_reminders ?? true}
        selectedOffsets={settings?.reminder_offsets_min ?? [0]}
        quietEnabled={settings?.quiet_hours_enabled ?? false}
        quietStart={formatTime(settings?.quiet_hours_start ?? "22:00")}
        quietEnd={formatTime(settings?.quiet_hours_end ?? "07:00")}
        maxTimings={maxTimings}
      />

      {!isPro(entitlement) ? (
        <p
          role="status"
          className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300"
        >
          <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span>
            {UPSELL_MESSAGES.notificationTimings}{" "}
            <Link href="/pro" className="font-medium underline underline-offset-4">
              Proを見る
            </Link>
          </span>
        </p>
      ) : null}

      <section className="space-y-2 border-t pt-6">
        <h2 className="text-sm font-semibold text-muted-foreground">通知の届き方について</h2>
        <p className="text-xs leading-relaxed text-muted-foreground">
          アプリを開いたときは、締切が近い課題をアプリ内でお知らせします。
          アプリを閉じているあいだのプッシュ通知はまだ配信していません。
        </p>
      </section>
    </div>
  );
}
