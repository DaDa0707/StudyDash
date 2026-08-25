import type { Metadata } from "next";

import { PhaseNotice } from "@/components/phase-notice";
import { createClient } from "@/lib/supabase/server";
import { getEntitlement } from "@/lib/entitlements.server";
import { isPro } from "@/lib/entitlements";
import { formatToday, greetingFor } from "@/lib/date";

export const metadata: Metadata = { title: "ホーム" };

/** §4.2 のカード順に、後続フェーズで埋める枠を並べる */
const CARDS = [
  {
    phase: 2,
    title: "次の授業",
    description: "時間割を登録すると、現在時刻以降で最も近い授業をここに表示します。",
  },
  {
    phase: 3,
    title: "締切が近い課題",
    description: "未完了の課題を締切順に最大3件表示します。",
  },
  { phase: 3, title: "今日のTodo", description: "今日の分のTodoと、1タップでの完了操作を置きます。" },
  { phase: 4, title: "勉強タイマー", description: "科目を選んですぐ開始できるボタンを置きます。" },
  { phase: 4, title: "勉強時間", description: "今日の合計と今週の合計を表示します。" },
] as const;

export default async function HomePage() {
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { data: profile } = await supabase
    .from("profiles")
    .select("display_name, timezone")
    .eq("id", user!.id)
    .single();

  const entitlement = await getEntitlement();
  const timezone = profile?.timezone ?? "Asia/Tokyo";
  const now = new Date();

  return (
    <div className="space-y-5">
      <header>
        <p className="text-sm text-muted-foreground">{formatToday(now, timezone)}</p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight">
          {greetingFor(now, timezone)}、{profile?.display_name ?? "ゲスト"}さん
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          現在のプラン：{isPro(entitlement) ? "Pro" : "Free"}
        </p>
      </header>

      <div className="grid gap-3 sm:grid-cols-2">
        {CARDS.map((card) => (
          <PhaseNotice key={card.title} {...card} />
        ))}
      </div>
    </div>
  );
}
