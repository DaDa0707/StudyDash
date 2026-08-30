import { useState } from "react";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

import { supabase } from "@/lib/supabase";
import { spacing, theme } from "@/lib/theme";

/** Web 版の (auth)/login に相当する画面 */
export default function LoginScreen() {
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn(override?: { email: string; password: string }) {
    setBusy(true);
    setError(null);

    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: (override?.email ?? email).trim(),
      password: override?.password ?? password,
    });

    if (signInError) {
      setError(
        signInError.code === "invalid_credentials"
          ? "メールアドレスまたはパスワードが正しくありません"
          : "ログインできませんでした",
      );
    }

    setBusy(false);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <ScrollView
        contentContainerStyle={{
          flexGrow: 1,
          justifyContent: "center",
          padding: spacing.xl,
          paddingTop: insets.top + spacing.xl,
        }}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={{ fontSize: 26, fontWeight: "700", color: theme.text }}>
          おかえりなさい
        </Text>
        <Text style={{ marginTop: 6, fontSize: 14, color: theme.muted }}>
          メールアドレスとパスワードでログインします。
        </Text>

        <View style={{ marginTop: spacing.xxl, gap: spacing.lg }}>
          <Field
            label="メールアドレス"
            value={email}
            onChangeText={setEmail}
            keyboardType="email-address"
            autoCapitalize="none"
            autoComplete="email"
            textContentType="emailAddress"
          />
          <Field
            label="パスワード"
            value={password}
            onChangeText={setPassword}
            secureTextEntry
            autoCapitalize="none"
            textContentType="password"
          />

          {error ? (
            <View
              style={{
                backgroundColor: theme.dangerBg,
                borderRadius: 10,
                padding: spacing.md,
              }}
            >
              <Text style={{ color: theme.danger, fontSize: 14 }}>{error}</Text>
            </View>
          ) : null}

          <Pressable
            onPress={() => signIn()}
            disabled={busy || !email || !password}
            style={({ pressed }) => ({
              height: 48,
              borderRadius: 10,
              alignItems: "center",
              justifyContent: "center",
              backgroundColor: theme.primary,
              opacity: busy || !email || !password ? 0.5 : pressed ? 0.85 : 1,
            })}
          >
            {busy ? (
              <ActivityIndicator color={theme.primaryText} />
            ) : (
              <Text style={{ color: theme.primaryText, fontSize: 16, fontWeight: "600" }}>
                ログイン
              </Text>
            )}
          </Pressable>
          {/* 試作の確認用。本番向けの実装では外す。 */}
          <Pressable
            onPress={() =>
              signIn({ email: "demo@studydash.app", password: "StudyDash-Demo-2026" })
            }
            disabled={busy}
            style={({ pressed }) => ({
              height: 44,
              alignItems: "center",
              justifyContent: "center",
              opacity: pressed ? 0.6 : 1,
            })}
          >
            <Text style={{ color: theme.muted, fontSize: 14 }}>
              デモデータでログイン
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

function Field({
  label,
  ...props
}: { label: string } & React.ComponentProps<typeof TextInput>) {
  return (
    <View style={{ gap: 6 }}>
      <Text style={{ fontSize: 14, fontWeight: "600", color: theme.text }}>{label}</Text>
      <TextInput
        {...props}
        placeholderTextColor={theme.muted}
        style={{
          height: 48,
          borderWidth: 1,
          borderColor: theme.border,
          borderRadius: 10,
          paddingHorizontal: spacing.md,
          fontSize: 16,
          color: theme.text,
        }}
      />
    </View>
  );
}
