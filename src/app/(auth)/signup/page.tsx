import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "./signup-form";

export const metadata: Metadata = { title: "新規登録" };

export default function SignUpPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">無料で始める</h1>
        <p className="text-sm text-muted-foreground">
          必要なのはメールアドレスとパスワードだけです。
        </p>
      </div>

      <SignUpForm />

      <p className="text-center text-xs leading-relaxed text-muted-foreground">
        登録すると{" "}
        <Link href="/terms" className="underline underline-offset-4 hover:text-foreground">
          利用規約
        </Link>{" "}
        と{" "}
        <Link href="/privacy" className="underline underline-offset-4 hover:text-foreground">
          プライバシーポリシー
        </Link>{" "}
        に同意したものとみなします。
      </p>

      <p className="text-center text-sm text-muted-foreground">
        すでにアカウントをお持ちの場合は{" "}
        <Link href="/login" className="font-medium text-foreground underline underline-offset-4">
          ログイン
        </Link>
      </p>
    </div>
  );
}
