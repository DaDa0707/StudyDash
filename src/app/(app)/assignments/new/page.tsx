import { ChevronLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { AssignmentForm } from "@/components/assignments/assignment-form";
import { zonedDateKey } from "@core/deadline";
import { checkQuota } from "@core/entitlements";
import { getEntitlement } from "@/lib/entitlements.server";
import { countOpenAssignments } from "@/lib/queries/assignments";
import { listSubjects } from "@/lib/queries/timetable";
import { createClient } from "@/lib/supabase/server";

export const metadata: Metadata = { title: "課題の追加" };

export default async function NewAssignmentPage() {
  const [subjects, entitlement, openCount, supabase] = await Promise.all([
    listSubjects(),
    getEntitlement(),
    countOpenAssignments(),
    createClient(),
  ]);

  // 上限に達しているならフォームを開かせず、一覧の案内へ戻す（A-06）
  const quota = checkQuota(entitlement, "openAssignments", openCount);
  if (!quota.allowed) redirect("/assignments");

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user!.id)
    .single();

  const timezone = profile?.timezone ?? "Asia/Tokyo";

  return (
    <div className="space-y-6">
      <Link
        href="/assignments"
        className="inline-flex min-h-11 items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="size-4" aria-hidden />
        課題
      </Link>

      <h1 className="text-2xl font-bold tracking-tight">課題の追加</h1>

      <AssignmentForm
        subjects={subjects}
        defaultDueDate={zonedDateKey(new Date(), timezone)}
      />
    </div>
  );
}
