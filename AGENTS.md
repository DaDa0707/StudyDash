<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

---

# StudyDash

学生向け学習ダッシュボード。仕様は `student_dashboard_spec_v0.1.docx`（§ 参照は仕様書の節番号）。
セットアップと設計の要点は README.md を参照。

## 進め方

仕様書 §13 のフェーズ単位で実装する。各フェーズで「実装 → テスト → 動作確認 → コミット」を
完了してから次へ進む。**指示なく次のフェーズへ進まないこと。**

現在 Phase 6（通知・PWA・仕上げ）まで完了。

## 守るべきルール（§14.1）

- `any` を安易に使わない
- 秘密鍵をクライアントへ埋め込まない。`SUPABASE_SERVICE_ROLE_KEY` は
  `src/lib/supabase/admin.ts` からのみ使う
- `.env.example` を更新し、実値はコミットしない
- スキーマ変更は `supabase/migrations/` にマイグレーションを追加し、
  `src/types/database.ts` も合わせて更新する
- 主要なビジネスロジックにはテストを付ける（`npm test`）
- 画面追加時はモバイル幅（390px）を先に確認する。横スクロールを出さない（A-08）
- **Pro 判定は `src/lib/entitlements.ts` だけに書く。**
  画面側で `plan === "pro"` のような比較を書かない
- 時間割の計算（次の授業・重複判定）は `src/lib/timetable.ts` に置く。
  曜日は 1=月 … 7=日（ISO-8601 準拠）で統一する
- 日付・締切の計算は `src/lib/deadline.ts` に置く。
  「今日」「明日」はユーザーのタイムゾーンでの暦日で判定する（経過時間ではない）
- Free 上限は必ず Server Action の中でも確認する。画面側の非表示だけに頼らない
- タイマーの経過時間はサーバー側の時刻で確定させる。
  クライアントから秒数を受け取らない（`src/lib/timer.ts`）
- `subscriptions` を書き換えてよいのは、署名検証を通った Webhook だけ
  （`src/lib/stripe/sync.ts`）。画面や通常の Server Action から書かない
- 課金状態から権限を導く計算は `src/lib/billing.ts` に置く
- サービスワーカーはページや API をキャッシュしない。
  古い締切を見せないため、オフライン時の案内だけを担う
- PWA アイコンは `node scripts/generate-icons.mjs` で再生成する

## データアクセス

- 新しいテーブルは必ず `user_id` で所有者を紐付け、RLS を有効化する（§9）
- 権限判定の材料は `subscriptions.entitlement` のみ。`profiles.plan` は表示用キャッシュ
- Server Component / Server Action からは `src/lib/supabase/server.ts` の
  `createClient()` をリクエストごとに生成して使う

