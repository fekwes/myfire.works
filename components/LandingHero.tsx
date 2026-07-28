"use client";

import { useCallback, useState } from "react";
import { Term } from "@/components/Glossary";
import { LandingCta } from "@/components/LandingCta";
import { LandingHeroPreview } from "@/components/LandingHeroPreview";
import { useRegion } from "@/components/RegionProvider";
import { RegionToggle } from "@/components/RegionToggle";

export function LandingHero() {
  const { region, details } = useRegion();
  const [isFireworksActive, setIsFireworksActive] = useState(false);

  const handleTriggerFireworks = useCallback(() => {
    setIsFireworksActive(true);
    const timer = setTimeout(() => {
      setIsFireworksActive(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, []);

  return (
    <section className="relative grid grid-cols-1 items-center gap-10 lg:grid-cols-12 lg:gap-12">
      {/* Left Column — Value Proposition & Action */}
      <div className="relative z-10 lg:col-span-7">
        <div className="landing-rise flex flex-wrap items-center gap-2.5 sm:gap-3">
          <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3.5 py-1.5 font-mono text-[0.72rem] font-bold uppercase tracking-[0.12em] text-primary shadow-xs">
            <span className="size-2 rounded-full bg-primary animate-pulse shrink-0" />
            {details.heroBadge}
          </span>
          <RegionToggle />
        </div>

        <h1 className="landing-rise mt-6 font-display text-4xl font-extrabold leading-[1.04] tracking-tight text-balance sm:text-[3.75rem]">
          Know your number. Know when.
          <br />
          Know{" "}
          <span className="relative whitespace-nowrap text-primary">
            it&apos;ll hold
            <span className="absolute -bottom-1.5 left-0 h-[3px] w-full rounded-full bg-gradient-to-r from-brand to-primary opacity-85" />
          </span>
          .
        </h1>

        <p className="landing-rise mt-5 max-w-xl text-base leading-relaxed text-muted-foreground [animation-delay:120ms] sm:text-lg sm:leading-relaxed">
          <Term term="FIRE">FIRE</Term> — financial independence, retire early — is having enough invested that work becomes optional. Fireworks models your complete drawdown (
          {region === "uk" ? (
            <>
              <Term>ISA</Term>, <Term>GIA</Term>, <Term>SIPP</Term>, <Term>State Pension</Term> and property
            </>
          ) : (
            <>
              <Term>Roth IRA</Term>, <Term term="Taxable Brokerage">Taxable Brokerage</Term>, <Term term="401(k)">401(k)/IRA</Term>, <Term>Social Security</Term> and real estate
            </>
          )}
          ) {details.heroCopy.mechanics}
        </p>

        <div className="landing-rise [animation-delay:180ms]">
          <LandingCta />
        </div>
      </div>

      {/* Right Column — Interactive Hero Chart Visual Piece */}
      <div className="relative z-10 lg:col-span-5">
        <LandingHeroPreview
          onTriggerFireworks={handleTriggerFireworks}
          isFireworksActive={isFireworksActive}
        />
      </div>
    </section>
  );
}
