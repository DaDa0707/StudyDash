"use server";

import { redirect } from "next/navigation";

import { APP_VERSION } from "@/lib/version";
import { errorState, successState, toFieldErrors, type FormState } from "@/lib/form";
import { createClient } from "@/lib/supabase/server";
import { feedbackSchema } from "@/lib/validation/feedback";

/** フィードバックの送信（§13 Phase 7 フィードバック導線） */
export async function submitFeedbackAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = feedbackSchema.safeParse({
    category: formData.get("category") ?? "other",
    message: formData.get("message"),
    pagePath: formData.get("pagePath") ?? "",
  });

  if (!parsed.success) {
    return errorState("入力内容を確認してください", toFieldErrors(parsed.error));
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { error } = await supabase.from("feedback").insert({
    user_id: user.id,
    category: parsed.data.category,
    message: parsed.data.message,
    page_path: parsed.data.pagePath,
    app_version: APP_VERSION,
  });

  if (error) {
    return errorState("送信できませんでした。時間をおいてお試しください");
  }

  return successState("送信しました。ありがとうございます。");
}
