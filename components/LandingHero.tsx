"use client";

import { Sparkles, ShieldCheck, Zap } from "lucide-react";
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
        <div className="absolute -left-20 top-20 -z-10 h-64 w-64 rounded-full bg-brand/15 blur-[90px]" />
        <div className="absolute -right-20 top-0 -z-10 h-64 w-64 rounded-full bg-accent/15 blur-[90px]" />

        {/* High-Impact Visual Eyebrow Badges */}
        <div className="landing-rise flex flex-wrap items-center gap-2 sm:gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-brand font-bold shadow-sm">
            <Sparkles className="size-3 text-brand" />
            100% Free — For Real Free!
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-border bg-surface/80 px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.16em] text-muted-foreground backdrop-blur-sm">
            <span className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
            {isUs ? "IRS 2026 Tax Engine" : "HMRC 2026/27 Tax Engine"}
          </span>
        </div>

        {/* Core Iconic Headline */}
        <h1 className="landing-rise mt-5 font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-balance [animation-delay:60ms] sm:text-[3.5rem]">
          Know your number. Know when.
          <br />
          Know{" "}
          <span className="relative whitespace-nowrap text-transparent bg-clip-text bg-gradient-to-r from-brand via-primary to-accent">
            it&apos;ll hold
            <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-brand via-primary to-accent opacity-80" />
          </span>
          .
        </h1>

        {/* Region-Specific Value Proposition & Account List */}
        <p
          data-launch-quiet
          className="landing-rise mt-5 max-w-xl text-base leading-relaxed text-muted-foreground [animation-delay:120ms] sm:text-lg"
        >
          <Term term="FIRE">FIRE</Term> — financial independence, retire early —
          is having enough invested that work becomes optional. Fireworks is a{" "}
          <strong className="font-bold text-foreground underline decoration-brand/40 underline-offset-2">
            100% free, private modeling tool
          </strong>{" "}
          that simulates drawdown across{" "}
          <strong className="font-semibold text-foreground">
            {isUs
              ? "401(k)s, Roth IRAs, Taxable Brokerages, Social Security, and property"
              : "ISAs, SIPPs, GIAs, triple-lock State Pension, and property"}
          </strong>{" "}
          with the exact {isUs ? "federal & state tax" : "HMRC tax rules"} you&apos;ll actually pay.
        </p>

        {/* Visual Trust Callouts */}
        <div className="landing-rise mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 text-xs font-medium text-muted-foreground [animation-delay:150ms]">
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <Zap className="size-3.5 text-brand" />
            No Paywalls or Hidden Upsells
          </span>
          <span className="text-border" aria-hidden="true">•</span>
          <span className="inline-flex items-center gap-1.5 text-foreground">
            <ShieldCheck className="size-3.5 text-emerald-400" />
            No Mandatory Account Required
          </span>
        </div>

        {/* CTA */}
        <div data-launch-quiet className="landing-rise mt-6 [animation-delay:180ms]">
          <LandingCta />
        </div>
      </div>

      <div className="relative z-10 lg:col-span-5">
        <LandingHeroPreview />
      </div>
    </section>
  );
}
