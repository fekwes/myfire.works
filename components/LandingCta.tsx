"use client";

import { ArrowRight, Lock, ShieldCheck, Zap } from "lucide-react";
import { usePlan } from "@/components/PlanProvider";
import { ButtonLink } from "@/components/ui";

/**
 * Landing call-to-action with high-converting trust badges and localized features.
 */
export function LandingCta() {
  const { hasStoredPlan, hydrated, activeRegion } = usePlan();
  const returning = hydrated && hasStoredPlan;

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        {returning ? (
          <>
            <ButtonLink
              href="/planner"
              variant="brand"
              className="px-6 py-3 shadow-lg shadow-brand/25 transition-all hover:-translate-y-0.5 hover:scale-105 hover:shadow-brand/40"
            >
              Continue to your dashboard
              <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="/start" variant="secondary" className="px-6 py-3">
              Start over
            </ButtonLink>
          </>
        ) : (
          <ButtonLink
            href="/start"
            variant="brand"
            className="px-6 py-3 shadow-lg shadow-brand/25 transition-all hover:-translate-y-0.5 hover:scale-105 hover:shadow-brand/40"
          >
            Build my FIRE plan
            <ArrowRight className="size-4" />
          </ButtonLink>
        )}
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5">
          <Zap className="size-3.5 text-brand" />
          {returning ? "Welcome back — pick up right where you left off." : "Takes 2 minutes · 100% Free"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Lock className="size-3.5 text-success" />
          Private Client-Side Storage
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-primary" />
          {activeRegion === "us" ? "IRS 2026 Tax Rules & Limits" : "HMRC 2026/27 Tax Rules & Limits"}
        </span>
      </div>
    </>
  );
}
