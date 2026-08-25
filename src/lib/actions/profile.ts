"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { errorState, successState, toFieldErrors, type FormState } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validation/auth";

/** 設定画面からの表示名・学校種別の更新 */
export async function updateProfileAction(
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

  // RLS により他人の行は更新できないが、意図を明示するため user_id で絞る。
  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: parsed.data.displayName,
      school_type: parsed.data.schoolType,
    })
    .eq("id", user.id);

  if (error) {
    return errorState("保存できませんでした。時間をおいてお試しください");
  }

  revalidatePath("/", "layout");
  return successState("保存しました");
}
