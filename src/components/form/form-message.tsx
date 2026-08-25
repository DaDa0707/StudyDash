import { CircleAlert, CircleCheck } from "lucide-react";

import type { FormState } from "@/lib/form";
import { cn } from "@/lib/utils";

/** Server Action の結果を表示する。エラーは role="alert" で読み上げる。 */
export function FormMessage({ state }: { state: FormState }) {
  if (state.status === "idle" || !state.message) return null;

  const isError = state.status === "error";
  const Icon = isError ? CircleAlert : CircleCheck;

  return (
    <p
      role={isError ? "alert" : "status"}
      className={cn(
        "flex items-start gap-2 rounded-lg px-3 py-2.5 text-sm",
        isError
          ? "bg-destructive/10 text-destructive"
          : "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400",
      )}
    >
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <span>{state.message}</span>
    </p>
  );
}
