"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { limitOf } from "@core/entitlements";
import { getEntitlement } from "@/lib/entitlements.server";
import { errorState, successState, type FormState } from "@/lib/form";
import { clampReminderOffsets } from "@core/notifications";
import { createClient } from "@/lib/supabase/server";

/** 通知設定の更新（§3.1 F-08 / §6） */

const TIME_PATTERN = /^\d{2}:\d{2}$/;

export async function updateNotificationSettingsAction(
  _prevState: FormState,
  formData: FormData,
): Promise<FormState> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const remindersEnabled = formData.get("assignmentReminders") === "on";
  const quietEnabled = formData.get("quietHoursEnabled") === "on";

  const quietStart = String(formData.get("quietHoursStart") ?? "22:00");
  const quietEnd = String(formData.get("quietHoursEnd") ?? "07:00");

  if (!TIME_PATTERN.test(quietStart) || !TIME_PATTERN.test(quietEnd)) {
    return errorState("時刻の形式が正しくありません");
  }

  const requested = formData
    .getAll("offsets")
    .map((value) => Number(value))
    .filter((value) => Number.isInteger(value) && value >= 0);

  // §7「課金権限はフロントだけで判定しない」。件数はサーバー側で切り詰める。
  const entitlement = await getEntitlement();
  const offsets = clampReminderOffsets(requested, limitOf(entitlement, "notificationTimings"));

  const { error } = await supabase
    .from("notification_settings")
    .update({
      assignment_reminders: remindersEnabled,
      reminder_offsets_min: offsets,
      quiet_hours_enabled: quietEnabled,
      quiet_hours_start: quietStart,
      quiet_hours_end: quietEnd,
    })
    .eq("user_id", user.id);

  if (error) {
    return errorState("保存できませんでした。時間をおいてお試しください");
  }

  revalidatePath("/settings/notifications");
  revalidatePath("/home");
  return successState("保存しました");
}
