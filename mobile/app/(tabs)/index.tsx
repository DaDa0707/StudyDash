import { useCallback } from "react";
import { Text, View } from "react-native";

import {
  Badge,
  Card,
  ColorDot,
  ErrorView,
  Loading,
  PageHeader,
  Screen,
  SectionLabel,
} from "@/components/ui";
import {
  getProfile,
  listAssignments,
  listClassSessions,
  listFinishedStudySessions,
  type AssignmentWithSubject,
  type Profile,
} from "@/lib/queries";
import { spacing, theme } from "@/lib/theme";
import { useQuery } from "@/lib/use-query";
import { upcomingAssignments } from "@core/assignments";
import { formatDuration, formatToday, greetingFor } from "@core/date";
import { describeDueDate, startOfThisWeek, startOfToday } from "@core/deadline";
import { inRange, totalSeconds } from "@core/study-stats";
import {
  findCurrentOrNextClass,
  formatTimeRange,
  formatTimeUntil,
  weekdayLabel,
  type SessionWithSubject,
} from "@core/timetable";
import type { StudySession } from "@core/database";

interface HomeData {
  profile: Profile;
  sessions: SessionWithSubject[];
  assignments: AssignmentWithSubject[];
  study: StudySession[];
}

/** Web 版の (app)/home に相当する画面（§4.2） */
export default function HomeScreen() {
  const fetcher = useCallback(async (): Promise<HomeData> => {
    const [profile, sessions, assignments, study] = await Promise.all([
      getProfile(),
      listClassSessions(),
      listAssignments(),
      listFinishedStudySessions(),
    ]);
    return { profile, sessions, assignments, study };
  }, []);

  const { data, error, refreshing, onRefresh, reload } = useQuery(fetcher);

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const now = new Date();
  const { timezone } = data.profile;

  const upcoming = findCurrentOrNextClass(data.sessions, now, timezone);
  const dueSoon = upcomingAssignments(data.assignments);
  const todayTotal = totalSeconds(inRange(data.study, startOfToday(now, timezone), now));
  const weekTotal = totalSeconds(inRange(data.study, startOfThisWeek(now, timezone), now));

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <View>
        <Text style={{ fontSize: 14, color: theme.muted }}>{formatToday(now, timezone)}</Text>
        <PageHeader title={`${greetingFor(now, timezone)}、${data.profile.displayName}さん`} />
      </View>

      <Card>
        <SectionLabel>{upcoming?.inProgress ? "今の授業" : "次の授業"}</SectionLabel>
        {upcoming ? (
          <>
            <View
              style={{
                flexDirection: "row",
                alignItems: "center",
                gap: spacing.sm,
                marginTop: 6,
              }}
            >
              <ColorDot color={upcoming.session.subject?.color ?? null} />
              <Text
                style={{ fontSize: 18, fontWeight: "700", color: theme.text, flex: 1 }}
                numberOfLines={1}
              >
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
          <Text style={{ marginTop: 8, fontSize: 14, color: theme.muted }}>
            時間割を登録すると、次の授業がここに出ます。
          </Text>
        )}
      </Card>

      <Card>
        <SectionLabel>締切が近い課題</SectionLabel>
        {dueSoon.length === 0 ? (
          <Text style={{ marginTop: 8, fontSize: 14, color: theme.muted }}>
            未完了の課題はありません。
          </Text>
        ) : (
          <View style={{ marginTop: 4 }}>
            {dueSoon.map((assignment) => (
              <DueRow key={assignment.id} assignment={assignment} now={now} timezone={timezone} />
            ))}
          </View>
        )}
      </Card>

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <Card style={{ flex: 1 }}>
          <SectionLabel>今日の勉強時間</SectionLabel>
          <Text style={stat}>{formatDuration(todayTotal)}</Text>
        </Card>
        <Card style={{ flex: 1 }}>
          <SectionLabel>今週の合計</SectionLabel>
          <Text style={stat}>{formatDuration(weekTotal)}</Text>
        </Card>
      </View>
    </Screen>
  );
}

function DueRow({
  assignment,
  now,
  timezone,
}: {
  assignment: AssignmentWithSubject;
  now: Date;
  timezone: string;
}) {
  const due = describeDueDate(
    new Date(assignment.due_at),
    now,
    timezone,
    assignment.due_all_day,
  );

  return (
    <View
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
        <Text
          style={{ fontSize: 15, fontWeight: "600", color: theme.text }}
          numberOfLines={1}
        >
          {assignment.title}
        </Text>
        {assignment.subject ? (
          <Text style={{ marginTop: 2, fontSize: 12, color: theme.muted }}>
            {assignment.subject.name}
          </Text>
        ) : null}
      </View>
      <Badge
        label={due.label + (due.timeText ? ` ${due.timeText}` : "")}
        tone={due.tone === "overdue" ? "danger" : due.emphasize ? "warn" : "muted"}
      />
    </View>
  );
}

const stat = { marginTop: 6, fontSize: 20, fontWeight: "700" as const, color: theme.text };
