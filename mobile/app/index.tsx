import { useCallback, useEffect, useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { upcomingAssignments } from "@core/assignments";
import { formatToday, greetingFor, formatDuration } from "@core/date";
import { describeDueDate, startOfThisWeek, startOfToday } from "@core/deadline";
import { inRange, totalSeconds } from "@core/study-stats";
import {
  findCurrentOrNextClass,
  formatTimeRange,
  formatTimeUntil,
  weekdayLabel,
  type SessionWithSubject,
} from "@core/timetable";
import { supabase } from "@/lib/supabase";
import { spacing, theme } from "@/lib/theme";
import type { Assignment, StudySession, Subject } from "@core/database";

type AssignmentRow = Assignment & { subject: Pick<Subject, "id" | "name" | "color"> | null };

interface HomeData {
  displayName: string;
  timezone: string;
  sessions: SessionWithSubject[];
  assignments: AssignmentRow[];
  study: StudySession[];
}

/** Web 版の (app)/home に相当する画面 */
export default function HomeScreen() {
  const insets = useSafeAreaInsets();
  const [data, setData] = useState<HomeData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  const load = useCallback(async () => {
    setError(null);

    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const [profile, sessions, assignments, study] = await Promise.all([
      supabase.from("profiles").select("display_name, timezone").eq("id", user.id).maybeSingle(),
      supabase
        .from("class_sessions")
        .select("*, subject:subjects(id, name, color)")
        .eq("user_id", user.id),
      supabase
        .from("assignments")
        .select("*, subject:subjects(id, name, color)")
        .eq("user_id", user.id)
        .order("due_at"),
      supabase
        .from("study_sessions")
        .select("*")
        .eq("user_id", user.id)
        .not("ended_at", "is", null),
    ]);

    if (profile.error || sessions.error || assignments.error || study.error) {
      setError("データを読み込めませんでした");
      return;
    }

    setData({
      displayName: profile.data?.display_name ?? "ゲスト",
      timezone: profile.data?.timezone ?? "Asia/Tokyo",
      sessions: (sessions.data ?? []) as unknown as SessionWithSubject[],
      assignments: (assignments.data ?? []) as unknown as AssignmentRow[],
      study: (study.data ?? []) as StudySession[],
    });
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  if (error) {
    return (
      <Centered>
        <Text style={{ color: theme.danger }}>{error}</Text>
      </Centered>
    );
  }

  if (!data) {
    return (
      <Centered>
        <ActivityIndicator />
      </Centered>
    );
  }

  const now = new Date();
  const { timezone } = data;

  const upcoming = findCurrentOrNextClass(data.sessions, now, timezone);
  const dueSoon = upcomingAssignments(data.assignments, 3);
  const todayTotal = totalSeconds(inRange(data.study, startOfToday(now, timezone), now));
  const weekTotal = totalSeconds(inRange(data.study, startOfThisWeek(now, timezone), now));

  return (
    <ScrollView
      contentContainerStyle={{
        padding: spacing.lg,
        paddingTop: insets.top + spacing.lg,
        paddingBottom: insets.bottom + spacing.xxl,
        gap: spacing.lg,
      }}
      refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
    >
      <View>
        <Text style={{ fontSize: 14, color: theme.muted }}>{formatToday(now, timezone)}</Text>
        <Text style={{ marginTop: 4, fontSize: 24, fontWeight: "700", color: theme.text }}>
          {greetingFor(now, timezone)}、{data.displayName}さん
        </Text>
      </View>

      {/* 次の授業 */}
      <Card>
        <Text style={styles.cardLabel}>{upcoming?.inProgress ? "今の授業" : "次の授業"}</Text>
        {upcoming ? (
          <>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm, marginTop: 6 }}>
              <View
                style={{
                  width: 10,
                  height: 10,
                  borderRadius: 5,
                  backgroundColor: upcoming.session.subject?.color ?? "#94a3b8",
                }}
              />
              <Text style={{ fontSize: 18, fontWeight: "700", color: theme.text, flex: 1 }}>
                {upcoming.session.subject?.name ?? "科目なし"}
              </Text>
              <Text style={{ fontSize: 13, color: theme.muted }}>
                {upcoming.inProgress ? "進行中" : formatTimeUntil(upcoming.minutesUntilStart)}
              </Text>
            </View>
            <Text style={{ marginTop: 4, fontSize: 14, color: theme.muted }}>
              {weekdayLabel(upcoming.session.weekday)} {upcoming.session.period}限{"  "}
              {formatTimeRange(upcoming.session.start_time, upcoming.session.end_time)}
              {upcoming.session.room ? `  ${upcoming.session.room}` : ""}
            </Text>
          </>
        ) : (
          <Text style={styles.empty}>時間割を登録すると、次の授業がここに出ます。</Text>
        )}
      </Card>

      {/* 締切が近い課題 */}
      <Card>
        <Text style={styles.cardLabel}>締切が近い課題</Text>
        {dueSoon.length === 0 ? (
          <Text style={styles.empty}>未完了の課題はありません。</Text>
        ) : (
          <View style={{ marginTop: 4 }}>
            {dueSoon.map((a) => {
              const due = describeDueDate(new Date(a.due_at), now, timezone, a.due_all_day);
              return (
                <View
                  key={a.id}
                  style={{
                    flexDirection: "row",
                    alignItems: "center",
                    gap: spacing.sm,
                    paddingVertical: spacing.sm,
                    borderTopWidth: 1,
                    borderTopColor: theme.border,
                  }}
                >
                  <View style={{ flex: 1 }}>
                    <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text }}>
                      {a.title}
                    </Text>
                    {a.subject ? (
                      <Text style={{ marginTop: 2, fontSize: 12, color: theme.muted }}>
                        {a.subject.name}
                      </Text>
                    ) : null}
                  </View>
                  <View
                    style={{
                      paddingHorizontal: 8,
                      paddingVertical: 3,
                      borderRadius: 999,
                      backgroundColor: due.emphasize ? theme.warnBg : "#f5f5f5",
                    }}
                  >
                    <Text
                      style={{
                        fontSize: 12,
                        fontWeight: "600",
                        color: due.tone === "overdue" ? theme.danger : due.emphasize ? theme.warn : theme.muted,
                      }}
                    >
                      {due.label}
                      {due.timeText ? ` ${due.timeText}` : ""}
                    </Text>
                  </View>
                </View>
              );
            })}
          </View>
        )}
      </Card>

      {/* 勉強時間 */}
      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Card style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>今日の勉強時間</Text>
          <Text style={styles.stat}>{formatDuration(todayTotal)}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <Text style={styles.cardLabel}>今週の合計</Text>
          <Text style={styles.stat}>{formatDuration(weekTotal)}</Text>
        </Card>
      </View>

      <Pressable
        onPress={() => supabase.auth.signOut()}
        style={{ paddingVertical: spacing.md, alignItems: "center" }}
      >
        <Text style={{ color: theme.muted, fontSize: 14 }}>ログアウト</Text>
      </Pressable>
    </ScrollView>
  );
}

function Card({ children, style }: { children: React.ReactNode; style?: object }) {
  return (
    <View
      style={[
        {
          backgroundColor: theme.card,
          borderRadius: 14,
          borderWidth: 1,
          borderColor: theme.border,
          padding: spacing.lg,
        },
        style,
      ]}
    >
      {children}
    </View>
  );
}

function Centered({ children }: { children: React.ReactNode }) {
  return (
    <View style={{ flex: 1, alignItems: "center", justifyContent: "center" }}>{children}</View>
  );
}

const styles = {
  cardLabel: { fontSize: 13, fontWeight: "600" as const, color: theme.muted },
  empty: { marginTop: 8, fontSize: 14, color: theme.muted },
  stat: { marginTop: 6, fontSize: 20, fontWeight: "700" as const, color: theme.text },
};
