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
          <ButtonLink href="/start" variant="brand" className="px-6 py-3 shadow-sm hover:shadow-md transition-shadow">
            Build my plan
            <ArrowRight className="size-4" />
          </ButtonLink>
        )}
      </div>

      <div className="mt-4 flex flex-col gap-1 text-xs text-muted-foreground">
        <p className="font-medium text-foreground/90">
          {returning
            ? "Welcome back — pick up right where you left off."
            : "Takes about 2 minutes. Free & instant result — no registration or bank account link needed."}
        </p>
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-[0.72rem] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-success" />
            100% Client-side privacy
          </span>
          <span className="inline-flex items-center gap-1">
            <span className="size-1.5 rounded-full bg-brand" />
            Updated for 2026/27 UK tax rules
          </span>
        </div>
      </div>
    </>
  );
}
