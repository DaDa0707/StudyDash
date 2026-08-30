# 公開手順（仕様書 §13 Phase 7）

Vercel + Supabase + Stripe で本番環境を用意する手順。

ここに書いてある操作は**アカウントの所有者が行う**必要がある。

---

## 1. Supabase：本番プロジェクト

開発で使っているプロジェクトをそのまま本番にしない。別に作る。

1. 新しいプロジェクトを作る（リージョンは利用者に近い場所。日本なら Tokyo）
2. `.env.production.local` などに接続情報を控える
3. マイグレーションを流す

```bash
SUPABASE_DB_URL='<本番の Session pooler URI>' npm run migrate
```

4. 適用結果を確認する

```bash
NEXT_PUBLIC_SUPABASE_URL='<本番URL>' \
NEXT_PUBLIC_SUPABASE_ANON_KEY='<本番anon>' \
SUPABASE_SERVICE_ROLE_KEY='<本番service_role>' \
npm run verify:db
```

19件すべて PASS することを確認する。

### 認証の設定

**Authentication → URL Configuration**

| 項目 | 値 |
| --- | --- |
| Site URL | `https://<本番ドメイン>` |
| Redirect URLs | `https://<本番ドメイン>/auth/confirm` |

**Confirm email は本番では必ず有効にする**（開発で切っていた場合）。

### メール送信（重要）

Supabase の内蔵メールは**1時間に数通**しか送れない。
自分ひとりで試すぶんにも足りず、続けて登録するとすぐ
`over_email_send_rate_limit` で弾かれる。

#### 一時的に確認メールを使わずに進める

動作を見たいだけの段階なら、**Authentication → Sign In / Providers → Email** の
「Confirm email」をオフにする。登録した瞬間にログイン状態になる。

**他の人に使ってもらう前には必ず戻すこと。** オフのままだと、
他人のメールアドレスで勝手にアカウントを作れてしまう。

#### 本番で使うには SMTP を設定する

