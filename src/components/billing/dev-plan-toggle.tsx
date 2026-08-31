"use client";

import { useActionState } from "react";

import { FormMessage } from "@/components/form/form-message";
import { SubmitButton } from "@/components/form/submit-button";
import { toggleProForDevAction } from "@/lib/actions/billing";
import { idleFormState } from "@core/form";

/**
 * 開発用のプラン切り替え。
 * Stripe を設定しなくても Pro の見え方を確認できるようにするためのもので、
 * Server Action 側で本番環境では拒否している。
 */
export function DevPlanToggle({ isPro }: { isPro: boolean }) {
  const [state, formAction] = useActionState(toggleProForDevAction, idleFormState);

  return (
    <form action={formAction} className="space-y-2">
      <SubmitButton variant="outline" className="text-sm">
        開発用：{isPro ? "Freeに戻す" : "Proにする"}
      </SubmitButton>
      <FormMessage state={state} />
    </form>
  );
}
