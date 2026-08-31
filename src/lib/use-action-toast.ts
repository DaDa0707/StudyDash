"use client";

import { useEffect, useRef } from "react";
import { toast } from "sonner";

import type { FormState } from "@core/form";

/**
 * 画面に表示欄を持たない操作（一覧のチェックボックスなど）の結果をトーストで伝える。
 * §11「保存時は明確な成功/失敗フィードバックを表示」。
 */
export function useActionToast(state: FormState, options?: { silentOnSuccess?: boolean }) {
  const silentOnSuccess = options?.silentOnSuccess ?? false;
  const lastShown = useRef<FormState | null>(null);

  useEffect(() => {
    if (state === lastShown.current) return;
    lastShown.current = state;

    if (state.status === "error" && state.message) {
      toast.error(state.message);
      return;
    }

    if (state.status === "success" && state.message && !silentOnSuccess) {
      toast.success(state.message);
    }
  }, [state, silentOnSuccess]);
}
