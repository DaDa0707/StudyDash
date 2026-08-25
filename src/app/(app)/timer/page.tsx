import type { Metadata } from "next";

import { PhaseNotice } from "@/components/phase-notice";

export const metadata: Metadata = { title: "タイマー" };

export default function TimerPage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">勉強タイマー</h1>
      <PhaseNotice
        phase={4}
        title="科目を選んで計測・履歴へ保存"
        description="study_sessions は ended_at が null の行を「実行中のタイマー」として扱う設計です。ブラウザを閉じても開始時刻をDBから復元できます。"
      />
    </div>
  );
}
