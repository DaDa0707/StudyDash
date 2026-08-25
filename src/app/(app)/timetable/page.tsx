import type { Metadata } from "next";

import { PhaseNotice } from "@/components/phase-notice";

export const metadata: Metadata = { title: "時間割" };

export default function TimetablePage() {
  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold tracking-tight">時間割</h1>
      <PhaseNotice
        phase={2}
        title="週表示と授業の追加・編集"
        description="曜日・時限・科目・教室・色を登録する画面です。テーブル（subjects / class_sessions）とRLSはPhase 1で用意済みです。"
      />
    </div>
  );
}
