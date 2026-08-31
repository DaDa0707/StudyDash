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

Phase 1〜7 まで完了。§12 A-01〜A-10 は実際の Supabase に接続して確認済み
（記録は `docs/acceptance.md`）。DB 層の自動検証は `npm run verify:db`。
本番デプロイは未実施（手順は `docs/deploy.md`）。

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
  クライアントから秒数を受け取らない（計算は `core/timer.ts`）。
  Web は Server Action の中の `new Date()` でよいが、iOS 版にその層は無い。
  アプリからは `start/pause/resume/finish_study_session` を呼び、
  時刻は DB の `now()` から採る（`0004_study_session_rpc.sql`）
- `subscriptions` を書き換えてよいのは、署名検証を通った Webhook だけ
  （`src/lib/stripe/sync.ts`）。画面や通常の Server Action から書かない
- 課金状態から権限を導く計算は `src/lib/billing.ts` に置く
- サービスワーカーはページや API をキャッシュしない。
  古い締切を見せないため、オフライン時の案内だけを担う
- PWA アイコンは `npm run icons` で再生成する
- スキーマ変更は `npm run migrate` で適用する（`SUPABASE_DB_URL` が必要）
- **計測に利用者が書いた文章を混ぜない。** イベントは `src/lib/analytics.ts` の
  `ANALYTICS_EVENTS` に足し、値は `ALLOWED_STRING_VALUES` を通るものだけにする

## 構成

```
core/       web と mobile が共有する純粋ロジック（＋テスト）
src/        Web 版（Next.js）
mobile/     iOS 版（Expo / React Native）
supabase/   スキーマとマイグレーション（両方が同じ DB を使う）
```

**`core/` には React も Next.js も Supabase も持ち込まない。** ブラウザ専用 API
（`window` / `localStorage`）も Node 専用 API（`process` / `require`）も使わない。
どちらのプラットフォームからも同じコードが動くことが唯一の条件。

参照は両方から `@core/xxx`。web は tsconfig の paths、mobile は
`mobile/metro.config.js` の `resolveRequest` で解決する
（Metro は `@` 始まりをスコープ付きパッケージとして扱うため、
`extraNodeModules` では解決できない）。

ロジックを足すときは `core/` に書き、テストも `core/__tests__/` に置く。
画面固有のものだけ `src/` か `mobile/` に置く。

## データアクセス

- 新しいテーブルは必ず `user_id` で所有者を紐付け、RLS を有効化する（§9）
- 権限判定の材料は `subscriptions.entitlement` のみ。`profiles.plan` は表示用キャッシュ
- Server Component / Server Action からは `src/lib/supabase/server.ts` の
  `createClient()` をリクエストごとに生成して使う

