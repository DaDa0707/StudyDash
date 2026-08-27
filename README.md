# StudyDash

学生向け学習ダッシュボード。次の授業・締切・今日のTodo・勉強時間を1画面で確認できる Web アプリ（PWA 対応予定）。

仕様書：`student_dashboard_spec_v0.1.docx` — 本 README の節番号（§）はすべて仕様書を指す。

---

## 現在の進捗：Phase 5 完了

仕様書 §13 のフェーズ区分に沿って、Phase 単位で実装する。

| Phase | 範囲 | 状態 |
| --- | --- | --- |
| 1 | プロジェクト基盤・Auth・DB・RLS・基本レイアウト | ✅ 完了 |
| 2 | 時間割・科目（CRUD + 次の授業表示） | ✅ 完了 |
| 3 | 課題・Todo（CRUD + ホーム集約） | ✅ 完了 |
| 4 | タイマー・履歴（記録保存 + 今日/今週集計） | ✅ 完了 |
| 5 | Pro 権限・課金（Free 上限 + entitlement 判定） | ✅ 完了 |
| 6 | 通知・PWA・仕上げ | 未着手 |
| 7 | 公開・計測 | 未着手 |

Phase 6 以降で実装する機能には、アプリ内に「Phase N」のプレースホルダを表示している。

---

## 技術構成

仕様書 §7 の採用候補どおり。

| 領域 | 採用 |
| --- | --- |
| フロントエンド | Next.js 16（App Router）+ TypeScript |
| UI | Tailwind CSS v4 + shadcn/ui |
| バックエンド/DB | Supabase（PostgreSQL / Auth / RLS） |
| テスト | Vitest |

---

## セットアップ

### 1. Supabase プロジェクトを用意する

