import { redirect } from "next/navigation";

import { AnalyticsProvider } from "@/components/analytics/analytics-provider";
import { BottomNav } from "@/components/nav/bottom-nav";
import { SetupRequired } from "@/components/setup-required";
import { InAppNotice } from "@/components/notifications/in-app-notice";
import { zonedDateKey } from "@/lib/deadline";
import { isSupabaseConfigured } from "@/lib/env";
import { dueBuckets, shouldNotify } from "@/lib/notifications";
import { listAssignments } from "@/lib/queries/assignments";
import { createClient } from "@/lib/supabase/server";

/**
 * ログイン後の共通シェル。モバイル最優先で、下部ナビ分の余白を確保する（§11）。
 * 認証チェックは proxy でも行うが、データ取得の前提としてここでも確認する。
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  // 未設定のまま開くと環境変数の読み出しで落ちるため、先に案内を出す（開発時のみ）
  if (!isSupabaseConfigured) return <SetupRequired />;

  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at, timezone")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarded_at) redirect("/onboarding");

  const timezone = profile.timezone ?? "Asia/Tokyo";
  const now = new Date();

  // §3.1 F-08「対応不可環境ではアプリ内通知」
  const [settings, assignments] = await Promise.all([
    supabase
      .from("notification_settings")
      .select("assignment_reminders, reminder_offsets_min, quiet_hours_enabled, quiet_hours_start, quiet_hours_end")
      .eq("user_id", user.id)
      .maybeSingle(),
    listAssignments(),
  ]);

  const offsets = settings.data?.reminder_offsets_min ?? [];
  const buckets = dueBuckets(assignments, offsets, now);

  const notify = shouldNotify({
    remindersEnabled: settings.data?.assignment_reminders ?? true,
    counts: { overdue: buckets.overdue.length, upcoming: buckets.upcoming.length },
    now,
    timeZone: timezone,
    quiet: {
      enabled: settings.data?.quiet_hours_enabled ?? false,
      start: settings.data?.quiet_hours_start ?? "22:00",
      end: settings.data?.quiet_hours_end ?? "07:00",
    },
  });

  return (
    <AnalyticsProvider userId={user.id}>
      <div className="min-h-dvh">
        {/* 下部ナビ(56px) + セーフエリア分の余白 */}
        <div className="mx-auto w-full max-w-2xl px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5">
          {notify ? (
            <div className="mb-4">
              <InAppNotice
                overdueCount={buckets.overdue.length}
                upcomingCount={buckets.upcoming.length}
                dayKey={zonedDateKey(now, timezone)}
              />
            </div>
          ) : null}

          {children}
        </div>
        <BottomNav />
      </div>
    </AnalyticsProvider>
  );
}
