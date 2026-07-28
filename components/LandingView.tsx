"use client";

import { Term } from "@/components/Glossary";
import { LandingCta } from "@/components/LandingCta";
import { LandingFeatures } from "@/components/LandingFeatures";
import { LandingHeroPreview } from "@/components/LandingHeroPreview";
import { useRegion } from "@/components/RegionProvider";
import { RegionToggle } from "@/components/RegionToggle";

const BURST = { x: 838, y: 66 };
const SPARK_RAYS = Array.from({ length: 12 }, (_, i) => {
  const angle = (i / 12) * Math.PI * 2;
  const inner = 15;
  const outer = 30 + (i % 3) * 11;
  return {
    x1: +(BURST.x + Math.cos(angle) * inner).toFixed(1),
    y1: +(BURST.y + Math.sin(angle) * inner).toFixed(1),
    x2: +(BURST.x + Math.cos(angle) * outer).toFixed(1),
    y2: +(BURST.y + Math.sin(angle) * outer).toFixed(1),
    tip: i % 2 === 0,
    violet: i % 3 === 0,
  };
});

export function LandingView() {
  const { region } = useRegion();
  const isUs = region === "us";

  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-12 sm:px-6 sm:py-16">
      {/* Hero — asymmetric: copy left, a real computed plan preview right. */}
      <section className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
        <svg
          aria-hidden
          className="pointer-events-none absolute inset-0 z-0 hidden h-full w-full lg:block"
          viewBox="0 0 1200 560"
          preserveAspectRatio="xMidYMid slice"
        >
          <defs>
            <linearGradient id="hero-trail-stroke" x1="0" y1="1" x2="1" y2="0">
              <stop offset="0%" stopColor="var(--accent)" stopOpacity={0} />
              <stop offset="45%" stopColor="var(--accent)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.7} />
            </linearGradient>
            <radialGradient id="hero-burst-glow">
              <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.5} />
              <stop offset="45%" stopColor="var(--primary)" stopOpacity={0.16} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
            </radialGradient>
          </defs>

          {/* Soft bloom behind the burst so it reads even over the preview. */}
          <circle
            className="spark-pop"
            cx={BURST.x}
            cy={BURST.y}
            r={96}
            fill="url(#hero-burst-glow)"
          />

          {/* Launch trail — the growth curve rising to the burst. */}
          <path
            className="hero-trail"
            d={`M-40 540 C 220 512, 470 452, 632 336 C 730 266, 792 178, ${BURST.x} ${BURST.y}`}
            fill="none"
            stroke="url(#hero-trail-stroke)"
            strokeWidth={2.5}
            strokeLinecap="round"
            pathLength={1}
          />

          {/* The burst — radiating spark rays, glinting tips, a bright core. */}
          <g className="spark-pop">
            {SPARK_RAYS.map((r, i) => (
              <g key={i}>
                <line
                  x1={r.x1}
                  y1={r.y1}
                  x2={r.x2}
                  y2={r.y2}
                  stroke={r.violet ? "var(--accent)" : "var(--brand)"}
                  strokeWidth={1.6}
                  strokeLinecap="round"
                  opacity={0.85}
                />
                {r.tip && <circle cx={r.x2} cy={r.y2} r={1.7} fill="var(--brand)" />}
              </g>
            ))}
            <circle cx={BURST.x} cy={BURST.y} r={4.5} fill="var(--brand)" />
            <circle
              cx={BURST.x}
              cy={BURST.y}
              r={8.5}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={1}
              opacity={0.5}
            />
          </g>
        </svg>

        <div className="relative z-10 lg:col-span-7">
          <div className="landing-rise flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 font-mono text-[0.72rem] font-bold uppercase tracking-[0.12em] text-primary shadow-xs">
              <span className="size-2 rounded-full bg-primary animate-pulse shrink-0" />
              Free &amp; Unlimited · No Registration Required
            </span>
            <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
              {isUs
                ? "FIRE planner · 2026 IRS tax-aware drawdown"
                : "FIRE planner · 2026/27 UK tax-aware drawdown"}
            </span>

            <RegionToggle />
          </div>

          <h1 className="landing-rise mt-5 font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-balance [animation-delay:60ms] sm:text-[3.5rem]">
            Know your number. Know when.
            <br />
            Know{" "}
            <span className="relative whitespace-nowrap text-primary">
              it&apos;ll hold
              <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-brand/70" />
            </span>
            .
          </h1>

          <p className="landing-rise mt-5 max-w-xl text-base leading-relaxed text-muted-foreground [animation-delay:120ms] sm:text-lg">
            {isUs ? (
              <>
                <Term term="FIRE">FIRE</Term> — financial independence, retire early — is having enough invested that work becomes optional. Fireworks models your complete drawdown (<Term>Roth IRA</Term>, <Term>401(k)</Term>, <Term>Taxable Brokerage</Term>, <Term>Social Security</Term>, and real estate) with IRS federal and state tax rules, bridge year sequencing before age 59½, and 2,000 Monte Carlo market simulations.
              </>
            ) : (
              <>
                <Term term="FIRE">FIRE</Term> — financial independence, retire early — is having enough invested that work becomes optional. Fireworks models your complete drawdown (<Term>ISA</Term>, <Term>GIA</Term>, <Term>SIPP</Term>, <Term>State Pension</Term>, and property) with HMRC progressive tax rules, bridge year sequencing before age 57, and 2,000 Monte Carlo market simulations.
              </>
            )}
          </p>

          <div className="landing-rise [animation-delay:180ms]">
            <LandingCta />
          </div>
        </div>

        <div className="relative z-10 lg:col-span-5">
          <LandingHeroPreview />
        </div>
      </section>

      {/* Feature section with value props, comparison table, and trust/disclaimer box */}
      <LandingFeatures />
    </div>
  );
}
