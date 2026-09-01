# Pro の価格

決めたこと（2026-08-31）: **月額 300円**。年額は当面つくらない。

**課金は App 内課金の一本だけ。** Web での決済はやめた（2026-09-01）。
StudyDash は App Store 経由のアプリとしてのみ配布するため、
決済経路が2つあると二重課金が起こりうる。Stripe の実装は削除済み。

金額はコードに書かない（仕様書 §6）。App Store Connect の設定を読む。

## 手取り

| 経路 | 手数料 | 手取り（1件あたり） |
|---|---|---|
| App内課金・小規模事業者プログラム 15% | 45円 | 255円 |
| App内課金・通常の 30% | 90円 | 210円 |

**小規模事業者プログラム（App Store Small Business Program）に申請すること。**
年間収益 100万ドル未満なら 15% になる。申請しないと 30% のままで、
手取りが 210円まで落ちる。申請は App Store Connect から行う。

## 設定する場所

### App Store Connect

1. 自動更新サブスクリプションをつくり、価格を 300円にする
2. 小規模事業者プログラムに申請する
3. アプリに StoreKit を組み込む（**未実装**）

商品 ID は `core/products.ts` が持つ。App Store Connect と
`mobile/StudyDash.storekit` で同じ値を使うこと。

## まだできていないこと

- **App 内課金が未実装。** `subscriptions.provider` に `'apple'` は用意してあり、
  状態の変換（`core/billing.ts` の `normalizeAppleStatus`）まではできている。
  残るのは StoreKit の組み込みと、購入を検証して `subscriptions` へ書き込む経路。
  書き込んでよいのは署名検証を通った通知だけにする（§14.1）

Free 上限の DB 側での強制は済んだ（`0005_free_limits.sql`）。
