"use server";

import { redirect } from "next/navigation";

import { errorState, type FormState } from "@core/form";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * アカウント削除（§9 / A-10）。
 *
 * auth.users を削除すると、すべてのユーザーデータ用テーブルの外部キーが
 * ON DELETE CASCADE で連鎖削除される（0001_init.sql）。
 * 認証ユーザーの削除は service_role でしか行えないため、ここだけ admin を使う。
 */
export async function deleteAccountAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  // 誤操作を防ぐため、確認語の入力を求める
  const confirmation = String(formData.get("confirmation") ?? "").trim();
  if (confirmation !== "削除") {
    return errorState("確認のため「削除」と入力してください", {
      confirmation: "「削除」と入力してください",
    });
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.deleteUser(user.id);

  if (error) {
    console.error("account deletion failed", error);
    return errorState("削除できませんでした。時間をおいてお試しください");
  }

  // 残っているセッション Cookie を捨ててからトップへ戻す
  await supabase.auth.signOut();
  redirect("/?deleted=1");
}
