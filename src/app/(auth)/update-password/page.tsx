import type { Metadata } from "next";

import { UpdatePasswordForm } from "./update-password-form";

export const metadata: Metadata = { title: "新しいパスワード" };

export default function UpdatePasswordPage() {
  return (
    <div className="space-y-6">
      <div className="space-y-1.5">
        <h1 className="text-2xl font-bold tracking-tight">新しいパスワード</h1>
        <p className="text-sm text-muted-foreground">
          新しいパスワードを設定するとログイン状態になります。
        </p>
      </div>

      <UpdatePasswordForm />
    </div>
  );
}
