"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { Logo } from "@/components/Logo";
import { usePlan } from "@/components/PlanProvider";

/**
 * The header logo routes returning visitors (a plan already saved, or signed
 * in) straight to their planner, and new visitors to the landing page.
 */
export function HeaderLogo() {
  const { hasStoredPlan, hydrated } = usePlan();
  const { user } = useAuth();
  const href = hydrated && (hasStoredPlan || user) ? "/planner" : "/";
  return (
    <Link href={href} aria-label="OnFIRE home">
      <Logo size={30} />
    </Link>
  );
}
