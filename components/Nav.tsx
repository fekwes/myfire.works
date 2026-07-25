"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useAuth } from "@/components/AuthProvider";
import { usePlan } from "@/components/PlanProvider";

interface NavLink {
  href: string;
  label: string;
  /** Shorter label for tight layouts. */
  short: string;
}

/**
 * The app's top-level destinations. Onboarding-first: a brand-new visitor sees
 * a clean header and is driven to the quiz. The core tabs appear once they have
 * a plan OR are signed in (a returning user on a fresh browser must still reach
 * their planner).
 */
function useNavLinks(): { links: NavLink[]; onboarded: boolean } {
  const { hasStoredPlan, hydrated } = usePlan();
  const { user } = useAuth();
  const onboarded = hydrated && (hasStoredPlan || !!user);
  return {
    onboarded,
    // Methodology now lives only in the footer — kept out of the header to cut
    // noise most users won't read. Routes stay /planner and /finances; only the
    // labels changed (Dashboard / Edit plan).
    links: onboarded
      ? [
          { href: "/planner", label: "Dashboard", short: "Dashboard" },
          { href: "/finances", label: "Edit plan", short: "Edit plan" },
        ]
      : [],
  };
}

function linkClasses(active: boolean) {
  return `rounded-full px-3 py-1.5 text-sm font-medium transition-colors ${
    active
      ? "bg-surface-muted text-foreground"
      : "text-muted-foreground hover:text-foreground"
  }`;
}

/**
 * Desktop navigation, inline in the header bar. Hidden on small screens, where
 * the full set of tabs plus the auth and theme controls can't fit on one row —
 * `MobileNav` takes over below.
 */
export function Nav() {
  const pathname = usePathname();
  const { links } = useNavLinks();

  return (
    <nav className="hidden items-center gap-1 sm:flex">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className={linkClasses(pathname === link.href)}
        >
          {link.label}
        </Link>
      ))}
    </nav>
  );
}

/**
 * Small-screen navigation: a second row beneath the header bar. Only rendered
 * once there's more than one destination — a whole row for a single link would
 * be noise for a first-time visitor.
 */
export function MobileNav() {
  const pathname = usePathname();
  const { links } = useNavLinks();
  if (links.length < 2) return null;

  return (
    <nav className="flex items-center gap-1 overflow-x-auto border-t border-border px-4 py-2 sm:hidden">
      {links.map((link) => (
        <Link
          key={link.href}
          href={link.href}
          aria-current={pathname === link.href ? "page" : undefined}
          className={`${linkClasses(pathname === link.href)} shrink-0`}
        >
          {link.short}
        </Link>
      ))}
    </nav>
  );
}
