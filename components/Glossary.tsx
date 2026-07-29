"use client";

import { useId } from "react";

/**
 * Plain-English definitions for the jargon a newcomer meets before they ever
 * reach Your Finances (where the inputs carry their own tooltips). Kept in one
 * place so the wording stays consistent everywhere a term is explained.
 */
export const GLOSSARY: Record<string, string> = {
  FIRE: "Financial Independence, Retire Early — having enough invested that work becomes optional.",
  ISA: "Individual Savings Account — UK tax-efficient account with 100% tax-free growth and withdrawals at any age.",
  SIPP: "Self-Invested Personal Pension — UK private pension locked until age 57, then 25% comes out tax-free.",
  GIA: "General Investment Account — ordinary UK taxable investment account used when tax shelters are maxed.",
  "State Pension": "UK government pension paid starting at state pension age (currently age 67).",
  "Roth IRA": "Roth Individual Retirement Account — US tax-advantaged account with tax-free growth and tax-free retirement withdrawals.",
  "401(k)": "Employer-sponsored US retirement plan with tax-deferred growth, accessible penalty-free at age 59½.",
  "Taxable Brokerage": "Standard US taxable investment account used for flexible liquidity prior to retirement access age.",
  "Brokerage": "Standard US taxable investment account used for flexible liquidity prior to retirement access age.",
  "Social Security": "US federal retirement benefit based on lifetime earnings and PIA bend point calculations.",
  CGT: "Capital Gains Tax — tax on investment profits paid in taxable accounts.",
  "Coast FIRE":
    "Coast FIRE — you've already saved enough that growth alone reaches your target, so you could stop adding new money.",
  "Barista FIRE":
    "Barista FIRE — combining investment drawdowns with part-time work to transition into retirement earlier.",
};

/**
 * An inline glossary term: the word stays in the sentence with a dotted
 * underline, and its plain definition appears on hover or keyboard focus. A
 * real `<button>` so it's reachable by keyboard, with the definition wired
 * through `aria-describedby`.
 *
 * The popover opens *below* the term and is width-clamped to the viewport, so
 * it never pushes the page into a horizontal scroll (see HANDOFF §8).
 */
export function Term({
  children,
  term,
}: {
  children: string;
  /** Override the lookup key when the visible text isn't the glossary key. */
  term?: string;
}) {
  const id = useId();
  const definition = GLOSSARY[term ?? children];
  if (!definition) return <>{children}</>;

  return (
    <span className="group/term relative inline-block">
      <button
        type="button"
        aria-describedby={id}
        className="cursor-help border-b border-dotted border-muted-foreground/70 font-medium text-foreground underline-offset-2 outline-none transition-colors hover:border-foreground focus-visible:border-foreground"
      >
        {children}
      </button>
      {/* Hidden with `display:none` (not opacity) when closed, so the absolute
          box never widens the page — an opacity-0 popover still counts toward
          scroll width and trips the no-horizontal-scroll rule (HANDOFF §8).
          Centred under the term and clamped to the viewport when open. */}
      <span
        role="tooltip"
        id={id}
        className="pointer-events-none absolute left-1/2 top-full z-30 mt-2 hidden w-64 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-lg border border-border bg-surface p-2.5 text-left text-xs font-normal leading-relaxed text-muted-foreground shadow-lg group-hover/term:block group-focus-within/term:block"
      >
        {definition}
      </span>
    </span>
  );
}
