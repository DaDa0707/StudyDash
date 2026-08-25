import type { Metadata } from "next";
import Link from "next/link";

import { ResetPasswordForm } from "./reset-password-form";

export const metadata: Metadata = { title: "パスワード再設定" };

export default function ResetPasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">パスワード再設定</h1>
        <p className="text-sm text-muted-foreground">
          登録済みのメールアドレスへ再設定用のリンクを送ります。
        </p>
      </div>

      <ResetPasswordForm />

      <p className="text-center text-sm">
        <Link href="/login" className="text-muted-foreground underline underline-offset-4">
          ログインに戻る
        </Link>
      </p>
    </div>
  );
}
