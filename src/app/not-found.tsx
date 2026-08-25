import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <div className="flex min-h-dvh flex-col items-center justify-center gap-4 px-5 text-center">
      <h1 className="text-lg font-semibold">ページが見つかりません</h1>
      <Button
        render={<Link href="/home" />}
        nativeButton={false}
        className="h-11 px-6 text-base"
      >
        ホームへ戻る
      </Button>
    </div>
  );
}
