import { useRouter } from "expo-router";
import { useState } from "react";

import { AuthError, AuthLayout, AuthLink } from "@/components/auth-layout";
import { TextField } from "@/components/form";
import { PrimaryButton } from "@/components/ui";
import { supabase } from "@/lib/supabase";
import { authErrorMessage } from "@core/auth-errors";
import { toFieldErrors } from "@core/form";
import { signInSchema } from "@core/validation/auth";

export default function LoginScreen() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function signIn() {
    setError(null);

    const parsed = signInSchema.safeParse({ email, password });
    if (!parsed.success) {
      setFieldErrors(toFieldErrors(parsed.error));
      return;
    }
    setFieldErrors({});

    setBusy(true);
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: parsed.data.email,
      password: parsed.data.password,
    });

    if (signInError) {
      setError(authErrorMessage(signInError.code, "ログインできませんでした"));
    }
    setBusy(false);
  }

  return (
    <AuthLayout title="おかえりなさい" subtitle="メールアドレスとパスワードでログインします。">
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
        error={fieldErrors.password}
      />

      <AuthError message={error} />

      <PrimaryButton label="ログイン" busy={busy} onPress={signIn} />

      <AuthLink label="アカウントを作る" onPress={() => router.push("/signup")} />
      <AuthLink label="パスワードを忘れた" onPress={() => router.push("/reset-password")} />
    </AuthLayout>
  );
}
