"use client";

import { useEffect } from "react";
import { ShieldCheck, Sparkles, Globe } from "lucide-react";
import { LandingCta } from "@/components/LandingCta";
import { LandingHeroPreview } from "@/components/LandingHeroPreview";
import { usePlan } from "@/components/PlanProvider";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";
import { getTranslations } from "@/lib/i18n";

export function LandingHero() {
  const { activeRegion } = usePlan();
  const isUs = activeRegion === "us";
  const isEs = activeRegion === "es";

  const t = getTranslations(isEs ? "es-ES" : "en-GB");

  useEffect(() => {
    trackEvent(ANALYTICS_EVENTS.LANDING_PAGE_VIEWED, { region: activeRegion });
  }, [activeRegion]);

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
            {isEs ? "Acceso Gratuito y Libre" : "Free & Open Access"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 font-mono text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-emerald-400 backdrop-blur-md">
            <ShieldCheck className="size-3 text-emerald-400" />
            {isEs ? "Motor 100% Privado en Cliente" : "100% Private Client Engine"}
          </span>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 font-mono text-[0.7rem] font-semibold tracking-[0.14em] text-amber-400 backdrop-blur-md">
            <Globe className="size-3 text-amber-400" />
            {isEs
              ? "🇬🇧 Reino Unido Activo · 🇪🇸 España Próximamente"
              : isUs
              ? "🇬🇧 UK Active · 🇺🇸 US Coming Soon"
              : "🇬🇧 UK Active · 🇪🇸 Spain Coming Soon"}
          </span>
        </div>

        {/* Core Headline — Clean, Direct & Universal */}
        <h1 className="landing-rise mt-5 font-display text-4xl font-extrabold leading-[1.03] tracking-tight text-balance [animation-delay:60ms] sm:text-[3.5rem] lg:text-[3.75rem]">
          {isEs ? (
            <>
              Sabe exactamente cuándo
              <br />
              puedes{" "}
              <span className="relative inline-block whitespace-nowrap">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-brand to-accent drop-shadow-[0_2px_12px_rgba(255,194,75,0.25)]">
                  dejar de trabajar
                </span>
                <span className="absolute -bottom-1 left-0 h-[3.5px] w-full rounded-full bg-gradient-to-r from-amber-400 via-brand to-accent opacity-90 shadow-sm" />
              </span>
              .
            </>
          ) : (
            <>
              Know exactly when
              <br />
              you can{" "}
              <span className="relative inline-block whitespace-nowrap">
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-brand to-accent drop-shadow-[0_2px_12px_rgba(255,194,75,0.25)]">
                  stop working
                </span>
                <span className="absolute -bottom-1 left-0 h-[3.5px] w-full rounded-full bg-gradient-to-r from-amber-400 via-brand to-accent opacity-90 shadow-sm" />
              </span>
              .
            </>
          )}
        </h1>

        {/* Value Proposition — Concise & Professional */}
        <p
          data-launch-quiet
          className="landing-rise mt-5 max-w-xl text-base leading-relaxed text-muted-foreground [animation-delay:120ms] sm:text-lg"
        >
          {t.hero.subtitle}
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
