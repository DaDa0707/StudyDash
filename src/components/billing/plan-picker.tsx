"use client";

import { Check, ExternalLink } from "lucide-react";
import { useActionState, useState } from "react";
import { useFormStatus } from "react-dom";

import { useAnalytics } from "@/components/analytics/analytics-provider";
import { FormMessage } from "@/components/form/form-message";
import { Button } from "@/components/ui/button";
import { openBillingPortalAction, startCheckoutAction } from "@/lib/actions/billing";
import { idleFormState } from "@/lib/form";
import { cn } from "@/lib/utils";

export interface PlanOption {
  interval: "monthly" | "yearly";
  label: string;
  priceText: string;
  monthlyEquivalent: string | null;
}

function CheckoutButton() {
  const { pending } = useFormStatus();

  return (
    <Button type="submit" disabled={pending} className="h-12 w-full text-base">
      Proにする
    </Button>
  );
}

/** §10.2 手順3-4：月額/年額を選んで決済へ進む */
export function PlanPicker({ plans }: { plans: PlanOption[] }) {
  const [state, formAction] = useActionState(startCheckoutAction, idleFormState);
  const capture = useAnalytics();
  const [interval, setInterval] = useState<PlanOption["interval"]>(
    plans.find((p) => p.interval === "yearly")?.interval ?? plans[0]?.interval ?? "monthly",
  );

  return (
    <form
      action={(formData) => {
        capture("checkout_started", { interval });
        return formAction(formData);
      }}
      className="space-y-4"
    >
      <input type="hidden" name="interval" value={interval} />

      <div role="radiogroup" aria-label="プラン" className="space-y-2">
        {plans.map((plan) => {
          const selected = interval === plan.interval;

          return (
            <button
              key={plan.interval}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setInterval(plan.interval)}
              className={cn(
                "flex w-full items-center gap-3 rounded-xl border p-4 text-left transition-colors",
                "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ring",
                selected ? "border-primary bg-primary/5" : "border-input hover:bg-muted",
              )}
            >
              <span
                aria-hidden
                className={cn(
                  "flex size-5 shrink-0 items-center justify-center rounded-full border-2",
                  selected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/40",
                )}
              >
                {selected ? <Check className="size-3" /> : null}
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium">{plan.label}</span>
                {plan.monthlyEquivalent ? (
                  <span className="mt-0.5 block text-xs text-muted-foreground">
                    {plan.monthlyEquivalent}
                  </span>
                ) : null}
              </span>

              <span className="shrink-0 text-base font-bold">{plan.priceText}</span>
            </button>
          );
        })}
      </div>

      <FormMessage state={state} />
      <CheckoutButton />

      <p className="text-center text-xs text-muted-foreground">
        決済はStripeの画面で行います。カード情報をStudyDashが受け取ることはありません。
      </p>
    </form>
  );
}

function PortalButton() {
  const { pending } = useFormStatus();

  return (
    <Button
      type="submit"
      variant="outline"
      disabled={pending}
      className="h-11 w-full text-base"
    >
      <ExternalLink className="size-4" aria-hidden />
      支払い方法・解約の管理
    </Button>
  );
}

/** §4.1 S-10「購入/管理」の管理側 */
export function BillingPortalButton() {
  const [state, formAction] = useActionState(openBillingPortalAction, idleFormState);

  return (
    <form action={formAction} className="space-y-2">
      <PortalButton />
      <FormMessage state={state} />
    </form>
  );
}
