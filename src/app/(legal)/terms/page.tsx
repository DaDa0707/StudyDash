import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, List, Section } from "@/components/legal/legal-page";
import { LEGAL, orUnset } from "@/lib/legal";

export const metadata: Metadata = {
  title: "利用規約",
  description: "StudyDash の利用規約です。",
};

export default function TermsPage() {
  return (
    <LegalPage title="利用規約" updatedAt={LEGAL.termsUpdatedAt}>
      <Section title="1. この規約について">
        <p>
          この規約は、{orUnset(LEGAL.operator)}（以下「運営者」）が提供する学習管理サービス
          「{LEGAL.serviceName}」（以下「本サービス」）の利用条件を定めるものです。
          本サービスを利用する方（以下「利用者」）は、この規約に同意したものとみなします。
        </p>
      </Section>

      <Section title="2. 利用できる方">
        <p>
          本サービスは、中学生・高校生・大学生をはじめとする学習者を想定しています。
          年齢による制限は設けていません。
        </p>
        <p>
          <strong className="text-foreground">未成年の方へ：</strong>
          有料プランを申し込む場合は、事前に保護者の同意を得てください。
          保護者の同意なく申し込まれた場合、取り消しを求められることがあります。
        </p>
      </Section>

      <Section title="3. アカウント">
        <List
          items={[
            "登録にはメールアドレスとパスワードが必要です。",
            "パスワードは自分だけが分かるものにし、他人に教えないでください。",
            "アカウントの管理は利用者の責任で行ってください。第三者に使われて生じた不利益について、運営者は責任を負いません。",
            "アカウントはいつでも削除できます。設定画面から手続きしてください。削除すると、登録したデータはすべて消えて元に戻せません。",
          ]}
        />
      </Section>

      <Section title="4. やってはいけないこと">
        <List
          items={[
            "他人になりすまして登録すること。",
            "他人のアカウントに不正にアクセスしようとすること。",
            "本サービスの仕組みを壊す、または過度な負荷をかける行為。",
            "法令に反する行為、または他人の権利を侵害する行為。",
            "運営者が不適切と判断する行為。",
          ]}
        />
        <p>
          これらに当たると判断した場合、事前の通知なくアカウントの利用を停止または削除することがあります。
        </p>
      </Section>

      {LEGAL.hasPaidPlan ? (
        <Section title="5. 有料プラン（Pro）">
          <List
            items={[
              "有料プランは月額または年額の自動更新です。解約するまで自動で更新されます。",
              "解約はいつでもできます。解約しても、支払い済みの期間が終わるまでは Pro の機能を使えます。",
              "日割りでの返金は行いません。",
              "料金や提供内容を変更する場合は、事前にアプリ内でお知らせします。",
              "決済はStripe社のシステムを通じて行われます。クレジットカード番号などの決済情報を運営者が受け取ることはありません。",
            ]}
          />
        </Section>
      ) : null}

      <Section title={LEGAL.hasPaidPlan ? "6. サービスの変更・停止" : "5. サービスの変更・停止"}>
        <p>
          運営者は、本サービスの内容を変更したり、提供を停止したりすることがあります。
          停止する場合は、可能な限り事前にお知らせします。
          ただし、緊急の場合は事前の通知なく停止することがあります。
        </p>
      </Section>

      <Section title={LEGAL.hasPaidPlan ? "7. 免責" : "6. 免責"}>
        <List
          items={[
            "本サービスは、締切や予定の管理を助けるものであり、提出忘れや遅刻がないことを保証するものではありません。最終的な確認は利用者自身で行ってください。",
            "通知が届かなかったことによる不利益について、運営者は責任を負いません。",
            "本サービスの不具合や停止によって生じた損害について、運営者は責任を負いません。ただし、運営者に故意または重大な過失がある場合を除きます。",
            "データのバックアップは利用者自身でも行うことをおすすめします。",
          ]}
        />
      </Section>

      <Section title={LEGAL.hasPaidPlan ? "8. 個人情報の取り扱い" : "7. 個人情報の取り扱い"}>
        <p>
          利用者の個人情報の扱いについては、
          <Link href="/privacy" className="font-medium text-foreground underline underline-offset-4">
            プライバシーポリシー
          </Link>
          に定めます。
        </p>
      </Section>

      <Section title={LEGAL.hasPaidPlan ? "9. 規約の変更" : "8. 規約の変更"}>
        <p>
          運営者は、必要に応じてこの規約を変更することがあります。
          変更した場合は、このページの最終改定日を更新し、重要な変更はアプリ内でお知らせします。
          変更後に本サービスを使い続けた場合、変更に同意したものとみなします。
        </p>
      </Section>

      <Section title={LEGAL.hasPaidPlan ? "10. 準拠法と管轄" : "9. 準拠法と管轄"}>
        <p>
          この規約は日本法に従って解釈されます。
          本サービスに関して紛争が生じた場合、運営者の所在地を管轄する裁判所を専属的合意管轄とします。
        </p>
      </Section>

      <Section title={LEGAL.hasPaidPlan ? "11. お問い合わせ" : "10. お問い合わせ"}>
        <p>
          本サービスや本規約についてのお問い合わせは、{orUnset(LEGAL.contactEmail)} までご連絡ください。
        </p>
      </Section>
    </LegalPage>
  );
}
