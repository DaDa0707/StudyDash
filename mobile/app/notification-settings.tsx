import { Stack } from "expo-router";
import { useCallback, useState } from "react";
import { Pressable, Text, View } from "react-native";

import { FormMessage, SwitchRow, TimeField } from "@/components/form";
import { Card, ErrorView, Loading, PrimaryButton, Screen, SectionLabel } from "@/components/ui";
import { updateNotificationSettings } from "@/lib/mutations";
import { getEntitlement, getNotificationSettings } from "@/lib/queries";
import { spacing, theme } from "@/lib/theme";
import { useQuery } from "@/lib/use-query";
import { UPSELL_MESSAGES, isPro, limitOf, type Entitlement } from "@core/entitlements";
import { REMINDER_OPTIONS, clampReminderOffsets } from "@core/notifications";
import { formatTime } from "@core/timetable";
import type { NotificationSettings } from "@core/database";

interface Loaded {
  settings: NotificationSettings | null;
  entitlement: Entitlement;
}

/** Web 版の (app)/settings/notifications に相当する画面 */
export default function NotificationSettingsScreen() {
  const fetcher = useCallback(async (): Promise<Loaded> => {
    const [settings, entitlement] = await Promise.all([
      getNotificationSettings(),
      getEntitlement(),
    ]);
    return { settings, entitlement };
  }, []);

  const { data, error, reload } = useQuery(fetcher);

  return (
    <>
      <Stack.Screen options={{ title: "通知", headerShown: true, headerBackTitle: "戻る" }} />
      {error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : (
        <Body data={data} />
      )}
    </>
  );
}

function Body({ data }: { data: Loaded }) {
  const s = data.settings;
  const maxTimings = limitOf(data.entitlement, "notificationTimings");

  const [reminders, setReminders] = useState(s?.assignment_reminders ?? true);
  const [offsets, setOffsets] = useState<number[]>(
    clampReminderOffsets(s?.reminder_offsets_min ?? [0], maxTimings),
  );
  const [quietEnabled, setQuietEnabled] = useState(s?.quiet_hours_enabled ?? false);
  // DB は time 型で "22:00:00" が返る。入力欄は "HH:MM" なので必ず通す。
  const [quietStart, setQuietStart] = useState(formatTime(s?.quiet_hours_start ?? "22:00"));
  const [quietEnd, setQuietEnd] = useState(formatTime(s?.quiet_hours_end ?? "07:00"));

  const [message, setMessage] = useState<string | undefined>();
  const [saved, setSaved] = useState(false);
  const [busy, setBusy] = useState(false);

  /**
   * 上限が1のときは無効化せず、押したものに入れ替える。
   * 「選べない」より「選び直せる」ほうが分かりやすいため（Web 版と同じ）。
   */
  const toggleOffset = (minutes: number) => {
    setSaved(false);
    setOffsets((prev) => {
      if (prev.includes(minutes)) return prev.filter((m) => m !== minutes);
      if (maxTimings === 1) return [minutes];
      if (maxTimings !== null && prev.length >= maxTimings) return prev;
      return [...prev, minutes].sort((a, b) => a - b);
    });
  };

  const onSave = async () => {
    setMessage(undefined);
    setSaved(false);
    setBusy(true);
    try {
      await updateNotificationSettings({
        assignmentReminders: reminders,
        // 保存の直前にも上限で切る。画面の見た目だけに頼らない。
        reminderOffsetsMin: clampReminderOffsets(offsets, maxTimings),
        quietHoursEnabled: quietEnabled,
        quietHoursStart: quietStart,
        quietHoursEnd: quietEnd,
      });
      setSaved(true);
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "保存できませんでした");
    }
    setBusy(false);
  };

  return (
    <Screen topInset={false}>
      <FormMessage message={message} />
      {saved ? (
        <Text style={{ fontSize: 14, color: "#047857" }} accessibilityLiveRegion="polite">
          保存しました
        </Text>
      ) : null}

      <Text style={{ fontSize: 14, color: theme.muted }}>
        課題の締切が近づいたときの知らせ方を設定します。
      </Text>

      <Card>
        <SwitchRow
          label="締切リマインドを受け取る"
          hint="課題の締切が近づいたら知らせます。"
          value={reminders}
          onChange={(v) => {
            setReminders(v);
            setSaved(false);
          }}
        />
      </Card>

      <View style={{ gap: spacing.sm }}>
        <SectionLabel>知らせるタイミング</SectionLabel>
        <Text style={{ fontSize: 12, color: theme.muted }}>
          {maxTimings === null ? "いくつでも選べます。" : `${maxTimings}つまで選べます。`}
        </Text>

        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 6 }}>
          {REMINDER_OPTIONS.map((option) => {
            const active = offsets.includes(option.minutes);
            // 上限が2以上で埋まっているときだけ、未選択を押せなくする
            const blocked =
              !active && maxTimings !== null && maxTimings > 1 && offsets.length >= maxTimings;

            return (
              <Pressable
                key={option.minutes}
                onPress={() => toggleOffset(option.minutes)}
                disabled={blocked}
                accessibilityRole="checkbox"
                accessibilityState={{ checked: active, disabled: blocked }}
                style={({ pressed }) => ({
                  minHeight: 40,
                  justifyContent: "center",
                  paddingHorizontal: spacing.md,
                  borderRadius: 999,
                  borderWidth: 1,
                  borderColor: active ? theme.primary : theme.border,
                  backgroundColor: active ? theme.primary : pressed ? "#f5f5f5" : theme.card,
                  opacity: blocked ? 0.4 : 1,
                })}
              >
                <Text
                  style={{
                    fontSize: 14,
                    fontWeight: "600",
                    color: active ? theme.primaryText : theme.text,
                  }}
                >
                  {option.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      </View>

      <Card style={{ gap: spacing.md }}>
        <SwitchRow
          label="通知を控える時間帯"
          hint="この時間帯はアプリ内の通知も出しません。"
          value={quietEnabled}
          onChange={(v) => {
            setQuietEnabled(v);
            setSaved(false);
          }}
        />
        {quietEnabled ? (
          <View style={{ flexDirection: "row", gap: spacing.lg }}>
            <View style={{ flex: 1 }}>
              <TimeField
                label="開始"
                value={quietStart}
                onChange={(v) => {
                  setQuietStart(v);
                  setSaved(false);
                }}
              />
            </View>
            <View style={{ flex: 1 }}>
              <TimeField
                label="終了"
                value={quietEnd}
                onChange={(v) => {
                  setQuietEnd(v);
                  setSaved(false);
                }}
              />
            </View>
          </View>
        ) : null}
      </Card>

      {!isPro(data.entitlement) ? (
        <Card style={{ backgroundColor: theme.warnBg, borderColor: theme.warnBg }}>
          <Text style={{ fontSize: 14, color: theme.warn }}>
            {UPSELL_MESSAGES.notificationTimings}
          </Text>
        </Card>
      ) : null}

      <PrimaryButton label="保存" busy={busy} onPress={onSave} />

      <Card>
        <SectionLabel>通知の届き方について</SectionLabel>
        <Text style={{ marginTop: 8, fontSize: 13, color: theme.muted, lineHeight: 19 }}>
          アプリを開いたときは、締切が近い課題をアプリ内でお知らせします。
          アプリを閉じているあいだのプッシュ通知はまだ配信していません。
        </Text>
      </Card>
    </Screen>
  );
}
