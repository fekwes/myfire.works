"use client";

import { ShieldCheck, Sparkles } from "lucide-react";
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
        {/* Ambient background glow highlights */}
        <div className="absolute -left-20 top-20 -z-10 h-72 w-72 rounded-full bg-brand/15 blur-[100px] pointer-events-none" />
        <div className="absolute -right-20 top-0 -z-10 h-72 w-72 rounded-full bg-accent/15 blur-[100px] pointer-events-none" />

        {/* Professional Eyebrow Badges */}
        <div className="landing-rise flex flex-wrap items-center gap-2 sm:gap-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 font-mono text-[0.7rem] font-bold uppercase tracking-[0.14em] text-brand backdrop-blur-md">
            <Sparkles className="size-3 text-brand" />
            Free & Open Access
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-emerald-400 backdrop-blur-md">
            <ShieldCheck className="size-3 text-emerald-400" />
            100% Private Client Engine
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1 font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground backdrop-blur-md">
            <span className="size-1.5 rounded-full bg-primary" />
            {isUs ? "IRS 2026 Tax Rules" : "HMRC 2026/27 Tax Rules"}
          </span>
        </div>

        {/* Core Headline */}
        <h1 className="landing-rise mt-5 font-display text-4xl font-extrabold leading-[1.03] tracking-tight text-balance [animation-delay:60ms] sm:text-[3.5rem] lg:text-[3.75rem]">
          Know your number. Know when.
          <br />
          Know{" "}
          <span className="relative inline-block whitespace-nowrap">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-brand via-primary to-accent">
              it&apos;ll hold
            </span>
            <span className="absolute -bottom-1 left-0 h-[3.5px] w-full rounded-full bg-gradient-to-r from-brand via-primary to-accent opacity-80" />
          </span>
          .
        </h1>

        {/* Region-Specific Value Proposition */}
        <p
          data-launch-quiet
          className="landing-rise mt-5 max-w-xl text-base leading-relaxed text-muted-foreground [animation-delay:120ms] sm:text-lg"
        >
          <Term term="FIRE">FIRE</Term> — financial independence, retire early —
          is having enough invested that work becomes optional. Fireworks is a free,
          private modeling tool that solves drawdown across{" "}
          <strong className="font-semibold text-foreground">
            {isUs
              ? "401(k)s, Roth IRAs, Taxable Brokerages, Social Security, and property"
              : "ISAs, SIPPs, GIAs, triple-lock State Pension, and property"}
          </strong>{" "}
          with the exact {isUs ? "federal & state tax rules" : "HMRC tax bands"} you&apos;ll actually pay.
        </p>

        {/* CTA Section */}
        <div data-launch-quiet className="landing-rise mt-8 [animation-delay:180ms]">
          <LandingCta />
        </div>
      </div>

      <div className="relative z-10 lg:col-span-5">
        <LandingHeroPreview />
      </div>
    </section>
  );
}
