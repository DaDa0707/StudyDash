"use server";

import { authErrorMessage } from "@core/auth-errors";
import { errorState, successState, toFieldErrors, type FormState } from "@core/form";
import { createClient } from "@/lib/supabase/server";
import { updatePasswordSchema } from "@core/validation/auth";

/**
 * パスワードの再設定だけを Web に残す。
 *
 * アプリは App Store からのみ配布するが、Supabase が送る再設定メールの
 * リンクはブラウザで開かれる。その着地点（/auth/confirm）と、
 * 新しいパスワードを入れるこの画面はブラウザ側に要る。
 * 登録・ログイン・サインアウトはアプリで行う。
 */
export async function updatePasswordAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return errorState("入力内容を確認してください", toFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return errorState("リンクの有効期限が切れています。再度お試しください");
  }

  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });

  if (error) {
    return errorState(authErrorMessage(error.code, "パスワードを変更できませんでした"));
  }

  // 戻る先の画面がブラウザには無いので、アプリへ戻ってもらう
  await supabase.auth.signOut();
  return successState("パスワードを変更しました。アプリに戻ってログインしてください。");
}
