import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, List, Section } from "@/components/legal/legal-page";
import { LEGAL, orUnset } from "@/lib/legal";

export const metadata: Metadata = {
  title: "プライバシーポリシー",
  description: "StudyDash が集める情報と、その使い方について。",
};

export default function PrivacyPage() {
  return (
    <LegalPage title="プライバシーポリシー" updatedAt={LEGAL.privacyUpdatedAt}>
      <Section title="はじめに">
        <p>
          {orUnset(LEGAL.operator)}（以下「運営者」）は、学習管理サービス「{LEGAL.serviceName}」
          （以下「本サービス」）において、利用者の情報を次のとおり扱います。
        </p>
        <p>
          本サービスは学習の記録を預かるものです。
          <strong className="text-foreground">
            必要のない情報は最初から集めない
          </strong>
          方針で作っています。学校名や本名の登録は求めません。
        </p>
      </Section>

      <Section title="1. 集める情報">
        <p className="font-medium text-foreground">登録時に入力していただくもの</p>
        <List
          items={[
            "メールアドレス（ログインと連絡に使います）",
            "パスワード（暗号化して保存されます。運営者が中身を見ることはできません）",
            "表示名（本名でなくてかまいません）",
            "学校の種類（中学生／高校生／大学生・専門学生／その他）",
          ]}
        />

        <p className="mt-4 font-medium text-foreground">本サービスを使う中で保存されるもの</p>
        <List
          items={[
            "科目（名前・色・先生名）",
            "時間割（曜日・時限・時刻・教室・メモ）",
            "課題（タイトル・締切・優先度・状態・メモ）",
            "Todo（内容・期限・完了状態）",
            "勉強タイマーの記録（開始・終了時刻・勉強時間・科目）",
            "通知の設定（受け取りの有無・タイミング・通知を控える時間帯）",
            "タイムゾーン（締切の判定に使います）",
            "ご意見・ご要望の内容（送信された場合のみ。種類・本文・送信元の画面・アプリの版）",
          ]}
        />

        {LEGAL.hasPaidPlan ? (
          <>
            <p className="mt-4 font-medium text-foreground">有料プランを使う場合</p>
            <List
              items={[
                "契約の状態と次回更新日",
                "決済事業者が発行する顧客ID・契約ID",
              ]}
            />
            <p>
              <strong className="text-foreground">
                クレジットカード番号などの決済情報を運営者が受け取ることも、保存することもありません。
              </strong>
              決済はStripe社の画面で行われ、同社が直接取り扱います。
            </p>
          </>
        ) : null}

        <p className="mt-4 font-medium text-foreground">集めないもの</p>
        <List
          items={[
            "本名、住所、電話番号、生年月日",
            "学校名、クラス、成績",
            "位置情報、連絡先、写真、カメラ・マイクへのアクセス",
          ]}
        />
      </Section>

      <Section title="2. 何に使うか">
        <List
          items={[
            "本サービスの提供（ログイン、データの表示と保存）",
            "締切のお知らせ",
            "不具合の調査と改善",
            "重要なお知らせの連絡",
            "利用状況の把握による改善（詳しくは「4. 利用状況の計測」）",
          ]}
        />
        <p>
          これ以外の目的には使いません。広告の配信や、第三者への販売は行いません。
        </p>
      </Section>

      <Section title="3. 誰に渡すか">
        <p>
          法令に基づく場合を除き、利用者の情報を第三者へ提供することはありません。
          ただし、本サービスを動かすために次の事業者を利用しています。
        </p>
        <List
          items={[
            <>
              <strong className="text-foreground">Supabase</strong>：データベースと認証。
              利用者のデータはここに保存されます（サーバーの所在地：日本）。
            </>,
            <>
              <strong className="text-foreground">Vercel</strong>：アプリの配信。
              アクセスログが一定期間保存されます。
            </>,
            LEGAL.hasPaidPlan ? (
              <>
                <strong className="text-foreground">Stripe</strong>：決済処理。
                有料プランを利用する場合のみ、同社が決済情報を取り扱います。
              </>
            ) : null,
            <>
              <strong className="text-foreground">メール配信事業者</strong>：確認メールや
              パスワード再設定メールの送信。
            </>,
          ].filter(Boolean)}
        />
      </Section>

      <Section title="4. 利用状況の計測">
        <p>
          どの機能がどれくらい使われているかを把握し、改善に役立てるため、
          操作の種類（登録した、タイマーを終えた、など）を記録することがあります。
        </p>
        <p>
          <strong className="text-foreground">
            課題のタイトルやTodoの内容など、利用者が書いた文章は送りません。
          </strong>
          送るのは操作の種類と、件数・時間のような数値だけです。
          この制限はプログラム側で機械的に守られており、決められた語以外の文字列は自動的に取り除かれます。
        </p>
      </Section>

      <Section title="5. 端末に保存されるもの">
        <p>
          ログイン状態を保つため、端末にCookieを保存します。これは本サービスの動作に必要なものです。
        </p>
        <p>
          このほか、テーマの設定や、一度閉じたお知らせを再表示しないための情報を、
          端末内（ローカルストレージ）に保存します。これらが運営者に送られることはありません。
        </p>
      </Section>

      <Section title="6. 保管期間と削除">
        <p>
          利用者のデータは、アカウントが存在する間、保管します。
        </p>
        <p>
          <strong className="text-foreground">アカウントを削除すると、</strong>
          登録した科目・時間割・課題・Todo・学習記録・通知設定・プロフィールは
          すべて削除され、元に戻せません。設定画面からいつでも手続きできます。
        </p>
        <p>
          ただし、法令で保存が義務づけられている記録（決済に関するものなど）は、
          必要な期間、決済事業者側に保管されることがあります。
        </p>
      </Section>

      <Section title="7. 安全のための対策">
        <List
          items={[
            "通信はすべて暗号化しています（HTTPS）。",
            "データベースには行単位のアクセス制御をかけており、他の利用者のデータを読み書きすることはできません。",
            "パスワードは暗号化して保存され、運営者を含め誰も元の文字列を見ることはできません。",
            "有料プランの権限は、決済事業者からの署名を検証した通知でのみ更新されます。",
          ]}
        />
      </Section>

      <Section title="8. 未成年の方へ">
        <p>
          本サービスは中学生・高校生の利用を想定しています。
          登録にあたって本名や学校名は必要ありません。
        </p>
        <p>
          有料プランを申し込む場合は、事前に保護者の方に相談してください。
          保護者の方から、お子さまのデータについて確認や削除のご依頼があった場合は、
          ご本人であることを確認したうえで対応します。
        </p>
      </Section>

      <Section title="9. 自分のデータについて">
        <p>
          利用者は、自分の情報について、内容の確認・訂正・削除を求めることができます。
        </p>
        <List
          items={[
            "表示名や学校の種類は、設定画面からご自身で変更できます。",
            "科目・課題・Todo・学習記録は、アプリ内で編集・削除できます。",
            "すべてのデータの削除は、設定画面の「アカウントの削除」から行えます。",
            "そのほかのご請求は、下記の問い合わせ先までご連絡ください。",
          ]}
        />
      </Section>

      <Section title="10. 改定">
        <p>
          このポリシーは、必要に応じて変更することがあります。
          変更した場合は、このページの最終改定日を更新します。
          利用者に大きく関わる変更は、アプリ内でお知らせします。
        </p>
      </Section>

      <Section title="11. お問い合わせ">
        <p>
          本ポリシーや個人情報の取り扱いについてのお問い合わせは、
          {orUnset(LEGAL.contactEmail)} までご連絡ください。
        </p>
        <p>
          利用規約は
          <Link href="/terms" className="font-medium text-foreground underline underline-offset-4">
            こちら
          </Link>
          をご覧ください。
        </p>
      </Section>
    </LegalPage>
  );
}
