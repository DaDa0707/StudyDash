import { redirect } from "next/navigation";

import { BottomNav } from "@/components/nav/bottom-nav";
import { createClient } from "@/lib/supabase/server";

/**
 * ログイン後の共通シェル。モバイル最優先で、下部ナビ分の余白を確保する（§11）。
 * 認証チェックは middleware でも行うが、データ取得の前提としてここでも確認する。
 */
export default async function AppLayout({ children }: LayoutProps<"/">) {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarded_at")
    .eq("id", user.id)
    .maybeSingle();

  if (!profile?.onboarded_at) redirect("/onboarding");

  return (
    <div className="min-h-dvh">
      {/* 下部ナビ(56px) + セーフエリア分の余白 */}
      <div className="mx-auto w-full max-w-2xl px-4 pb-[calc(5rem+env(safe-area-inset-bottom))] pt-5">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
