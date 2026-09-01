import { Stack, useRouter } from "expo-router";
import { useState } from "react";
import { Text } from "react-native";

import { AuthError, AuthLayout, AuthLink } from "@/components/auth-layout";
import { TextField } from "@/components/form";
import { Card, PrimaryButton } from "@/components/ui";
import { SITE_URL } from "@/lib/config";
import { supabase } from "@/lib/supabase";
import { theme } from "@/lib/theme";
import { authErrorMessage } from "@core/auth-errors";
import { toFieldErrors } from "@core/form";
import { resetPasswordSchema } from "@core/validation/auth";

/**
 * パスワードの再設定を依頼する。
 *
 * 新しいパスワードを入れる画面はブラウザ側にある（/update-password）。
 * メールのリンクがブラウザで開かれるため、そこだけは Web に残してある。
 */
export default function ResetPasswordScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);

  async function request() {
    setError(null);

    const parsed = resetPasswordSchema.safeParse({ email });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});

    setBusy(true);
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(
      parsed.data.email,
      { redirectTo: `${SITE_URL}/auth/confirm?next=/update-password` },
    );

    if (resetError) {
      setError(authErrorMessage(resetError.code, "送信できませんでした"));
      setBusy(false);
      return;
    }

    // 登録の有無は伝えない（存在するアドレスを探れないようにする）
    setSent(true);
    setBusy(false);
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <AuthLayout
        title="パスワードの再設定"
        subtitle="登録したメールアドレスに、再設定用のリンクを送ります。"
      >
        {sent ? (
          <>
            <Card>
              <Text style={{ fontSize: 14, color: theme.text, lineHeight: 20 }}>
                そのアドレスが登録されていれば、再設定用のリンクを送りました。
                届いたメールのリンクを開いて、新しいパスワードを設定してください。
              </Text>
            </Card>
            <PrimaryButton label="ログイン画面へ" onPress={() => router.replace("/login")} />
          </>
        ) : (
          <>
            <TextField
              label="メールアドレス"
              value={email}
              onChangeText={setEmail}
              email
              error={fieldErrors.email}
            />
            <AuthError message={error} />
            <PrimaryButton label="再設定メールを送る" busy={busy} onPress={request} />
            <AuthLink label="ログインへ戻る" onPress={() => router.back()} />
          </>
        )}
      </AuthLayout>
    </>
  );
}
