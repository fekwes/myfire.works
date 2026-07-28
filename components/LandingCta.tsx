"use client";

import { ArrowRight, Lock, ShieldCheck, Zap } from "lucide-react";
import { usePlan } from "@/components/PlanProvider";
import { ButtonLink } from "@/components/ui";

/**
 * Landing call-to-action with refined, professional microcopy.
 */
export function LandingCta() {
  const { hasStoredPlan, hydrated, activeRegion } = usePlan();
  const returning = hydrated && hasStoredPlan;

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
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
            Build your retirement plan
            <ArrowRight className="size-4" />
          </ButtonLink>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Zap className="size-3.5 text-brand" />
          {returning
            ? "Welcome back — pick up right where you left off."
            : "Free & private · Takes about 2 minutes"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Lock className="size-3.5 text-success" />
          No registration required
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-primary" />
          {activeRegion === "us" ? "IRS 2026 Engine" : "HMRC 2026/27 Engine"}
        </span>
      </div>
    </>
  );
}
