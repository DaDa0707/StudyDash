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

## App 内課金の作り

    アプリ            購入する。判断はしない
      ↓ 署名済みの取引
    /api/apple/verify  購入直後の反映（通知を待たない）
    /api/apple/notifications  更新・解約・返金
      ↓ 署名検証を通ったものだけ
    subscriptions      service_role でのみ書き込む
      ↓
    core/billing.ts    状態から権限を導く

**アプリは「買えたから Pro にする」という判断をしない。** Apple が署名した
取引をサーバーへ渡すだけで、権限を与えてよいかはサーバーが決める。
検証が通ってから finishTransaction を呼ぶので、通らなければ取引はキューに
残り再試行できる。順序を逆にすると「払ったのに Pro にならず取引も消えた」
という状態になる。

利用者の特定は appAccountToken（購入時にアプリが user_id を入れる）。
それが載らない更新通知のためには originalTransactionId でも引ける。

## まだできていないこと

- **App Store Connect への登録。** アプリとサブスクリプションを作らないと
  Sandbox での確認ができない。ローカルの StoreKit 設定では購入画面までしか
  試せない（そこで出る署名は Apple のものではないため、サーバー検証は通らない）
- **Vercel の環境変数。** `APPLE_BUNDLE_ID` が無いと受け口が 503 を返す
- **小規模事業者プログラムの申請**（手数料 30% → 15%）

Free 上限の DB 側での強制は済んだ（`0005_free_limits.sql`）。
