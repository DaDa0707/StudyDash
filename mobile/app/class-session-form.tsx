import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, Text, View } from "react-native";

import { FormMessage, PickerField, TextField, TimeField } from "@/components/form";
import {
  EmptyState,
  ErrorView,
  Loading,
  OutlineButton,
  PrimaryButton,
  Screen,
} from "@/components/ui";
import {
  createClassSession,
  deleteClassSession,
  updateClassSession,
  type ClassSessionValues,
} from "@/lib/mutations";
import { getClassSession, listClassSessions, listSubjects } from "@/lib/queries";
import { spacing, theme } from "@/lib/theme";
import { useQuery } from "@/lib/use-query";
import { toFieldErrors } from "@core/form";
import {
  DEFAULT_PERIOD_TIMES,
  PERIODS,
  WEEKDAYS,
  findSlotConflicts,
  formatTime,
  weekdayLabel,
  type SessionWithSubject,
} from "@core/timetable";
import { classSessionSchema } from "@core/validation/timetable";
import type { Subject } from "@core/database";

/**
 * 授業（時間割の1コマ）の追加・編集（Web 版の timetable/new と [id]/edit に相当）。
 *
 * §5.1 のとおり、同一曜日・同一時限の重複は警告するだけで保存は許可する。
 */

interface FormValues {
  subjectId: string;
  weekday: number;
  period: number;
  startTime: string;
  endTime: string;
  room: string;
  note: string;
}

interface Loaded {
  subjects: Subject[];
  sessions: SessionWithSubject[];
  values: FormValues;
  isNew: boolean;
}

export default function ClassSessionFormScreen() {
  const router = useRouter();
  const { id, day } = useLocalSearchParams<{ id?: string; day?: string }>();
  const isNew = !id;

  const fetcher = useCallback(async (): Promise<Loaded> => {
    const [subjects, sessions] = await Promise.all([listSubjects(), listClassSessions()]);
    const existing = id ? await getClassSession(id) : null;

    // URL の ?day= は 1〜7 の整数でなければ月曜に落とす（Web 版と同じ）
    const parsedDay = Number(day);
    const defaultWeekday =
      Number.isInteger(parsedDay) && parsedDay >= 1 && parsedDay <= 7 ? parsedDay : 1;

    return {
      subjects,
      sessions,
      isNew,
      values: existing
        ? {
            subjectId: existing.subject_id ?? "",
            weekday: existing.weekday,
            period: existing.period,
            // DB は "HH:MM:SS" で返す。入力欄は "HH:MM" なので必ず通す
            startTime: formatTime(existing.start_time),
            endTime: formatTime(existing.end_time),
            room: existing.room ?? "",
            note: existing.note ?? "",
          }
        : {
            subjectId: "",
            weekday: defaultWeekday,
            period: 1,
            startTime: DEFAULT_PERIOD_TIMES[1].start,
            endTime: DEFAULT_PERIOD_TIMES[1].end,
            room: "",
            note: "",
          },
    };
  }, [id, day, isNew]);

  const { data, error, reload } = useQuery(fetcher);

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? "授業を追加" : "授業を編集",
          headerShown: true,
          headerBackTitle: "戻る",
        }}
      />
      {data.subjects.length === 0 ? (
        <Screen topInset={false}>
          <EmptyState
            message="まず科目を登録すると、時間割に授業を追加できます。"
            action={
              <View style={{ alignSelf: "stretch" }}>
                <PrimaryButton
                  label="科目を登録する"
                  onPress={() => router.replace("/subjects")}
                />
              </View>
            }
          />
        </Screen>
      ) : (
        <Body key={id ?? "new"} data={data} sessionId={id} onDone={() => router.back()} />
      )}
    </>
  );
}

