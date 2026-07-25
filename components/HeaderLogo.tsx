"use client";

import Link from "next/link";
import { useAuth } from "@/components/AuthProvider";
import { LogoMark } from "@/components/Logo";

/**
 * The full brand lockup — mark, wordmark and the beta badge as one unit, so
 * their alignment lives in a single place. The wordmark and badge share a
 * baseline-neutral row (`leading-none` + `items-center`) so the small badge
 * sits on the wordmark's optical centre instead of drifting low.
 *
 * The home link routes a signed-in visitor to their planner and everyone else
 * to the landing page.
 */
export function HeaderLogo() {
  const { user } = useAuth();
  const href = user ? "/planner" : "/";
  return (
    <Link
      href={href}
      aria-label="Fireworks home"
      className="flex min-w-0 items-center gap-2.5 rounded-lg outline-none focus-visible:ring-2 focus-visible:ring-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
    >
      <LogoMark size={30} />
      <span className="flex items-center gap-2">
        <span className="font-display text-[1.15rem] font-bold leading-none tracking-tight">
          Fire<span className="text-primary">·</span>works
        </span>
        <span className="rounded-full border border-primary/40 bg-brand/10 px-1.5 py-[0.15rem] font-mono text-[0.55rem] font-semibold uppercase leading-none tracking-[0.1em] text-primary">
          beta
        </span>
      </span>
    </Link>
  );
}
