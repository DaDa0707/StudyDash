import Ionicons from "@expo/vector-icons/Ionicons";
import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Text, View } from "react-native";

import { AuthError, AuthLayout, AuthLink } from "@/components/auth-layout";
import { TextField } from "@/components/form";
import { Card, PrimaryButton } from "@/components/ui";
import { SITE_URL } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { spacing, theme } from "@/lib/theme";
import { authErrorMessage } from "@core/auth-errors";
import { toFieldErrors } from "@core/form";
import { signUpSchema } from "@core/validation/auth";

/**
 * 新規登録。
 *
 * 表示名は raw_user_meta_data に載せて渡す。
 * handle_new_user トリガがそれを profiles.display_name に入れる
 * （未指定ならメールのローカル部、それも無ければ「ゲスト」）。
 */
export default function SignUpScreen() {
  const router = useRouter();
  const [displayName, setDisplayName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sentTo, setSentTo] = useState<string | null>(null);

  async function signUp() {
    setError(null);

    const parsed = signUpSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});

    setBusy(true);
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        data: { display_name: displayName.trim() || null },
        // 確認メールのリンクはブラウザで開かれる。着地点は Web に残した経路。
        emailRedirectTo: `${SITE_URL}/auth/confirm`,
      },
    });

    if (signUpError) {
      setError(authErrorMessage(signUpError.code, "登録できませんでした"));
      setBusy(false);
      return;
    }

    // 確認が要る設定なら session は返らない。要らなければそのまま入れる。
    if (!data.session) {
      setSentTo(parsed.data.email);
    }
    setBusy(false);
  }

  if (sentTo) {
    return (
      <>
        <Stack.Screen options={{ headerShown: false }} />
        <AuthLayout title="確認メールを送りました">
          <Card style={{ gap: spacing.md }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: spacing.sm }}>
              <Ionicons name="mail-outline" size={20} color={theme.accent} />
              <Text style={{ flex: 1, fontSize: 15, fontWeight: "600", color: theme.text }}>
                {sentTo}
              </Text>
            </View>
            <Text style={{ fontSize: 14, color: theme.muted, lineHeight: 20 }}>
              届いたメールのリンクを開くと登録が完了します。
              そのあとアプリに戻ってログインしてください。
            </Text>
            <Text style={{ fontSize: 13, color: theme.muted, lineHeight: 19 }}>
              メールが見つからないときは、迷惑メールに振り分けられていないか確認してください。
            </Text>
          </Card>

          <PrimaryButton label="ログイン画面へ" onPress={() => router.replace("/login")} />
        </AuthLayout>
      </>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AuthLayout
        title="アカウントを作る"
        subtitle="メールアドレスとパスワードだけで始められます。学校名や本名は必要ありません。"
      >
        <TextField
          label="表示名"
          value={displayName}
          onChangeText={setDisplayName}
          maxLength={50}
          placeholder="だだ"
          hint="本名でなくてかまいません。空欄でもかまいません"
        />
        <TextField
          label="メールアドレス"
          value={email}
          onChangeText={setEmail}
          email
          error={fieldErrors.email}
        />
        <TextField
          label="パスワード"
          value={password}
          onChangeText={setPassword}
          secure
          hint="8文字以上"
          error={fieldErrors.password}
        />

        <AuthError message={error} />

        <PrimaryButton label="登録する" busy={busy} onPress={signUp} />

        <Text style={{ fontSize: 12, color: theme.muted, textAlign: "center", lineHeight: 18 }}>
          登録すると、利用規約とプライバシーポリシーに同意したものとみなします。
        </Text>

        <AuthLink label="ログインへ戻る" onPress={() => router.back()} />
      </AuthLayout>
    </>
  );
}
