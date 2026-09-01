import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { FormMessage, TextField } from "@/components/form";
import { Card, OutlineButton, Screen } from "@/components/ui";
import { deleteOwnAccount } from "@/lib/mutations";
import { spacing, theme } from "@/lib/theme";

/**
 * Web 版の (app)/settings/delete-account に相当する画面。
 *
 * App Store は、アカウントを作れるアプリにアプリ内での退会を求める。
 * 消えるものを先に見せ、確認語を打たせてから実行する。
 */

const CONFIRM_WORD = "削除";

const REMOVED = [
  "時間割と科目",
  "課題と Todo",
  "勉強タイマーの記録",
  "通知の設定",
  "アカウントとログイン情報",
];

export default function AccountDeleteScreen() {
  const [confirmation, setConfirmation] = useState("");
  const [fieldError, setFieldError] = useState<string | undefined>();
  const [message, setMessage] = useState<string | undefined>();
  const [busy, setBusy] = useState(false);

  const onDelete = async () => {
    setMessage(undefined);

    // 誤操作を防ぐため、確認語の入力を求める（Web 版と同じ）
    if (confirmation.trim() !== CONFIRM_WORD) {
      setFieldError(`「${CONFIRM_WORD}」と入力してください`);
      setMessage(`確認のため「${CONFIRM_WORD}」と入力してください`);
      return;
    }
    setFieldError(undefined);

    setBusy(true);
    try {
      // 成功すればセッションが切れ、_layout がログイン画面へ戻す
      await deleteOwnAccount();
    } catch (cause) {
      setMessage(cause instanceof Error ? cause.message : "削除できませんでした");
      setBusy(false);
    }
  };

  return (
    <>
      <Stack.Screen
        options={{ title: "アカウントを削除", headerShown: true, headerBackTitle: "戻る" }}
      />
      <Screen topInset={false}>
        <FormMessage message={message} />

        <Card style={{ backgroundColor: theme.dangerBg, borderColor: theme.dangerBg }}>
          <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
            <Ionicons name="warning" size={20} color={theme.danger} />
            <Text style={{ flex: 1, fontSize: 15, fontWeight: "700", color: theme.danger }}>
              この操作は取り消せません
            </Text>
          </View>
          <Text style={{ marginTop: 8, fontSize: 14, color: theme.danger, lineHeight: 20 }}>
            削除すると、次のデータがすべて消えます。元に戻すことはできません。
          </Text>
        </Card>

        <Card>
          <View style={{ gap: spacing.sm }}>
            {REMOVED.map((item) => (
              <View
                key={item}
                style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}
              >
                <Ionicons name="close-circle-outline" size={16} color={theme.muted} />
                <Text style={{ fontSize: 14, color: theme.text }}>{item}</Text>
              </View>
            ))}
          </View>
        </Card>

        <TextField
          label={`確認のため「${CONFIRM_WORD}」と入力してください`}
          value={confirmation}
          onChangeText={setConfirmation}
          maxLength={10}
          placeholder={CONFIRM_WORD}
          error={fieldError}
        />

        <OutlineButton
          label="アカウントを削除する"
          busy={busy}
          disabled={confirmation.trim() !== CONFIRM_WORD}
          onPress={onDelete}
          icon={<Ionicons name="trash-outline" size={18} color={theme.danger} />}
        />
      </Screen>
    </>
  );
}
