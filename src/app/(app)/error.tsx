"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="space-y-4 py-12 text-center">
      <h1 className="text-lg font-semibold">読み込みに失敗しました</h1>
      <p className="text-sm text-muted-foreground">
        通信環境を確認して、もう一度お試しください。
      </p>
      <Button onClick={reset} className="h-11 px-6 text-base">
        再読み込み
      </Button>
    </div>
  );
}
