"use client";

import { useEffect, useState } from "react";

const SECTIONS = [
  { id: "basics", label: "Basics" },
  { id: "balances", label: "Balances" },
  { id: "funds", label: "Funds & fees" },
  { id: "property", label: "Property" },
  { id: "scenario", label: "Withdrawals" },
  { id: "assumptions", label: "Assumptions" },
] as const;

/**
 * Section rail for Your Finances. The form is long by nature — this makes it
 * navigable instead of a single scroll, and marks where you are.
 *
 * Sits alongside the form on large screens; becomes a scrollable chip row
 * above it on small ones.
 */
export function FinancesNav() {
  const [active, setActive] = useState<string>(SECTIONS[0].id);

  useEffect(() => {
    const targets = SECTIONS.map((s) => document.getElementById(s.id)).filter(
      (el): el is HTMLElement => el !== null,
    );
    if (targets.length === 0) return;

    // Highlight the section nearest the top of the viewport, biased below the
    // sticky header so a section counts as "current" once it reaches it.
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((e) => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top);
        if (visible[0]?.target.id) setActive(visible[0].target.id);
      },
      { rootMargin: "-120px 0px -55% 0px", threshold: 0 },
    );
    for (const el of targets) observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <nav aria-label="Sections of your finances">
      <ul className="flex gap-1.5 overflow-x-auto pb-1 lg:sticky lg:top-24 lg:flex-col lg:overflow-visible lg:pb-0">
        {SECTIONS.map((s) => {
          const current = active === s.id;
          return (
            <li key={s.id} className="shrink-0">
              <a
                href={`#${s.id}`}
                aria-current={current ? "true" : undefined}
                className={`block rounded-full px-3 py-1.5 text-sm transition-colors lg:rounded-lg ${
                  current
                    ? "bg-surface-muted font-medium text-foreground lg:border-l-2 lg:border-primary lg:bg-transparent"
                    : "text-muted-foreground hover:text-foreground lg:border-l-2 lg:border-transparent"
                }`}
              >
                {s.label}
              </a>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
