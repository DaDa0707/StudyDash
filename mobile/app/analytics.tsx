import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Pressable, Text, View } from "react-native";

import {
  Card,
  ColorDot,
  EmptyState,
  ErrorView,
  Loading,
  Screen,
  SectionLabel,
} from "@/components/ui";
import { deleteStudySession } from "@/lib/mutations";
import {
  getEntitlement,
  getProfile,
  listAssignments,
  listStudyHistory,
  listSubjects,
  type Profile,
  type StudySessionWithSubject,
} from "@/lib/queries";
import { spacing, theme } from "@/lib/theme";
import { useQuery } from "@/lib/use-query";
import { formatDuration } from "@core/date";
import {
  formatDueDate,
  startOfThisWeek,
  startOfToday,
  zonedDateKey,
  zonedTimeKey,
} from "@core/deadline";
import { UPSELL_MESSAGES, can, limitOf, type Entitlement } from "@core/entitlements";
import { inRange, sumByDay, sumBySubject, totalSeconds } from "@core/study-stats";
import { subjectLabel } from "@core/timer";
import type { Subject } from "@core/database";

interface AnalyticsData {
  profile: Profile;
  entitlement: Entitlement;
  history: StudySessionWithSubject[];
  subjects: Subject[];
  completedThisWeek: number;
}

/** Web 版の (app)/analytics に相当する画面（F-07） */
export default function AnalyticsScreen() {
  const fetcher = useCallback(async (): Promise<AnalyticsData> => {
    const [profile, entitlement] = await Promise.all([getProfile(), getEntitlement()]);
    const now = new Date();

    const [history, subjects, assignments] = await Promise.all([
      listStudyHistory(entitlement, now, profile.timezone),
      listSubjects(),
      listAssignments(),
    ]);

    const weekStart = startOfThisWeek(now, profile.timezone).getTime();
    const completedThisWeek = assignments.filter(
      (a) => a.completed_at !== null && Date.parse(a.completed_at) >= weekStart,
    ).length;

    return { profile, entitlement, history, subjects, completedThisWeek };
  }, []);

  const { data, error, refreshing, onRefresh, reload } = useQuery(fetcher);

  return (
    <>
      <Stack.Screen options={{ title: "分析", headerShown: true, headerBackTitle: "戻る" }} />
      {error ? (
        <ErrorView message={error} onRetry={reload} />
      ) : !data ? (
        <Loading />
      ) : (
        <Body data={data} refreshing={refreshing} onRefresh={onRefresh} reload={reload} />
      )}
    </>
  );
}

