"use client";

import { ArrowRight } from "lucide-react";
import { usePlan } from "@/components/PlanProvider";
import { ButtonLink } from "@/components/ui";

/**
 * Landing call-to-action. New visitors are pushed into the quiz; returning
 * visitors (a plan already saved on this device) are offered a direct route
 * back into their planner instead. The signature action uses the brand
 * (ember) button — the one place the accent is spent on the landing.
 */
export function LandingCta() {
  const { hasStoredPlan, hydrated } = usePlan();
  const returning = hydrated && hasStoredPlan;

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        {returning ? (
          <>
            <ButtonLink href="/planner" variant="brand" className="px-6 py-3">
              Continue to your dashboard
              <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink href="/start" variant="secondary" className="px-6 py-3">
              Start over
            </ButtonLink>
          </>
        ) : (
          <ButtonLink href="/start" variant="brand" className="px-6 py-3">
            Build my plan
            <ArrowRight className="size-4" />
          </ButtonLink>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {returning
          ? "Welcome back — pick up right where you left off."
          : "Free — no cost, no account needed to see your result. Takes about two minutes."}
      </p>
    </>
  );
}
