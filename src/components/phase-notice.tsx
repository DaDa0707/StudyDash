import { Hammer } from "lucide-react";

import { cn } from "@/lib/utils";

/**
 * 未実装フェーズのプレースホルダ。
 * Phase 1 では基盤のみを作るため、後続フェーズで埋める箇所を明示する。
 */
export function PhaseNotice({
  phase,
  title,
  description,
  className,
}: {
  phase: number;
  title: string;
  description: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "rounded-xl border border-dashed p-4 text-sm",
        className,
      )}
    >
      <div className="flex items-center gap-2">
        <Hammer className="size-4 text-muted-foreground" aria-hidden />
        <span className="font-medium">{title}</span>
        <span className="ml-auto rounded-full bg-muted px-2 py-0.5 text-[11px] text-muted-foreground">
          Phase {phase}
        </span>
      </div>
      <p className="mt-2 leading-relaxed text-muted-foreground">{description}</p>
    </div>
  );
}
