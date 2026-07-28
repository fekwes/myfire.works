"use client";

import { ArrowRight, CheckCircle2, Lock, ShieldCheck } from "lucide-react";
import { usePlan } from "@/components/PlanProvider";
import { ButtonLink } from "@/components/ui";

/**
 * Landing call-to-action component. New visitors are pushed into the wizard;
 * returning visitors (a plan already saved on this device) can enter their
 * existing dashboard or start a fresh scenario. Clean, spacious microcopy.
 */
export function LandingCta() {
  const { hasStoredPlan, hydrated } = usePlan();
  const returning = hydrated && hasStoredPlan;

  return (
    <div>
      <div className="mt-8 flex flex-col gap-3.5 sm:flex-row sm:items-center">
        {returning ? (
          <>
            <ButtonLink
              href="/planner"
              variant="brand"
              className="px-7 py-4 text-base font-bold shadow-md hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.98]"
            >
              <span>Continue to your dashboard</span>
              <ArrowRight className="size-5 shrink-0" />
            </ButtonLink>
            <ButtonLink href="/start" variant="secondary" className="px-5 py-3.5 text-sm font-semibold">
              Start new plan
            </ButtonLink>
          </>
        ) : (
          <ButtonLink
            href="/start"
            variant="brand"
            className="px-8 py-4 text-base font-bold shadow-md hover:shadow-lg transition-all hover:scale-[1.01] active:scale-[0.98]"
          >
            <span>Build my plan</span>
            <ArrowRight className="size-5 shrink-0" />
          </ButtonLink>
        )}
      </div>

      {/* Sleek, dignified single-line micro-reassurance bar */}
      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 font-mono text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-semibold text-foreground">
          <CheckCircle2 className="size-3.5 text-primary shrink-0" />
          Free &amp; Unlimited
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
          <Lock className="size-3.5 text-brand shrink-0" />
          No Registration Required
        </span>
        <span className="inline-flex items-center gap-1.5 font-medium text-muted-foreground">
          <ShieldCheck className="size-3.5 text-accent shrink-0" />
          100% Private Client-Side Model
        </span>
      </div>
    </div>
  );
}
