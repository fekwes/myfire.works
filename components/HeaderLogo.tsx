"use client";

import Link from "next/link";
import { Logo } from "@/components/Logo";
import { usePlan } from "@/components/PlanProvider";

/**
 * The header logo routes returning visitors (a plan already saved) straight to
 * their planner, and new visitors to the landing page.
 */
export function HeaderLogo() {
  const { hasStoredPlan, hydrated } = usePlan();
  const href = hydrated && hasStoredPlan ? "/planner" : "/";
  return (
    <Link href={href} aria-label="OnFIRE home">
      <Logo size={30} />
    </Link>
  );
}
