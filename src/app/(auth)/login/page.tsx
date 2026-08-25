import type { Metadata } from "next";
import Link from "next/link";

import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "ログイン" };

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const params = await searchParams;
  const next = typeof params.next === "string" ? params.next : undefined;
  const linkInvalid = params.error === "link_invalid";

  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">おかえりなさい</h1>
        <p className="text-sm text-muted-foreground">
          メールアドレスとパスワードでログインします。
        </p>
      </div>

      {linkInvalid ? (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2.5 text-sm text-destructive">
          リンクが無効か、有効期限が切れています。もう一度お試しください。
        </p>
      ) : null}

      <LoginForm next={next} />

      <div className="space-y-2 text-center text-sm">
        <p>
          <Link href="/reset-password" className="text-muted-foreground underline underline-offset-4">
            パスワードを忘れた場合
          </Link>
        </p>
        <p className="text-muted-foreground">
          アカウントがない場合は{" "}
          <Link href="/signup" className="font-medium text-foreground underline underline-offset-4">
            新規登録
          </Link>
        </p>
      </div>
    </div>
  );
}
