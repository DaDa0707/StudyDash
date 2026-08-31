import { useCallback, useState } from "react";
import { ScrollView, Text, View } from "react-native";

import {
  Badge,
  Card,
  Chip,
  ColorDot,
  EmptyState,
  ErrorView,
  Loading,
  PageHeader,
  Screen,
  SegmentTab,
} from "@/components/ui";
import {
  getEntitlement,
  getProfile,
  listAssignments,
  listSubjects,
  type AssignmentWithSubject,
  type Profile,
} from "@/lib/queries";
import { spacing, theme } from "@/lib/theme";
import { useQuery } from "@/lib/use-query";
import { isOpen, priorityLabel, sortByDueDate } from "@core/assignments";
import { describeDueDate } from "@core/deadline";
import { UPSELL_MESSAGES, checkQuota, type Entitlement } from "@core/entitlements";
import type { Subject } from "@core/database";

interface AssignmentsData {
  profile: Profile;
  assignments: AssignmentWithSubject[];
  subjects: Subject[];
  entitlement: Entitlement;
}

/** Web 版の (app)/assignments に相当する画面（S-05） */
export default function AssignmentsScreen() {
  const fetcher = useCallback(async (): Promise<AssignmentsData> => {
    const [profile, assignments, subjects, entitlement] = await Promise.all([
      getProfile(),
      listAssignments(),
      listSubjects(),
      getEntitlement(),
    ]);
    return { profile, assignments, subjects, entitlement };
  }, []);

  const { data, error, refreshing, onRefresh, reload } = useQuery(fetcher);
  const [showDone, setShowDone] = useState(false);
  const [subjectFilter, setSubjectFilter] = useState<string>("");

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  const now = new Date();
  const { timezone } = data.profile;

  const openCount = data.assignments.filter((item) => isOpen(item.status)).length;
  const quota = checkQuota(data.entitlement, "openAssignments", openCount);

  const visible = sortByDueDate(
    data.assignments.filter((item) => {
      if (showDone === isOpen(item.status)) return false;
      if (subjectFilter && item.subject_id !== subjectFilter) return false;
      return true;
    }),
  );

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader
        title="課題"
        subtitle={`未完了 ${openCount}件${quota.limit === null ? "" : ` / ${quota.limit}件まで`}`}
      />

      {quota.shouldUpsell ? (
        <Card style={{ backgroundColor: theme.warnBg, borderColor: theme.warnBg }}>
          <Text style={{ fontSize: 14, color: theme.warn }}>
            {UPSELL_MESSAGES.openAssignments}
          </Text>
        </Card>
      ) : null}

      <View style={{ flexDirection: "row", gap: 6 }}>
        <SegmentTab label="未完了" active={!showDone} onPress={() => setShowDone(false)} />
        <SegmentTab label="完了済み" active={showDone} onPress={() => setShowDone(true)} />
      </View>

      {data.subjects.length > 0 ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{ gap: 6, paddingRight: spacing.lg }}
        >
          <Chip
            label="すべて"
            active={subjectFilter === ""}
            onPress={() => setSubjectFilter("")}
          />
          {data.subjects.map((subject) => (
            <Chip
              key={subject.id}
              label={subject.name}
              color={subject.color}
              active={subjectFilter === subject.id}
              onPress={() => setSubjectFilter(subject.id)}
            />
          ))}
        </ScrollView>
      ) : null}

      {visible.length === 0 ? (
        <EmptyState
          message={showDone ? "完了した課題はまだありません。" : "未完了の課題はありません。"}
        />
      ) : (
        <View style={{ gap: spacing.sm }}>
          {visible.map((assignment) => (
            <AssignmentRow
              key={assignment.id}
              assignment={assignment}
              now={now}
              timezone={timezone}
            />
          ))}
        </View>
      )}
    </Screen>
  );
}

function AssignmentRow({
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
  const priority = priorityLabel(assignment.priority);
  const done = !isOpen(assignment.status);

  return (
    <Card style={{ padding: spacing.md }}>
      <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.md }}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text
            style={{
              fontSize: 15,
              fontWeight: "600",
              color: done ? theme.muted : theme.text,
              textDecorationLine: done ? "line-through" : "none",
            }}
            numberOfLines={2}
          >
            {assignment.title}
          </Text>
          <View
            style={{
              marginTop: 4,
              flexDirection: "row",
              alignItems: "center",
              gap: spacing.sm,
            }}
          >
            {assignment.subject ? (
              <View style={{ flexDirection: "row", alignItems: "center", gap: 4 }}>
                <ColorDot color={assignment.subject.color} size={8} />
                <Text style={{ fontSize: 12, color: theme.muted }}>
                  {assignment.subject.name}
                </Text>
              </View>
            ) : null}
            {/* 強い警告色は期限切れと高優先度だけに使う（§11） */}
            {priority && assignment.priority === "high" ? (
              <Badge label={`優先度${priority}`} tone="danger" />
            ) : priority ? (
              <Badge label={`優先度${priority}`} tone="muted" />
            ) : null}
          </View>
        </View>
        <Badge
          label={due.label + (due.timeText ? ` ${due.timeText}` : "")}
          tone={done ? "muted" : due.tone === "overdue" ? "danger" : due.emphasize ? "warn" : "muted"}
        />
      </View>
    </Card>
  );
}
