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

**StudyDash は App Store 経由の iOS / iPad アプリとしてのみ配布する。**
ブラウザで使う画面は作らない。`src/` に残しているのは紹介ページと規約、
それに Supabase が送るメールのリンクが着地する場所だけ。

Phase 1〜7 まで完了。DB 層の自動検証は `npm run verify:db`。
未実装はプッシュ通知の配信。App 内課金はコードは通っているが、
App Store Connect への登録と Sandbox での確認が残っている。

## 守るべきルール（§14.1）

- `any` を安易に使わない
- 秘密鍵をクライアントへ埋め込まない。`SUPABASE_SERVICE_ROLE_KEY` は
  `src/lib/supabase/admin.ts` からのみ使う
- `.env.example` を更新し、実値はコミットしない
- スキーマ変更は `supabase/migrations/` にマイグレーションを追加し、
  `core/database.ts` も合わせて更新する
- 主要なビジネスロジックにはテストを付ける（`npm test`）
- **Pro 判定は `core/entitlements.ts` だけに書く。**
  画面側で `plan === "pro"` のような比較を書かない
- 時間割の計算（次の授業・重複判定）は `core/timetable.ts` に置く。
  曜日は 1=月 … 7=日（ISO-8601 準拠）で統一する
- 日付・締切の計算は `core/deadline.ts` に置く。
  「今日」「明日」はユーザーのタイムゾーンでの暦日で判定する（経過時間ではない）
- Free 上限は画面・書き込み処理・DB の3か所で確認する。
  上限値の正は `core/entitlements.ts`。DB 側は `plan_limit()` がその写しを持ち、
  トリガーが件数を止める（`0005_free_limits.sql`）。
  ズレは `npm run verify:db` が突き合わせて検出する
- タイマーの経過時間はサーバー側の時刻で確定させる。
  クライアントから秒数を受け取らない（計算は `core/timer.ts`）。
  Web は Server Action の中の `new Date()` でよいが、iOS 版にその層は無い。
  アプリからは `start/pause/resume/finish_study_session` を呼び、
  時刻は DB の `now()` から採る（`0004_study_session_rpc.sql`）
- **`subscriptions` を書き換えてよいのは、署名検証を通ったサーバー側の経路だけ。**
  RLS に書き込みポリシーは無く、アプリからは書けない（意図どおり）。
  課金は App 内課金の一本のみ。Web での決済は行わない
- **iOS では App 内課金以外の購入手段へ誘導しない**（App Store 規約 3.1.1）
- **アプリは購入の可否を判断しない。** Apple が署名した取引をサーバーへ渡し、
  権限を与えてよいかはサーバーだけが決める。検証が通ってから
  finishTransaction を呼ぶ（逆にすると払ったのに反映されない事故になる）
- 課金状態から権限を導く計算は `core/billing.ts` に置く
- スキーマ変更は `npm run migrate` で適用する（`SUPABASE_DB_URL` が必要）
- **計測に利用者が書いた文章を混ぜない。** イベントは `core/analytics.ts` の
  `ANALYTICS_EVENTS` に足し、値は `ALLOWED_STRING_VALUES` を通るものだけにする

## 構成

```
core/       アプリと Web が共有する純粋ロジック（＋テスト）
mobile/     iOS / iPad アプリ（Expo / React Native）— 製品の本体
src/        紹介ページ・規約・メールのリンク着地点だけの Next.js
supabase/   スキーマとマイグレーション
```

`src/` に残っているルートは5つだけ。増やさないこと。

| ルート | 役目 |
|---|---|
| `/` | 紹介と App Store への導線 |
| `/terms`・`/privacy` | 規約とプライバシーポリシー（審査に必須） |
| `/auth/confirm` | メール確認・再設定リンクの着地点 |
| `/update-password` | 再設定メールから新しいパスワードを入れる |

**`core/` には React も Next.js も Supabase も持ち込まない。** ブラウザ専用 API
（`window` / `localStorage`）も Node 専用 API（`process` / `require`）も使わない。
どちらのプラットフォームからも同じコードが動くことが唯一の条件。
外部依存は zod だけ（`core/validation/`）。増やすときはこの条件で判断する。

入力の検証は `core/validation/` に置く。エラー文言もここに一本化し、
web と iOS で同じものを出す。フォームの結果型は `core/form.ts`。

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

