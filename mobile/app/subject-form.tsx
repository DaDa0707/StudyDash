import { Stack, useLocalSearchParams, useRouter } from "expo-router";
import { useCallback, useState } from "react";
import { Alert, View } from "react-native";

import { ColorField, FormMessage, TextField } from "@/components/form";
import { ErrorView, Loading, OutlineButton, PrimaryButton, Screen } from "@/components/ui";
import { createSubject, deleteSubject, updateSubject } from "@/lib/mutations";
import { getSubject } from "@/lib/queries";
import { spacing } from "@/lib/theme";
import { useQuery } from "@/lib/use-query";
import { toFieldErrors } from "@core/form";
import { SUBJECT_COLORS, subjectSchema } from "@core/validation/timetable";

/** 科目の追加・編集（Web 版の subjects と subjects/[id] に相当） */

interface FormValues {
  name: string;
  color: string;
  teacher: string;
}

export default function SubjectFormScreen() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id?: string }>();
  const isNew = !id;

  const fetcher = useCallback(async (): Promise<FormValues> => {
    const existing = id ? await getSubject(id) : null;
    return existing
      ? { name: existing.name, color: existing.color, teacher: existing.teacher ?? "" }
      : { name: "", color: SUBJECT_COLORS[0], teacher: "" };
  }, [id]);

  const { data, error, reload } = useQuery(fetcher);

  if (error) return <ErrorView message={error} onRetry={reload} />;
  if (!data) return <Loading />;

  return (
    <>
      <Stack.Screen
        options={{
          title: isNew ? "科目を追加" : "科目を編集",
          headerShown: true,
          headerBackTitle: "戻る",
        }}
      />
      <Body
        key={id ?? "new"}
        initial={data}
        subjectId={id}
        isNew={isNew}
        onDone={() => router.back()}
      />
    </>
  );
}

function Body({
  initial,
  subjectId,
  isNew,
  onDone,
}: {
  initial: FormValues;
  subjectId?: string;
  isNew: boolean;
  onDone: () => void;
}) {
  const [values, setValues] = useState(initial);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [message, setMessage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof FormValues>(key: K, value: FormValues[K]) =>
    setValues((prev) => ({ ...prev, [key]: value }));

  const onSave = async () => {
    setMessage(undefined);

    const parsed = subjectSchema.safeParse(values);
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      setMessage("入力内容を確認してください");
      return;
    }
    setFieldErrors({});

    setBusy(true);
    try {
      // 名前の重複は事前に調べず、DB の一意制約違反を文言に読み替える
      // （事前確認と保存の間の競合を避けるため。Web 版と同じ）
      if (isNew) {
        await createSubject(parsed.data);
      } else {
        await updateSubject(subjectId!, parsed.data);
      }
      onDone();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "保存できませんでした");
      setBusy(false);
    }
  };

  const onDelete = () =>
    Alert.alert(
      `「${values.name}」を削除しますか？`,
      // 授業・課題・勉強記録は残り、科目の紐付けだけが外れる（すべて ON DELETE SET NULL）
      "時間割の授業・課題・勉強の記録は残りますが、どれも「科目なし」の表示になります。",
      [
        { text: "やめる", style: "cancel" },
        {
          text: "削除",
          style: "destructive",
          onPress: async () => {
            setBusy(true);
            try {
              await deleteSubject(subjectId!);
              onDone();
            } catch (cause) {
              setMessage(cause instanceof Error ? cause.message : "削除できませんでした");
              setBusy(false);
            }
          },
        },
      ],
    );

  return (
    <Screen topInset={false}>
      <FormMessage message={message} />

      <TextField
        label="科目名"
        required
        value={values.name}
        onChangeText={(v) => set("name", v)}
        maxLength={50}
        placeholder="数学Ⅱ"
        error={fieldErrors.name}
      />

      <ColorField
        label="表示色"
        value={values.color}
        colors={SUBJECT_COLORS}
        onChange={(v) => set("color", v)}
        error={fieldErrors.color}
      />

      <TextField
        label="先生"
        value={values.teacher}
        onChangeText={(v) => set("teacher", v)}
        maxLength={50}
        error={fieldErrors.teacher}
      />

      <View style={{ gap: spacing.md, marginTop: spacing.sm }}>
        <PrimaryButton label="保存" busy={busy} onPress={onSave} />
        {!isNew ? (
          <OutlineButton label="この科目を削除" busy={busy} onPress={onDelete} />
        ) : null}
      </View>
    </Screen>
  );
}
