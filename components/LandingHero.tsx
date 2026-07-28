"use client";

import { Term } from "@/components/Glossary";
import { LandingCta } from "@/components/LandingCta";
import { LandingHeroPreview } from "@/components/LandingHeroPreview";
import { usePlan } from "@/components/PlanProvider";

export function LandingHero() {
  const { activeRegion } = usePlan();
  const isUs = activeRegion === "us";

  return (
    <section className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
      <div className="relative z-10 lg:col-span-7">
        <div className="absolute -left-20 top-20 -z-10 h-64 w-64 rounded-full bg-brand/10 blur-[80px]" />
        <div className="absolute -right-20 top-0 -z-10 h-64 w-64 rounded-full bg-accent/10 blur-[80px]" />

        {/* Region-Aware Eyebrow Badge */}
        <span className="landing-rise inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.2em] text-muted-foreground transition-all duration-300">
          <span className="size-1.5 rounded-full bg-brand" />
          {isUs
            ? "Free US FIRE Planner · IRS Tax-Aware Drawdown"
            : "Free UK FIRE Planner · HMRC Tax-Aware Drawdown"}
        </span>

        {/* Core Headline */}
        <h1 className="landing-rise mt-5 font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-balance [animation-delay:60ms] sm:text-[3.5rem]">
          Know your number. Know when.
          <br />
          Know{" "}
          <span className="relative whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-brand to-accent">
            it&apos;ll hold
            <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-brand/70 to-accent/70" />
          </span>
          .
        </h1>

        {/* Region-Specific Value Proposition & Wrapper List */}
        <p
          data-launch-quiet
          className="landing-rise mt-5 max-w-xl text-base leading-relaxed text-muted-foreground [animation-delay:120ms] sm:text-lg"
        >
          <Term term="FIRE">FIRE</Term> — financial independence, retire early —
          is having enough invested that work becomes optional. Fireworks models
          drawdown across{" "}
          <strong className="font-semibold text-foreground">
            {isUs
              ? "401(k)s, Roth IRAs, Taxable Brokerages, Social Security, and property"
              : "ISAs, SIPPs, GIAs, triple-lock State Pension, and property"}
          </strong>{" "}
          with the exact {isUs ? "federal & state tax" : "HMRC tax bands"} you&apos;ll actually pay.
        </p>

        {/* CTA */}
        <div data-launch-quiet className="landing-rise [animation-delay:180ms]">
          <LandingCta />
        </div>
      </div>

      <div className="relative z-10 lg:col-span-5">
        <LandingHeroPreview />
      </div>
    </section>
  );
}
