"use client";

import { Loader2 } from "lucide-react";
import type { ComponentProps } from "react";
import { useFormStatus } from "react-dom";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/** 送信中は無効化し、処理中であることを明示する（§11 保存フィードバック） */
export function SubmitButton({
  children,
  className,
  ...props
}: ComponentProps<typeof Button>) {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      disabled={pending}
      aria-busy={pending}
      className={cn("h-11 w-full text-base", className)}
      {...props}
    >
      {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
      {children}
    </Button>
  );
}