**Authentication → Emails → SMTP Settings** で自前の送信元を設定する。
無料枠のある [Resend](https://resend.com) が手軽。

1. Resend でアカウントを作り、送信元にするドメインを登録する
   （独自ドメインが無ければ、検証用の共有ドメインでも始められる）
2. API キーを発行する
3. Supabase の SMTP Settings に入れる

| 項目 | 値 |
| --- | --- |
| Host | `smtp.resend.com` |
| Port | `465` |
| Username | `resend` |
| Password | Resend の API キー |
| Sender email | 検証済みドメインのアドレス |
| Sender name | `StudyDash` |

設定後、**Authentication → Rate Limits** で送信上限を必要な値まで上げる。
内蔵メールの上限のまま残っていることがある。

#### 確認：メールを1通も使わずに設定を検証する

送信せずにリンクの生成だけを試せる。

```js
// admin クライアントで
const { data } = await admin.auth.admin.generateLink({
  type: "signup", email, password,
  options: { redirectTo: "https://<本番ドメイン>/auth/confirm?next=/onboarding" },
});
console.log(data.properties.action_link);
```

`redirect_to` が本番ドメインになっていれば、URL Configuration は正しい。
localhost になっていたら Site URL / Redirect URLs を見直す。

#### 届かなかったときの導線

アプリ側には**確認メールの再送**を用意してある。

- 登録直後の画面 →「確認メールが届かない場合」
- ログインで「メールアドレスの確認が完了していません」と出たとき

送信の可否でアカウントの有無が分からないよう、結果に関わらず同じ文言を返す。

---

## 2. Stripe：本番の商品と価格

1. テストモードで一通り動作を確認してから本番モードへ切り替える
2. 商品「StudyDash Pro」を作り、月額と年額の価格を追加する
3. 価格 ID（`price_...`）を控える

金額はコードに書かない。ここで設定した値をアプリが読み出す。

### Webhook

**Developers → Webhooks** でエンドポイントを追加する。

| 項目 | 値 |
| --- | --- |
| URL | `https://<本番ドメイン>/api/stripe/webhook` |
| イベント | `checkout.session.completed`<br>`customer.subscription.created`<br>`customer.subscription.updated`<br>`customer.subscription.deleted` |

表示された署名シークレット（`whsec_...`）を控える。

---

## 3. Vercel：デプロイ

1. リポジトリを push する
2. Vercel で **Add New → Project** からリポジトリを選ぶ
3. Framework は Next.js が自動検出される。ビルド設定は変更不要
4. 環境変数を入れる（下表）
5. Deploy

### 環境変数

Production / Preview の両方に設定する。**Preview には本番の値を入れない**
（プレビュー環境から本番 DB を触れてしまう）。

| 変数 | 値 | 備考 |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | 本番の Project URL | |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | 本番の公開キー | |
| `SUPABASE_SERVICE_ROLE_KEY` | 本番の秘密キー | **Sensitive にする** |
| `NEXT_PUBLIC_SITE_URL` | `https://<本番ドメイン>` | 認証メールと決済の戻り先 |
| `STRIPE_SECRET_KEY` | `sk_live_...` | **Sensitive にする** |
| `STRIPE_WEBHOOK_SECRET` | `whsec_...` | **Sensitive にする** |
| `STRIPE_PRICE_MONTHLY` | `price_...` | |
| `STRIPE_PRICE_YEARLY` | `price_...` | |
| `NEXT_PUBLIC_POSTHOG_KEY` | PostHog の API キー | 計測を使う場合のみ |
| `NEXT_PUBLIC_POSTHOG_HOST` | リージョンに応じた URL | 未設定なら US |
| `NEXT_PUBLIC_COMMIT_SHA` | `$VERCEL_GIT_COMMIT_SHA` | 版の表示に使う |

`SUPABASE_DB_URL` は Vercel に入れない。マイグレーション専用で、
アプリ本体は参照しない。

### ドメイン

独自ドメインを設定したら、`NEXT_PUBLIC_SITE_URL`・Supabase の Redirect URLs・
Stripe の Webhook URL を**すべて**そのドメインに揃える。
どれか1つが古いままだと、認証メールや決済後の戻りが壊れる。

---

## 4. 公開前の確認

- [ ] `npm run verify:db` が本番プロジェクトで19件 PASS する
- [ ] 本番ドメインで登録 → 確認メールが**届く**
- [ ] 確認リンクからオンボーディングへ進める
- [ ] 課題・Todo・タイマーがひととおり動く
- [ ] Stripe テストカードではなく**本番カード**で少額決済 → Pro になる → 解約できる
- [ ] `https://<本番ドメイン>/manifest.webmanifest` が返る
- [ ] スマートフォンで「ホーム画面に追加」できる（HTTPS が必要）
- [ ] 390px で横スクロールが出ない

### セキュリティヘッダの確認

```bash
curl -sI https://<本番ドメイン>/ | grep -iE "x-frame|x-content|referrer|permissions"
```

4つとも返ることを確認する。

---

## 5. 計測（§7）

`NEXT_PUBLIC_POSTHOG_KEY` を設定すると有効になる。未設定なら何も送らない。

送っているイベントは [`src/lib/analytics.ts`](../src/lib/analytics.ts) の
`ANALYTICS_EVENTS` がすべて。ここに無いものは送れない。

**課題のタイトルや Todo の内容といった、利用者が書いた文章は送らない。**
`sanitizeProperties()` が、あらかじめ決めた語彙以外の文字列を落とす。

### 見るとよい指標

| 知りたいこと | 使うイベント |
| --- | --- |
| 登録した人が使い始めるか | `signed_up` → `onboarding_completed` |
| 中心体験に届いているか | `assignment_created` / `timer_finished` |
| 無料上限が課金につながるか | `quota_reached` → `pro_page_viewed` → `checkout_started` |

---

## 6. フィードバック

アプリ内の「その他 → ご意見・ご要望」から `feedback` テーブルに入る。
外部サービスは使っていない。

運営側で読むには Supabase の SQL Editor で：

```sql
select created_at, category, message, page_path, app_version
from public.feedback
order by created_at desc
limit 50;
```

本人は自分が送った分だけ参照できる（RLS）。更新と削除はできない。

---

## 未対応（公開後の課題）

- **プッシュ通知の配信**：受信側は用意済みだが、締切を見て push を送る
  スケジューラが無い。Supabase の Edge Function + pg_cron などで追加する
- **CSP**：`next.config.ts` にまだ入れていない。nonce の扱いを詰めてから入れる
- **バックアップ**：Supabase の自動バックアップは有料プランから。
  無料プランで運用するなら定期エクスポートを別途用意する
