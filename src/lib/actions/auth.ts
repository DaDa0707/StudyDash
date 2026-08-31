"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { headers } from "next/headers";

import { publicEnv } from "@/lib/env";
import { errorState, successState, toFieldErrors, type FormState } from "@core/form";
import { createClient } from "@/lib/supabase/server";
import {
  onboardingSchema,
  resetPasswordSchema,
  signInSchema,
  signUpSchema,
  updatePasswordSchema,
} from "@core/validation/auth";

/**
 * Supabase が返す英語メッセージを日本語へ寄せる。
 * 未知のコードはそのまま出さず、汎用文言に丸める（内部情報を漏らさない）。
 */
function authErrorMessage(code: string | undefined, fallback: string): string {
  switch (code) {
    case "invalid_credentials":
      return "メールアドレスまたはパスワードが正しくありません";
    case "email_not_confirmed":
      return "メールアドレスの確認が完了していません。確認メールのリンクを開いてください";
    case "user_already_exists":
    case "email_exists":
      return "このメールアドレスは既に登録されています";
    case "weak_password":
      return "パスワードが簡単すぎます。より複雑なものを設定してください";
    case "email_address_invalid":
      return "このメールアドレスは使えません。別のアドレスでお試しください";
    case "email_address_not_authorized":
      return "このメールアドレスへは送信できません";
    case "signup_disabled":
      return "現在、新規登録を受け付けていません";
    case "validation_failed":
      return "入力内容を確認してください";
    case "over_request_rate_limit":
    case "over_email_send_rate_limit":
      return "リクエストが多すぎます。しばらく待ってからお試しください";
    case "same_password":
      return "現在と同じパスワードは設定できません";
    default:
      // 想定外のコードは文言に丸めるが、問い合わせで原因を追えるよう符牒だけ添える。
      // 中身（メールアドレスや内部メッセージ）は出さない。
      return code ? `${fallback}（コード: ${code}）` : fallback;
  }
}

/** 想定外の失敗はサーバーログに残す。利用者には出さない。 */
function logAuthFailure(where: string, error: { code?: string; status?: number; message: string }) {
  console.error(`[auth] ${where} failed`, {
    code: error.code ?? "(なし)",
    status: error.status ?? "(なし)",
    message: error.message,
  });
}

/** メールリンクの戻り先。プロキシ配下でも正しい origin を得る。 */
async function siteOrigin(): Promise<string> {
  if (publicEnv.siteUrl) return publicEnv.siteUrl;
  const headerList = await headers();
  const host = headerList.get("x-forwarded-host") ?? headerList.get("host");
  const proto = headerList.get("x-forwarded-proto") ?? "http";
  return host ? `${proto}://${host}` : "http://localhost:3000";
}

export async function signUpAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return errorState("入力内容を確認してください", toFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const origin = await siteOrigin();

  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/onboarding` },
  });

  if (error) {
    logAuthFailure("signUp", error);
    return errorState(authErrorMessage(error.code, "登録できませんでした。時間をおいてお試しください"));
  }

  // メール確認が必要な設定の場合、この時点ではセッションが発行されない。
  if (!data.session) {
    return successState(
      "確認メールを送信しました。メール内のリンクを開いて登録を完了してください。",
    );
  }

  revalidatePath("/", "layout");
  redirect("/onboarding");
}

/**
 * 確認メールを送り直す。
 *
 * 確認メールが届かない・期限が切れた場合の唯一の復旧手段。
 * 送信の可否でアカウントの有無を推測されないよう、結果に関わらず同じ文言を返す
 * （送信上限に当たったときだけは、待てば直ると分かるように伝える）。
 */
export async function resendConfirmationAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return errorState("入力内容を確認してください", toFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const origin = await siteOrigin();

  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data.email,
    options: { emailRedirectTo: `${origin}/auth/confirm?next=/onboarding` },
  });

  if (error) {
    logAuthFailure("resendConfirmation", error);

    if (error.code === "over_email_send_rate_limit") {
      return errorState(
        "送信が立て込んでいます。しばらく待ってからお試しください",
      );
    }
  }

  return successState(
    "確認メールを送り直しました。届かない場合は迷惑メールもご確認ください。",
  );
}

export async function signInAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return errorState("入力内容を確認してください", toFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);

  if (error) {
    logAuthFailure("signIn", error);
    return errorState(authErrorMessage(error.code, "ログインできませんでした"));
  }

  const nextParam = formData.get("next");
  // オープンリダイレクト防止のため、自サイト内の絶対パスのみ許可する。
  const next =
    typeof nextParam === "string" && /^\/(?!\/)/.test(nextParam) ? nextParam : "/home";

  revalidatePath("/", "layout");
  redirect(next);
}

export async function signOutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}

export async function requestPasswordResetAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = resetPasswordSchema.safeParse({ email: formData.get("email") });

  if (!parsed.success) {
    return errorState("入力内容を確認してください", toFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const origin = await siteOrigin();

  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${origin}/auth/confirm?next=/update-password`,
  });

  // アカウントの存在有無を成否から推測されないよう、結果に関わらず同じ文言を返す。
  if (error && error.code === "over_email_send_rate_limit") {
    return errorState(authErrorMessage(error.code, "しばらく待ってからお試しください"));
  }

  return successState(
    "登録済みのメールアドレスであれば、再設定用のリンクを送信しました。",
  );
}

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

  revalidatePath("/", "layout");
  redirect("/home");
}

export async function completeOnboardingAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = onboardingSchema.safeParse({
    displayName: formData.get("displayName"),
    schoolType: formData.get("schoolType"),
  });

  if (!parsed.success) {
    return errorState("入力内容を確認してください", toFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      school_type: parsed.data.schoolType,
      onboarded_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    return errorState("保存できませんでした。時間をおいてお試しください");
  }

  revalidatePath("/", "layout");
  // 遷移先で計測する（成功したときだけ数えるため）
  redirect("/home?welcome=1");
}
