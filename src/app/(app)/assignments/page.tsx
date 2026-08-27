import { CircleCheck, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";

import { TrackOnMount } from "@/components/analytics/track-on-mount";
import { AssignmentCard } from "@/components/assignments/assignment-card";
import { QuotaNotice } from "@/components/quota-notice";
import { Button } from "@/components/ui/button";
import { isOpen, sortByDueDate } from "@/lib/assignments";
import { checkQuota, UPSELL_MESSAGES } from "@/lib/entitlements";
import { getEntitlement } from "@/lib/entitlements.server";
import { listAssignments } from "@/lib/queries/assignments";
import { listSubjects } from "@/lib/queries/timetable";
import { createClient } from "@/lib/supabase/server";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "課題" };

function single(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AssignmentsPage({ searchParams }: PageProps<"/assignments">) {
  const [params, assignments, subjects, entitlement, supabase] = await Promise.all([
    searchParams,
    listAssignments(),
    listSubjects(),
    getEntitlement(),
    createClient(),
  ]);

  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("timezone")
    .eq("id", user!.id)
    .single();

  const timezone = profile?.timezone ?? "Asia/Tokyo";
  const now = new Date();

  const showDone = single(params.done) === "1";
  const subjectFilter = single(params.subject) ?? "";
  const justSaved = single(params.saved) === "1";

  // S-05: 未完了・期限順・科目別
  const openCount = assignments.filter((item) => isOpen(item.status)).length;
  const quota = checkQuota(entitlement, "openAssignments", openCount);

  const filtered = assignments.filter((item) => {
    if (showDone !== !isOpen(item.status)) return false;
    if (subjectFilter && item.subject_id !== subjectFilter) return false;
    return true;
  });
  const visible = sortByDueDate(filtered);

  const buildHref = (next: { done?: boolean; subject?: string }) => {
    const search = new URLSearchParams();
    const done = next.done ?? showDone;
    const subject = next.subject ?? subjectFilter;
    if (done) search.set("done", "1");
    if (subject) search.set("subject", subject);
    const query = search.toString();
    return query ? `/assignments?${query}` : "/assignments";
  };

  return (
    <div className="space-y-5">
      <header>
        <h1 className="text-2xl font-bold tracking-tight">課題</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          未完了 {openCount}件
          {quota.limit === null ? "" : ` / ${quota.limit}件まで`}
        </p>
      </header>

      {justSaved ? <TrackOnMount event="assignment_created" /> : null}
      {quota.shouldUpsell ? (
        <TrackOnMount event="quota_reached" properties={{ feature: "openAssignments" }} />
      ) : null}

      {justSaved ? (
        <p
          role="status"
          className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2.5 text-sm text-emerald-700 dark:text-emerald-400"
        >
          <CircleCheck className="size-4 shrink-0" aria-hidden />
          保存しました
        </p>
      ) : null}

      <div className="space-y-3">
        <div className="flex gap-1" role="tablist" aria-label="表示切替">
          {[
            { label: "未完了", active: !showDone, href: buildHref({ done: false }) },
            { label: "完了済み", active: showDone, href: buildHref({ done: true }) },
          ].map((tab) => (
            <Link
              key={tab.label}
              href={tab.href}
              role="tab"
              aria-selected={tab.active}
              className={cn(
                "flex min-h-11 flex-1 items-center justify-center rounded-lg text-sm transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                tab.active
                  ? "bg-primary text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted",
              )}
            >
              {tab.label}
            </Link>
          ))}
        </div>

        {subjects.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            <Link
              href={buildHref({ subject: "" })}
              className={cn(
                "inline-flex min-h-9 items-center rounded-full px-3 text-xs transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                subjectFilter === ""
                  ? "bg-foreground text-background"
                  : "bg-muted text-muted-foreground hover:text-foreground",
              )}
            >
              すべての科目
            </Link>
            {subjects.map((subject) => (
              <Link
                key={subject.id}
                href={buildHref({ subject: subject.id })}
                className={cn(
                  "inline-flex min-h-9 items-center gap-1.5 rounded-full px-3 text-xs transition-colors",
                  "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                  subjectFilter === subject.id
                    ? "bg-foreground text-background"
                    : "bg-muted text-muted-foreground hover:text-foreground",
                )}
              >
                <span
                  aria-hidden
                  className="size-2 rounded-full"
                  style={{ backgroundColor: subject.color }}
                />
                {subject.name}
              </Link>
            ))}
          </div>
        ) : null}
      </div>

      <QuotaNotice quota={quota} message={UPSELL_MESSAGES.openAssignments} />

      {visible.length === 0 ? (
        <p className="rounded-xl border border-dashed p-5 text-center text-sm text-muted-foreground">
          {showDone ? "完了した課題はまだありません。" : "未完了の課題はありません。"}
        </p>
      ) : (
        <ul className="space-y-2">
          {visible.map((assignment) => (
            <AssignmentCard
              key={assignment.id}
              assignment={assignment}
              now={now}
              timezone={timezone}
            />
          ))}
        </ul>
      )}

      {quota.allowed ? (
        <Button
          render={<Link href="/assignments/new" />}
          nativeButton={false}
          variant="outline"
          className="h-11 w-full text-base"
        >
          <Plus className="size-4" aria-hidden />
          課題を追加
        </Button>
      ) : null}
    </div>
  );
}
