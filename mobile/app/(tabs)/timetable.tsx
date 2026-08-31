import Ionicons from "@expo/vector-icons/Ionicons";
import { useState, useCallback } from "react";
import { Pressable, Text, View } from "react-native";

import {
  Card,
  ColorDot,
  EmptyState,
  ErrorView,
  Loading,
  PageHeader,
  Screen,
} from "@/components/ui";
import { listClassSessions, listSubjects, getProfile, type Profile } from "@/lib/queries";
import { spacing, theme } from "@/lib/theme";
import { useQuery } from "@/lib/use-query";
import {
  WEEKDAYS,
  formatTimeRange,
  groupByWeekday,
  zonedWeekdayAndMinutes,
  type SessionWithSubject,
} from "@core/timetable";
import type { Subject } from "@core/database";

interface TimetableData {
  profile: Profile;
  sessions: SessionWithSubject[];
  subjects: Subject[];
}

/** Web 版の (app)/timetable に相当する画面（§4.3） */
export default function TimetableScreen() {
  const fetcher = useCallback(async (): Promise<TimetableData> => {
    const [profile, sessions, subjects] = await Promise.all([
      getProfile(),
      listClassSessions(),
      listSubjects(),
    ]);
    return { profile, sessions, subjects };
  }, []);

  const { data, error, refreshing, onRefresh, reload } = useQuery(fetcher);
  // 未選択のうちは今日を見せる。選ぶまで null にしておき、読み込み後の今日に追従させる。
  const [picked, setPicked] = useState<number | null>(null);

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const today = zonedWeekdayAndMinutes(new Date(), data.profile.timezone).weekday;
  const selected = picked ?? today;

  const grouped = groupByWeekday(data.sessions);
  const daySessions = grouped.get(selected) ?? [];
  const selectedLabel = WEEKDAYS.find((day) => day.value === selected)?.longLabel ?? "";

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        title="時間割"
        subtitle={`全${data.sessions.length}コマ／科目${data.subjects.length}件`}
      />

      <View style={{ flexDirection: "row", gap: 6 }}>
        {WEEKDAYS.map((day) => (
          <WeekdayTab
            key={day.value}
            label={day.label}
            count={grouped.get(day.value)?.length ?? 0}
            selected={day.value === selected}
            isToday={day.value === today}
            onPress={() => setPicked(day.value)}
          />
        ))}
      </View>

      {data.subjects.length === 0 ? (
        <EmptyState message="まず科目を登録すると、時間割に授業を追加できます。" />
      ) : daySessions.length === 0 ? (
        <EmptyState message={`${selectedLabel}の授業はまだありません。`} />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {daySessions.map((session) => (
            <ClassSessionRow key={session.id} session={session} />
          ))}
        </View>
      )}
    </Screen>
  );
}

function WeekdayTab({
  label,
  count,
  selected,
  isToday,
  onPress,
}: {
  label: string;
  count: number;
  selected: boolean;
  isToday: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="tab"
      accessibilityState={{ selected }}
      accessibilityLabel={`${label}曜日 ${count}コマ`}
      style={({ pressed }) => ({
        flex: 1,
        paddingVertical: spacing.sm,
        borderRadius: 10,
        alignItems: "center",
        gap: 2,
        backgroundColor: selected ? theme.primary : pressed ? "#f5f5f5" : "transparent",
        borderWidth: 1,
        borderColor: selected ? theme.primary : theme.border,
      })}
    >
      <Text
        style={{
          fontSize: 14,
          fontWeight: "700",
          color: selected ? theme.primaryText : theme.text,
        }}
      >
        {label}
      </Text>
      {/* today は選択中でも分かるよう、点で示す */}
      <View style={{ height: 6, justifyContent: "center" }}>
        {isToday ? (
          <View
            style={{
              width: 4,
              height: 4,
              borderRadius: 2,
              backgroundColor: selected ? theme.primaryText : theme.accent,
            }}
          />
        ) : null}
      </View>
      <Text
        style={{
          fontSize: 11,
          color: selected ? theme.primaryText : theme.muted,
        }}
      >
        {count}
      </Text>
    </Pressable>
  );
}

function ClassSessionRow({ session }: { session: SessionWithSubject }) {
  return (
    <Card style={{ padding: 0, overflow: "hidden" }}>
      <View style={{ flexDirection: "row", alignItems: "stretch" }}>
        <View
          style={{ width: 6, backgroundColor: session.subject?.color ?? "#94a3b8" }}
        />
        <View
          style={{
            flex: 1,
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.md,
            padding: spacing.md,
          }}
        >
          <Text
            style={{ width: 40, textAlign: "center", fontSize: 14, fontWeight: "700", color: theme.text }}
          >
            {session.period}限
          </Text>
          <View style={{ flex: 1, minWidth: 0 }}>
            <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text }} numberOfLines={1}>
              {session.subject?.name ?? "科目なし"}
            </Text>
            <View
              style={{
                marginTop: 2,
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
              }}
            >
              <Text style={{ fontSize: 12, color: theme.muted }}>
                {formatTimeRange(session.start_time, session.end_time)}
              </Text>
              {session.room ? (
                <View style={{ flexDirection: "row", alignItems: "center", gap: 2 }}>
                  <Ionicons name="location-outline" size={12} color={theme.muted} />
                  <Text style={{ fontSize: 12, color: theme.muted }}>{session.room}</Text>
                </View>
              ) : null}
            </View>
          </View>
          <ColorDot color={session.subject?.color ?? null} size={8} />
        </View>
      </View>
    </Card>
  );
}