function Body({
  data,
  refreshing,
  onRefresh,
  reload,
}: {
  data: AnalyticsData;
  refreshing: boolean;
  onRefresh: () => void;
  reload: () => Promise<void>;
}) {
  const [busy, setBusy] = useState(false);

  // 取り消せないので確認を挟む（アプリ内の他の削除と同じ流儀）
  const onDelete = (session: StudySessionWithSubject) =>
    Alert.alert("この記録を削除しますか？", undefined, [
      { text: "やめる", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await deleteStudySession(session.id);
            await reload();
          } catch (cause) {
            Alert.alert("", cause instanceof Error ? cause.message : "削除できませんでした");
          }
          setBusy(false);
        },
      },
    ]);

  const now = new Date();
  const { timezone } = data.profile;

  const todayTotal = totalSeconds(inRange(data.history, startOfToday(now, timezone), now));
  const weekTotal = totalSeconds(inRange(data.history, startOfThisWeek(now, timezone), now));

  const historyDays = limitOf(data.entitlement, "studyHistoryDays");
  const showSubjectBreakdown = can(data.entitlement, "advancedAnalytics");

  const bySubject = sumBySubject(data.history);
  const subjectMax = bySubject[0]?.seconds ?? 0;
  const subjectById = new Map(data.subjects.map((s) => [s.id, s]));

  const dailyTotals = new Map(
    sumByDay(data.history, timezone).map((d) => [d.date, d.seconds]),
  );
  const grouped = new Map<string, StudySessionWithSubject[]>();
  for (const session of data.history) {
    const key = zonedDateKey(new Date(session.started_at), timezone);
    grouped.set(key, [...(grouped.get(key) ?? []), session]);
  }
  const groups = [...grouped.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1));

  return (
    <Screen topInset={false} refreshing={refreshing} onRefresh={onRefresh}>
      <Text style={{ fontSize: 14, color: theme.muted }}>
        {historyDays === null ? "全期間の記録" : `直近${historyDays}日の記録`}
      </Text>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <Stat label="今日" value={formatDuration(todayTotal)} />
        <Stat label="今週" value={formatDuration(weekTotal)} />
        <Stat label="今週の完了" value={`${data.completedThisWeek}件`} />
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionLabel>科目別</SectionLabel>
        {!showSubjectBreakdown ? (
          <Card style={{ backgroundColor: theme.warnBg, borderColor: theme.warnBg }}>
            <Text style={{ fontSize: 14, color: theme.warn }}>
              {UPSELL_MESSAGES.advancedAnalytics}
            </Text>
          </Card>
        ) : bySubject.length === 0 ? (
          <EmptyState message="まだ記録がありません。" />
        ) : (
          <Card style={{ gap: spacing.md }}>
            {bySubject.map((row) => {
              const subject = row.subjectId ? subjectById.get(row.subjectId) : null;
              const ratio = subjectMax > 0 ? row.seconds / subjectMax : 0;
              return (
                <View key={row.subjectId ?? "__none"} style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
                    <ColorDot color={subject?.color ?? null} size={8} />
                    <Text style={{ flex: 1, fontSize: 14, color: theme.text }} numberOfLines={1}>
                      {subjectLabel(subject?.name)}
                    </Text>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: theme.text }}>
                      {formatDuration(row.seconds)}
                    </Text>
                  </View>
                  {/* 棒の長さは最大値との比。数字も併記するので色だけに頼らない */}
                  <View style={{ height: 6, borderRadius: 3, backgroundColor: "#f1f5f9" }}>
                    <View
                      style={{
                        width: `${Math.max(2, ratio * 100)}%`,
                        height: 6,
                        borderRadius: 3,
                        backgroundColor: subject?.color ?? "#94a3b8",
                      }}
                    />
                  </View>
                </View>
              );
            })}
          </Card>
        )}
      </View>

      <View style={{ gap: spacing.sm }}>
        <SectionLabel>学習履歴</SectionLabel>

        {groups.length === 0 ? (
          <EmptyState message="まだ記録がありません。タイマーで勉強時間を記録すると、ここに残ります。" />
        ) : (
          groups.map(([dateKey, sessions]) => (
            <Card key={dateKey} style={{ padding: spacing.md, gap: spacing.sm }}>
              <View style={{ flexDirection: "row", alignItems: "center" }}>
                <Text style={{ flex: 1, fontSize: 13, fontWeight: "700", color: theme.text }}>
                  {formatDueDate(new Date(sessions[0].started_at), timezone)}
                </Text>
                <Text style={{ fontSize: 13, color: theme.muted }}>
                  {formatDuration(dailyTotals.get(dateKey) ?? 0)}
                </Text>
              </View>

              {sessions.map((session) => (
                <View
                  key={session.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                    paddingTop: spacing.sm,
                  }}
                >
                  <ColorDot color={session.subject?.color ?? null} size={8} />
                  <Text style={{ flex: 1, fontSize: 14, color: theme.text }} numberOfLines={1}>
                    {subjectLabel(session.subject?.name)}
                  </Text>
                  <Text style={{ fontSize: 12, color: theme.muted }}>
                    {zonedTimeKey(new Date(session.started_at), timezone)}–
                    {session.ended_at ? zonedTimeKey(new Date(session.ended_at), timezone) : ""}
                  </Text>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: theme.text }}>
                    {formatDuration(session.duration_sec ?? 0)}
                  </Text>
                  <Pressable
                    onPress={() => onDelete(session)}
                    disabled={busy}
                    accessibilityRole="button"
                    accessibilityLabel="この記録を削除"
                    hitSlop={8}
                    style={{ width: 28, alignItems: "flex-end" }}
                  >
                    <Ionicons name="trash-outline" size={16} color={theme.muted} />
                  </Pressable>
                </View>
              ))}
            </Card>
          ))
        )}

        {historyDays !== null ? (
          <Text style={{ fontSize: 12, color: theme.muted }}>
            {UPSELL_MESSAGES.studyHistoryDays}
          </Text>
        ) : null}
      </View>
    </Screen>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Card style={{ flex: 1, padding: spacing.md }}>
      <Text style={{ fontSize: 12, color: theme.muted }}>{label}</Text>
      <Text style={{ marginTop: 4, fontSize: 16, fontWeight: "700", color: theme.text }}>
        {value}
      </Text>
    </Card>
  );
}
