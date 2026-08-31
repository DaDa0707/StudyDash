import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, View } from "react-native";

import {
  DateField,
  FormMessage,
  PickerField,
  TextField,
  TimeField,
} from "@/components/form";
import { ErrorView, Loading, OutlineButton, PrimaryButton, Screen } from "@/components/ui";
import {
  createAssignment,
  deleteAssignment,
  updateAssignment,
  type AssignmentValues,
} from "@/lib/mutations";
import {
  countOpenAssignments,
  getAssignment,
  getEntitlement,
  getProfile,
  listSubjects,
  type Profile,
} from "@/lib/queries";
import { spacing } from "@/lib/theme";
import { useQuery } from "@/lib/use-query";
import { ASSIGNMENT_STATUSES, PRIORITIES } from "@core/assignments";
import { zonedDateKey, zonedTimeKey } from "@core/deadline";
import { UPSELL_MESSAGES, checkQuota, type Entitlement } from "@core/entitlements";
import { toFieldErrors } from "@core/form";
import { assignmentSchema } from "@core/validation/assignments";
import type { AssignmentStatus, PriorityLevel, Subject } from "@core/database";

/**
 * 課題の追加・編集（Web 版の assignments/new と [id]/edit に相当）。
 *
 * 値はすべて文字列で持ち、core/validation の assignmentSchema にそのまま渡す。
 * 検証規則もエラー文言も Web と同じものを使う。
 */

interface FormData {
  profile: Profile;
  subjects: Subject[];
  entitlement: Entitlement;
  values: AssignmentValues & { dueTime: string };
  isNew: boolean;
  /**
   * 選択肢は archived=false の科目だけ。編集対象がアーカイブ済みの科目を
   * 指していると一覧に出ず、そのまま保存すると科目が黙って外れる。
   * 該当する場合だけ、その科目を選択肢に足す。
   */
  extraSubject: { id: string; name: string; color: string } | null;
}

export default function AssignmentFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isNew = !id;

  const fetcher = useCallback(async (): Promise<FormData> => {
    const [profile, subjects, entitlement] = await Promise.all([
      getProfile(),
      listSubjects(),
      getEntitlement(),
    ]);

    const existing = id ? await getAssignment(id) : null;
    const tz = profile.timezone;

    const missing =
      existing?.subject_id && !subjects.some((s) => s.id === existing.subject_id)
        ? existing.subject
        : null;

    return {
      profile,
      subjects,
      entitlement,
      isNew,
      extraSubject: missing
        ? { id: missing.id, name: missing.name, color: missing.color }
        : null,
      values: existing
        ? {
            title: existing.title,
            subjectId: existing.subject_id,
            dueDate: zonedDateKey(new Date(existing.due_at), tz),
            // 終日なら時刻は空。時刻欄が空＝日付のみの締切という約束
            dueTime: existing.due_all_day
              ? ""
              : zonedTimeKey(new Date(existing.due_at), tz),
            priority: existing.priority,
            status: existing.status,
            note: existing.note,
          }
        : {
            title: "",
            subjectId: null,
            dueDate: zonedDateKey(new Date(), tz),
            dueTime: "",
            priority: null,
            status: "not_started",
            note: null,
          },
    };
  }, [id, isNew]);

  const { data, error, reload } = useQuery(fetcher);

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? "課題を追加" : "課題を編集",
          headerShown: true,
          headerBackTitle: "戻る",
        }}
      />
      <Body
        key={id ?? "new"}
        data={data}
        onDone={() => router.back()}
        assignmentId={id}
      />
    </>
  );
}

