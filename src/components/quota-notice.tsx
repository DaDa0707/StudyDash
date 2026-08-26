import { Sparkles } from "lucide-react";

import type { QuotaCheck } from "@/lib/entitlements";

/**
 * Free 上限に達したときの案内（§12 A-06）。
 * 判定は entitlements.ts の checkQuota が行い、ここは表示だけを担う。
 */
export function QuotaNotice({ quota, message }: { quota: QuotaCheck; message: string }) {
  if (!quota.shouldUpsell) return null;

  return (
    <div
      role="status"
      className="flex items-start gap-2 rounded-xl bg-amber-500/10 p-4 text-sm text-amber-800 dark:text-amber-300"
    >
      <Sparkles className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        <p>{message}</p>
        <p className="mt-1 text-xs opacity-80">
          完了済みにするか削除すると、また追加できます。
        </p>
      </div>
    </div>
  );
}