function Body({
  data,
  sessionId,
  onDone,
}: {
  data: Loaded;
  sessionId?: string;
  onDone: () => void;
}) {
  const [values, setValues] = useState(data.values);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  /** 時限を変えたら、その時限の既定時刻を入れ直す（入力の手間を減らすための補助） */
  const onPeriodChange = (period: number) => {
    const times = DEFAULT_PERIOD_TIMES[period];
    setValues((prev) => ({
      ...prev,
      period,
      startTime: times ? times.start : prev.startTime,
      endTime: times ? times.end : prev.endTime,
    }));
  };

  // §5.1: 重複は保存を止めず、気づけるように出すだけ。編集中の行は除く。
  const conflicts = findSlotConflicts(
    data.sessions,
    { weekday: values.weekday, period: values.period },
    sessionId,
  );

  const onSave = async () => {
    setMessage(undefined);

    const parsed = classSessionSchema.safeParse({
      subjectId: values.subjectId,
      weekday: values.weekday,
      period: values.period,
      startTime: values.startTime,
      endTime: values.endTime,
      room: values.room,
      note: values.note,
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      setMessage("入力内容を確認してください");
      return;
    }
    setFieldErrors({});

    setBusy(true);
    try {
      const next: ClassSessionValues = {
        subjectId: parsed.data.subjectId,
        weekday: parsed.data.weekday,
        period: parsed.data.period,
        startTime: parsed.data.startTime,
        endTime: parsed.data.endTime,
        room: parsed.data.room,
        note: parsed.data.note,
      };

      if (data.isNew) {
        await createClassSession(next);
      } else {
        await updateClassSession(sessionId!, next);
      }
      onDone();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "保存できませんでした");
      setBusy(false);
    }
  };

  const onDelete = () =>
    Alert.alert("この授業を削除しますか？", undefined, [
      { text: "やめる", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await deleteClassSession(sessionId!);
            onDone();
          } catch (cause) {
            setMessage(cause instanceof Error ? cause.message : "削除できませんでした");
            setBusy(false);
          }
        },
      },
    ]);

  return (
    <Screen topInset={false}>
      <FormMessage message={message} />

      <PickerField
        label="科目"
        required
        value={values.subjectId}
        onChange={(v) => set("subjectId", v)}
        options={data.subjects.map((s) => ({ value: s.id, label: s.name, color: s.color }))}
        placeholder="科目を選択してください"
        error={fieldErrors.subjectId}
      />

      <PickerField
        label="曜日"
        required
        chips
        value={String(values.weekday)}
        onChange={(v) => set("weekday", Number(v))}
        options={WEEKDAYS.map((d) => ({ value: String(d.value), label: d.label }))}
        error={fieldErrors.weekday}
      />

      <PickerField
        label="時限"
        required
        value={String(values.period)}
        onChange={(v) => onPeriodChange(Number(v))}
        options={PERIODS.map((p) => ({ value: String(p), label: `${p}限` }))}
        hint="時限を変えると、開始・終了時刻が既定値に戻ります"
        error={fieldErrors.period}
      />

      {conflicts.length > 0 ? (
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            gap: spacing.sm,
            backgroundColor: theme.warnBg,
            borderRadius: 10,
            padding: spacing.md,
          }}
        >
          <Ionicons name="warning-outline" size={18} color={theme.warn} />
          <Text style={{ flex: 1, fontSize: 14, color: theme.warn }}>
            {weekdayLabel(values.weekday)}の{values.period}限には
            「{conflicts.map((c) => c.subject?.name ?? "科目なし").join("、")}」
            がすでにあります。このまま保存もできます。
          </Text>
        </View>
      ) : null}

      <View style={{ flexDirection: "row", gap: spacing.lg }}>
        <View style={{ flex: 1 }}>
          <TimeField
            label="開始"
            required
            value={values.startTime}
            onChange={(v) => set("startTime", v)}
            error={fieldErrors.startTime}
          />
        </View>
        <View style={{ flex: 1 }}>
          <TimeField
            label="終了"
            required
            value={values.endTime}
            onChange={(v) => set("endTime", v)}
            error={fieldErrors.endTime}
          />
        </View>
      </View>

      <TextField
        label="教室"
        value={values.room}
        onChangeText={(v) => set("room", v)}
        maxLength={50}
        placeholder="3-A"
        error={fieldErrors.room}
      />

      <TextField
        label="メモ"
        multiline
        value={values.note}
        onChangeText={(v) => set("note", v)}
        maxLength={500}
        error={fieldErrors.note}
      />

      <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
        <PrimaryButton label="保存" busy={busy} onPress={onSave} />
        {!data.isNew ? (
          <OutlineButton label="この授業を削除" busy={busy} onPress={onDelete} />
        ) : null}
      </View>
    </Screen>
  );
}