function Body({
  data,
  assignmentId,
  onDone,
}: {
  data: FormData;
  assignmentId?: string;
  onDone: () => void;
}) {
  const [values, setValues] = useState(data.values);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof typeof values>(key: K, value: (typeof values)[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const onSave = async () => {
    setMessage(undefined);

    // Web と同じスキーマで検証する（文言もそのまま）
    const parsed = assignmentSchema.safeParse({
      title: values.title,
      subjectId: values.subjectId ?? "",
      dueDate: values.dueDate,
      dueTime: values.dueTime,
      priority: values.priority ?? "",
      status: values.status,
      note: values.note ?? "",
    });

    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      setMessage("入力内容を確認してください");
      return;
    }
    setFieldErrors({});

    setBusy(true);
    try {
      const next: AssignmentValues = {
        title: parsed.data.title,
        subjectId: parsed.data.subjectId,
        dueDate: parsed.data.dueDate,
        dueTime: parsed.data.dueTime,
        priority: parsed.data.priority,
        status: parsed.data.status,
        note: parsed.data.note,
      };

      if (data.isNew) {
        // 画面での非表示に頼らず、保存の直前に DB から数え直して上限を確かめる（A-06）
        const openCount = await countOpenAssignments();
        const quota = checkQuota(data.entitlement, "openAssignments", openCount);
        if (!quota.allowed) {
          setMessage(UPSELL_MESSAGES.openAssignments);
          setBusy(false);
          return;
        }
        await createAssignment(next, data.profile.timezone);
      } else {
        await updateAssignment(assignmentId!, next, data.profile.timezone);
      }
      onDone();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "保存できませんでした");
      setBusy(false);
    }
  };

  const onDelete = () =>
    Alert.alert("この課題を削除しますか？", values.title, [
      { text: "やめる", style: "cancel" },
      {
        text: "削除",
        style: "destructive",
        onPress: async () => {
          setBusy(true);
          try {
            await deleteAssignment(assignmentId!);
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

      <TextField
        label="タイトル"
        required
        value={values.title}
        onChangeText={(v) => set("title", v)}
        maxLength={100}
        placeholder="数学 ワークp.42-45"
        error={fieldErrors.title}
      />

      <PickerField
        label="科目"
        value={values.subjectId ?? ""}
        onChange={(v) => set("subjectId", v === "" ? null : v)}
        options={[
          { value: "", label: "指定しない" },
          ...data.subjects.map((s) => ({ value: s.id, label: s.name, color: s.color })),
          ...(data.extraSubject
            ? [
                {
                  value: data.extraSubject.id,
                  label: data.extraSubject.name,
                  color: data.extraSubject.color,
                },
              ]
            : []),
        ]}
        hint={data.subjects.length === 0 ? "科目を登録すると選べるようになります" : undefined}
        error={fieldErrors.subjectId}
      />

      <DateField
        label="締切日"
        required
        value={values.dueDate}
        onChange={(v) => set("dueDate", v)}
        error={fieldErrors.dueDate}
      />

      <TimeField
        label="時刻"
        clearable
        value={values.dueTime}
        onChange={(v) => set("dueTime", v)}
        hint="指定しない場合は、その日いっぱいが締切になります"
        error={fieldErrors.dueTime}
      />

      <PickerField
        label="優先度"
        chips
        value={values.priority ?? ""}
        onChange={(v) => set("priority", v === "" ? null : (v as PriorityLevel))}
        options={[
          { value: "", label: "指定しない" },
          ...PRIORITIES.map((p) => ({ value: p.value, label: p.label })),
        ]}
        error={fieldErrors.priority}
      />

      <PickerField
        label="状態"
        chips
        value={values.status}
        onChange={(v) => set("status", v as AssignmentStatus)}
        options={ASSIGNMENT_STATUSES.map((s) => ({ value: s.value, label: s.label }))}
        error={fieldErrors.status}
      />

      <TextField
        label="メモ"
        multiline
        value={values.note ?? ""}
        onChangeText={(v) => set("note", v === "" ? null : v)}
        maxLength={2000}
        error={fieldErrors.note}
      />

      <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
        <PrimaryButton label="保存" busy={busy} onPress={onSave} />
        {!data.isNew ? (
          <OutlineButton label="この課題を削除" busy={busy} onPress={onDelete} />
        ) : null}
      </View>
    </Screen>
  );
}
