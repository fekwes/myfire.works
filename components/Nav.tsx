"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { usePlan } from "@/components/PlanProvider";

export function Nav() {
  const pathname = usePathname();
  const { hasStoredPlan, hydrated } = usePlan();
  const { user } = useAuth();

  // Onboarding-first: a brand-new visitor sees a clean header and is driven to
  // the quiz. The core app tabs appear once they have a plan OR are signed in
  // (a returning user on a fresh browser must still reach their planner).
  const onboarded = hydrated && (hasStoredPlan || !!user);
  const links = [
    ...(onboarded
      ? [
          { href: "/planner", label: "Planner" },
          { href: "/finances", label: "Your Finances" },
        ]
      : []),
    { href: "/methodology", label: "Methodology" },
  ];

  return (
    <nav className="flex items-center gap-1">
      {links.map((link) => {
        const active = pathname === link.href;
        return (
          <Link
            key={link.href}
            href={link.href}
            className={`rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
              active
                ? "bg-surface-muted text-foreground"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
