import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";

import { OnboardingForm } from "./onboarding-form";

export const metadata: Metadata = { title: "はじめの設定" };

export default async function OnboardingPage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, school_type, onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  if (profile?.onboarded_at) redirect("/home");

  return (
    <div className="flex min-h-dvh flex-col px-5 py-6">
      <main className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-8">
        <div className="space-y-1.5">
          <h1 className="text-2xl font-bold tracking-tight">はじめまして</h1>
          <p className="text-sm text-muted-foreground">
            表示名と学校の種類だけ教えてください。あとから設定で変更できます。
          </p>
        </div>

        <div className="mt-6">
          <OnboardingForm
            defaultDisplayName={profile?.display_name ?? ""}
            defaultSchoolType={profile?.school_type ?? "high_school"}
          />
        </div>
      </main>
    </div>
  );
}