[supabase.com](https://supabase.com) でプロジェクトを作成する（無料枠で可）。

### 2. 環境変数を設定する

```bash
cp .env.example .env.local
```

`.env.local` に Supabase の値を入れる（Project Settings → API）。

| 変数 | 用途 |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | プロジェクト URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key（ブラウザへ配信される） |
| `SUPABASE_SERVICE_ROLE_KEY` | サーバー専用。RLS をバイパスするため絶対にクライアントへ渡さない |
| `NEXT_PUBLIC_SITE_URL` | 認証メールのリダイレクト先。ローカルは `http://localhost:3000` |

`.env.local` は Git 管理外。実値をコミットしないこと（§14.1）。

### 3. マイグレーションを適用する

Supabase ダッシュボードの **SQL Editor** に `supabase/migrations/0001_init.sql` の内容を貼って実行する。

Supabase CLI を使う場合：

```bash
supabase db push
```

### 4. 認証設定を確認する

Supabase ダッシュボード → Authentication → URL Configuration で、
Redirect URLs に `http://localhost:3000/auth/confirm` を追加する。

### 5. 起動する

```bash
npm install && npm run dev
```

Supabase だけ設定すれば、課金以外のすべての機能が動く。

### 6.（任意）Stripe を設定する

未設定でもアプリは動き、Pro ページが「準備中」と表示される。

1. [Stripe ダッシュボード](https://dashboard.stripe.com)で商品「StudyDash Pro」を作り、
   月額と年額の価格を追加する。**金額はコードに書かず、Stripe 側の設定を読み出して表示する。**
2. 価格 ID（`price_...`）とシークレットキーを `.env.local` に入れる。
3. ローカルで Webhook を受けるには Stripe CLI を使う。

```bash
stripe listen --forward-to localhost:3000/api/stripe/webhook
```

表示された `whsec_...` を `STRIPE_WEBHOOK_SECRET` に設定する。
本番では Stripe ダッシュボードの Webhook 設定で
`https://<本番ドメイン>/api/stripe/webhook` を登録し、次のイベントを購読する。

- `checkout.session.completed`
- `customer.subscription.created`
- `customer.subscription.updated`
- `customer.subscription.deleted`

---

## コマンド

| コマンド | 内容 |
| --- | --- |
| `npm run dev` | 開発サーバー |
| `npm run build` | 本番ビルド |
| `npm test` | Vitest 実行 |
| `npm run typecheck` | 型チェック |
| `npm run lint` | ESLint |

---

## 設計上の要点

### 権限判定は1か所に集約する（§14.1）

Pro 判定は [`src/lib/entitlements.ts`](src/lib/entitlements.ts) だけに置く。
画面側で `plan === "pro"` のような比較を書かず、必ず `can()` / `checkQuota()` / `limitsFor()` を通す。

```ts
const quota = checkQuota(entitlement, "openAssignments", openCount);
if (!quota.allowed) {
  // A-06: 追加操作を止めて Pro 案内を出す
}
```

### 権限の正はサーバー側（§7）

権限の判定材料は `subscriptions.entitlement` のみ。
`profiles.plan` は表示用のキャッシュであり、判定には使わない。

サーバーからの取得は [`src/lib/entitlements.server.ts`](src/lib/entitlements.server.ts) の `getEntitlement()` を使う。
取得に失敗した場合は `free` に倒す。

### 所有権と RLS（§9）

全ユーザーデータは `user_id` で所有者を紐付け、全テーブルで RLS を有効化している。
UI 側の非表示だけに頼らない。

- `subscriptions` は本人でも **読み取りのみ**。書き込みは署名検証済み Webhook（`service_role`）だけが行う。
- `auth.users` の削除で作成データが連鎖削除されるよう、FK に `ON DELETE CASCADE` を設定している（A-10）。

### タイマーの復元（§5.3）

`study_sessions` は `ended_at IS NULL` の行を「実行中のタイマー」として扱う。
実行中の行はユーザーごとに最大1件（部分ユニークインデックス）。

一時停止を挟んだ実勉強秒数を復元するため、`0002_study_session_pause.sql` で
計測状態そのものを DB に持たせている。

| 状態 | `ended_at` | `segment_started_at` |
| --- | --- | --- |
| 計測中 | null | 現在の区間の開始時刻 |
| 一時停止 | null | null |
| 終了済み | 終了時刻 | null |

実勉強秒数 = `accumulated_sec` + 計測中区間の経過秒数。
一時停止のたびに区間が `accumulated_sec` へ畳み込まれるので、
ブラウザを閉じても DB の値だけで正しく再開できる。

経過時間の確定は**すべてサーバー側の時刻**で行う。クライアントから秒数は受け取らない。
表示だけは端末で毎秒描き直すが、サーバー時刻との差を測って補正している。

### 時間割の重複（§5.1）

同一曜日・同一時限の重複登録は「警告するが保存は許可する」ため、`class_sessions` に一意制約を張っていない。
重複検出は `findSlotConflicts()` で行い、フォーム上で警告だけ出して保存はそのまま通す。

### 締切の表示（§5.2）

[`src/lib/deadline.ts`](src/lib/deadline.ts) の `describeDueDate()` に集約している。
期限切れ・今日・明日・あとN日を返し、期限切れと今日だけ警告色を付ける（§11）。

**仕様書との差**：仕様書は「24時間以内は今日、48時間以内は明日」と書いているが、
経過時間で判定すると 23:00 に翌朝の締切が「今日」と表示されてしまう。
「今日」「明日」は暦の言葉なので、ユーザーのタイムゾーンでの**暦日差**で判定している。

日付のみで登録された締切（`due_all_day`）は、その日の 23:59 を指す瞬間として保存する。
これにより期限切れ判定は `now > due_at` の一本で済む。

### 課金と権限（§7 / §9 / A-07）

権限の正は `subscriptions.entitlement` の1列だけ。`profiles.plan` は表示用キャッシュで、
判定には使わない。

- **書き込めるのは Webhook だけ。** `subscriptions` に INSERT/UPDATE の RLS ポリシーは無く、
  本人でも書き換えられない。更新は署名検証を通った Webhook から
  `service_role` で行う（[`src/lib/stripe/sync.ts`](src/lib/stripe/sync.ts)）。
- **署名を検証してから読む。** 検証に失敗したリクエストは中身を一切見ずに 400 を返す。
- **保存値をそのまま信じない。** [`effectiveEntitlement()`](src/lib/billing.ts) が
  保存済みの entitlement と課金状態を突き合わせ、制限が強いほうを採る。
  Webhook を取りこぼしても Pro が残り続けない（猶予3日）。
- **カード情報はアプリを通らない。** 決済は Stripe のホスト画面で行う（§9）。

決済から戻った直後は Webhook がまだ届いていないことがあるため、
`/pro?checkout=success` で Stripe から取り直して反映する（§10.2 手順6）。

### Free 上限の適用（§6 / A-06）

課題20件・Todo30件の上限は、作成前に **Server Action の中で**確認している
（§7「課金権限はフロントだけで判定しない」）。画面側は `checkQuota()` の結果を使って
追加ボタンを隠し、案内を出すだけで、判定そのものは持たない。

### 「次の授業」の判定（§5.1）

[`src/lib/timetable.ts`](src/lib/timetable.ts) の `findCurrentOrNextClass()` に集約している。
時間割は週次で繰り返すため、週をまたいで巡回して最も近い開始時刻を探す。
授業中はその授業を `inProgress: true` で返し、ホームでは「今の授業」として表示する。

曜日は ISO-8601 準拠で 1=月 … 7=日。判定はユーザーのタイムゾーンで行う。

---

## ディレクトリ構成

```
src/
  app/
    (app)/            ログイン後の画面。下部ナビ付きシェル
      timetable/      S-04 週表示・授業の追加/編集
      subjects/       科目の一覧・追加/編集
      assignments/    S-05 課題の一覧・追加/編集
      todos/          S-06 Todo（今日/今週/完了済み）
      timer/          S-07 勉強タイマー
      analytics/      S-08 分析・学習履歴
      pro/            S-10 機能比較・購入/管理
    api/stripe/       Stripe Webhook（署名検証）
    (auth)/           ログイン・登録・パスワード再設定
    auth/             メールリンクの着地点、ログアウト
    onboarding/       S-01 初回設定
  components/
    form/             ラベル・エラー・送信ボタンの共通部品
    nav/              下部ナビ（§11）
    theme/            ライト/ダーク切り替え（F-09）
  lib/
    actions/          Server Actions
    queries/          Server Component からの読み取り
    supabase/         クライアント生成（browser / server / admin / proxy）
    entitlements.ts   Free/Pro 判定（唯一の実装）
    timetable.ts      次の授業・重複判定（純粋関数）
    deadline.ts       締切表示・タイムゾーン計算（純粋関数）
    assignments.ts    課題の並べ替え（純粋関数）
    todos.ts          Todo の区分け（純粋関数）
    timer.ts          タイマーの状態・経過秒数（純粋関数）
    study-stats.ts    学習履歴の集計（純粋関数）
    billing.ts        課金状態から権限を導く（純粋関数）
    stripe/           Stripe クライアント・価格取得・同期
  types/database.ts   DB スキーマの型
supabase/migrations/  スキーマと RLS
```

---

## 開発ルール（§14.1）

- TypeScript の `any` を安易に使わない
- 秘密鍵をクライアントへ埋め込まない
- `.env.example` を更新し、実値は Git へコミットしない
- DB マイグレーションをコード管理する
- 主要なビジネスロジックにはテストを付ける
- 画面追加時はモバイル表示を先に確認する
- Pro 判定ロジックを1か所に集約し、画面ごとに重複実装しない
