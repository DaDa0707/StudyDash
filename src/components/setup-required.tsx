import { Database } from "lucide-react";

/**
 * Supabase が未設定のときに、開発中だけ出す案内。
 *
 * 未設定のままログイン後の画面を開くと環境変数の読み出しで落ちるが、
 * 汎用のエラー画面では原因が分からないため、やることを直接示す。
 * 本番では proxy が起動時に止めるので、この画面は出ない。
 */
export function SetupRequired() {
  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-md flex-col justify-center gap-5 px-5 py-10">
      <span
        aria-hidden
        className="flex size-12 items-center justify-center rounded-2xl bg-muted text-muted-foreground"
      >
        <Database className="size-6" />
      </span>

      <div>
        <h1 className="text-xl font-bold tracking-tight">Supabase の設定が必要です</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          ログイン後の画面はデータベースに接続してから使えます。
        </p>
      </div>

      <ol className="space-y-3 text-sm">
        {[
          {
            title: "プロジェクトを作る",
            body: "supabase.com でプロジェクトを作成し、Project Settings → API から URL と各キーを控えます。",
          },
          {
            title: ".env.local を用意する",
            body: "cp .env.example .env.local を実行し、控えた値を入れます。",
          },
          {
            title: "マイグレーションを流す",
            body: "SQL Editor で supabase/migrations/ の 0001 → 0002 の順に実行します。",
          },
          {
            title: "開発サーバーを再起動する",
            body: "環境変数は起動時に読み込まれます。",
          },
        ].map((step, index) => (
          <li key={step.title} className="flex gap-3">
            <span
              aria-hidden
              className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold"
            >
              {index + 1}
            </span>
            <span className="min-w-0">
              <span className="block font-medium">{step.title}</span>
              <span className="mt-0.5 block text-muted-foreground">{step.body}</span>
            </span>
          </li>
        ))}
      </ol>

      <p className="rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
        手順の詳細は docs/acceptance.md、接続後の検証は npm run verify:db。
      </p>
    </div>
  );
}
