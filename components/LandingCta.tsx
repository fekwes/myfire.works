"use client";

import { ArrowRight } from "lucide-react";
import Link from "next/link";
import { usePlan } from "@/components/PlanProvider";

const primary =
  "inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90";
const secondary =
  "inline-flex items-center justify-center rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground";

/**
 * Landing call-to-action. New visitors are pushed into the quiz; returning
 * visitors (a plan already saved on this device) are offered a direct route
 * back into their planner instead.
 */
export function LandingCta() {
  const { hasStoredPlan, hydrated } = usePlan();
  const returning = hydrated && hasStoredPlan;

  return (
    <>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
        {returning ? (
          <>
            <Link href="/planner" className={primary}>
              Continue to your planner
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/start" className={secondary}>
              Start over
            </Link>
          </>
        ) : (
          <>
            <Link href="/start" className={primary}>
              Build my plan
              <ArrowRight className="size-4" />
            </Link>
            <Link href="/planner" className={secondary}>
              Skip to the planner
            </Link>
          </>
        )}
      </div>

      <p className="mt-4 text-xs text-muted-foreground">
        {returning
          ? "Welcome back — pick up right where you left off."
          : "Takes about two minutes. No account needed to see your result."}
      </p>
    </>
  );
}
