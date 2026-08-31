import Ionicons from "@expo/vector-icons/Ionicons";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert, ScrollView, Text, View } from "react-native";

import {
  Card,
  Chip,
  ColorDot,
  ErrorView,
  Loading,
  OutlineButton,
  PageHeader,
  PrimaryButton,
  Screen,
} from "@/components/ui";
import {
  discardTimer,
  finishTimer,
  getServerNow,
  pauseTimer,
  resumeTimer,
  startTimer,
} from "@/lib/mutations";
import { getRunningSession, listSubjects, type RunningSession } from "@/lib/queries";
import { spacing, theme } from "@/lib/theme";
import { useQuery } from "@/lib/use-query";
import { elapsedSeconds, formatTimerDisplay, subjectLabel } from "@core/timer";
import type { Subject } from "@core/database";

interface TimerData {
  running: RunningSession | null;
  subjects: Subject[];
  /** 端末の時計とサーバーのずれ（ミリ秒）。表示の補正にだけ使う */
  skewMs: number;
}

/** Web 版の (app)/timer に相当する画面（§5.3 / A-05） */
export default function TimerScreen() {
  const fetcher = useCallback(async (): Promise<TimerData> => {
    const [running, subjects, serverNow] = await Promise.all([
      getRunningSession(),
      listSubjects(),
      getServerNow(),
    ]);
    return { running, subjects, skewMs: Date.now() - serverNow.getTime() };
  }, []);

  const { data, error, refreshing, onRefresh, reload } = useQuery(fetcher);
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const run = useCallback(
    async (action: () => Promise<unknown>) => {
      setBusy(true);
      try {
        await action();
        await reload();
      } catch (cause) {
        Alert.alert("", cause instanceof Error ? cause.message : "操作できませんでした");
      }
      setBusy(false);
    },
    [reload],
  );

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <Screen refreshing={refreshing} onRefresh={onRefresh}>
      <PageHeader title="タイマー" />

      {data.running ? (
        <ActiveTimer
          running={data.running}
          skewMs={data.skewMs}
          busy={busy}
          onPause={() => run(pauseTimer)}
          onResume={() => run(resumeTimer)}
          onFinish={() =>
            run(async () => {
              const done = await finishTimer();
              Alert.alert("", `${formatTimerDisplay(done.duration_sec ?? 0)} を記録しました`);
            })
          }
          onDiscard={() =>
            Alert.alert("記録せずに破棄しますか？", "この計測は保存されません。", [
              { text: "やめる", style: "cancel" },
              {
                text: "破棄",
                style: "destructive",
                onPress: () => run(() => discardTimer(data.running!.id)),
              },
            ])
          }
        />
      ) : (
        <IdleTimer
          subjects={data.subjects}
          subjectId={subjectId}
          onPickSubject={setSubjectId}
          busy={busy}
          onStart={() => run(() => startTimer(subjectId))}
        />
      )}
    </Screen>
  );
}

function TimerDisplay({ seconds, caption }: { seconds: number; caption: string }) {
  return (
    <Card style={{ alignItems: "center", paddingVertical: spacing.xxl }}>
      <Text
        accessibilityRole="text"
        accessibilityLabel={`経過時間 ${formatTimerDisplay(seconds)}`}
        style={{
          fontSize: 48,
          fontWeight: "700",
          color: theme.text,
          fontVariant: ["tabular-nums"],
        }}
      >
        {formatTimerDisplay(seconds)}
      </Text>
      <Text style={{ marginTop: spacing.sm, fontSize: 14, color: theme.muted }}>{caption}</Text>
    </Card>
  );
}

function IdleTimer({
  subjects,
  subjectId,
  onPickSubject,
  busy,
  onStart,
}: {
  subjects: Subject[];
  subjectId: string | null;
  onPickSubject: (id: string | null) => void;
  busy: boolean;
  onStart: () => void;
}) {
  return (
    <>
      <TimerDisplay seconds={0} caption="科目を選んで開始します" />

      {/* §5.3「タイマー開始前に科目を選択。未選択なら『その他』」 */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={{ gap: 6, paddingRight: spacing.lg }}
      >
        <Chip label="その他" active={subjectId === null} onPress={() => onPickSubject(null)} />
        {subjects.map((subject) => (
          <Chip
            key={subject.id}
            label={subject.name}
            color={subject.color}
            active={subjectId === subject.id}
            onPress={() => onPickSubject(subject.id)}
          />
        ))}
      </ScrollView>

      <PrimaryButton
        label="開始"
        busy={busy}
        onPress={onStart}
        icon={<Ionicons name="play" size={18} color={theme.primaryText} />}
      />
    </>
  );
}

function ActiveTimer({
  running,
  skewMs,
  busy,
  onPause,
  onResume,
  onFinish,
  onDiscard,
}: {
  running: RunningSession;
  skewMs: number;
  busy: boolean;
  onPause: () => void;
  onResume: () => void;
  onFinish: () => void;
  onDiscard: () => void;
}) {
  const isRunning = running.segment_started_at !== null;

  // 表示だけを毎秒描き直す。確定値は DB 側が持つ。
  const [seconds, setSeconds] = useState(() =>
    elapsedSeconds(running, new Date(Date.now() - skewMs)),
  );

  // 効果の中で同期的に setState しないよう、最初の1回もタイマー経由で行う
  const latest = useRef({ running, skewMs });
  latest.current = { running, skewMs };

  useEffect(() => {
    const tick = () => {
      const { running: session, skewMs: skew } = latest.current;
      setSeconds(elapsedSeconds(session, new Date(Date.now() - skew)));
    };

    const immediate = setTimeout(tick, 0);
    if (!isRunning) return () => clearTimeout(immediate);

    const interval = setInterval(tick, 1000);
    return () => {
      clearTimeout(immediate);
      clearInterval(interval);
    };
  }, [isRunning, running.id, running.segment_started_at, running.accumulated_sec]);

  return (
    <>
      <TimerDisplay seconds={seconds} caption={isRunning ? "計測中" : "一時停止中"} />

      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          gap: 6,
        }}
      >
        {running.subject?.color ? <ColorDot color={running.subject.color} /> : null}
        <Text style={{ fontSize: 15, fontWeight: "600", color: theme.text }}>
          {subjectLabel(running.subject?.name)}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.md }}>
        <View style={{ flex: 1 }}>
          <OutlineButton
            label={isRunning ? "一時停止" : "再開"}
            busy={busy}
            onPress={isRunning ? onPause : onResume}
            icon={
              <Ionicons name={isRunning ? "pause" : "play"} size={18} color={theme.text} />
            }
          />
        </View>
        <View style={{ flex: 1 }}>
          <PrimaryButton
            label="終了して記録"
            busy={busy}
            onPress={onFinish}
            icon={<Ionicons name="stop" size={18} color={theme.primaryText} />}
          />
        </View>
      </View>

      <OutlineButton label="記録せずに破棄" busy={busy} onPress={onDiscard} />
    </>
  );
}
