"use client";

import { useState } from "react";
import { ArrowRight, Lock, ShieldCheck, Sparkles, Zap } from "lucide-react";
import { usePlan } from "@/components/PlanProvider";
import { Button, ButtonLink } from "@/components/ui";
import { isCountryEnabled } from "@/lib/config/feature-flags";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";

/**
 * Landing call-to-action with strict single-language microcopy.
 */
export function LandingCta() {
  const { hasStoredPlan, hydrated, activeRegion, setActiveRegion } = usePlan();
  const returning = hydrated && hasStoredPlan;
  const [showNotice, setShowNotice] = useState(false);

  const regionEnabled = isCountryEnabled(activeRegion);

  const handleCtaClick = (label: string) => {
    trackEvent(ANALYTICS_EVENTS.PRIMARY_CONVERSION_CTA_CLICKED, {
      label,
      region: activeRegion,
      returning,
    });
  };

  const isEs = activeRegion === "es";

  return (
    <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        {!regionEnabled ? (
          <div className="flex flex-col gap-2.5">
            <Button
              variant="brand"
              onClick={() => {
                handleCtaClick(isEs ? "Spain Coming Soon CTA" : "US Coming Soon CTA");
                setShowNotice(true);
              }}
              className="px-6 py-3 shadow-lg shadow-amber-500/20 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white font-semibold transition-all hover:-translate-y-0.5"
            >
              <Sparkles className="size-4 text-white" />
              {isEs ? "🇪🇸 Próximamente en España" : "🇺🇸 US — Coming Soon"}
              <ArrowRight className="size-4" />
            </Button>
            {showNotice && (
              <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3.5 text-xs text-amber-200 leading-relaxed max-w-md space-y-2">
                <p>
                  {isEs
                    ? "🇪🇸 La versión adaptada a España (IRPF 2026, Planes de Pensiones y PIAS) estará disponible muy pronto."
                    : "🇺🇸 The US version is under active development and launching soon."}
                </p>
                <div className="flex items-center justify-between pt-1 border-t border-amber-500/20">
                  <span className="text-muted-foreground text-[11px]">
                    {isEs ? "¿Quieres probar la versión activa?" : "Want to try the active version?"}
                  </span>
                  <button
                    type="button"
                    onClick={() => setActiveRegion("uk")}
                    className="text-amber-400 font-semibold hover:underline"
                  >
                    {isEs ? "Ir a la versión UK →" : "Go to UK version →"}
                  </button>
                </div>
              </div>
            )}
          </div>
        ) : returning ? (
          <>
            <ButtonLink
              href="/planner"
              variant="brand"
              onClick={() => handleCtaClick("Continue to dashboard")}
              className="px-6 py-3 shadow-lg shadow-brand/25 transition-all hover:-translate-y-0.5 hover:scale-105 hover:shadow-brand/40"
            >
              {isEs ? "Continuar a mi panel" : "Continue to your dashboard"}
              <ArrowRight className="size-4" />
            </ButtonLink>
            <ButtonLink
              href="/start"
              variant="secondary"
              onClick={() => handleCtaClick("Start over")}
              className="px-6 py-3"
            >
              {isEs ? "Empezar de nuevo" : "Start over"}
            </ButtonLink>
          </>
        ) : (
          <ButtonLink
            href="/start"
            variant="brand"
            onClick={() => handleCtaClick("Build your retirement plan")}
            className="px-6 py-3 shadow-lg shadow-brand/25 transition-all hover:-translate-y-0.5 hover:scale-105 hover:shadow-brand/40"
          >
            {isEs ? "Crear mi plan de jubilación" : "Build your retirement plan"}
            <ArrowRight className="size-4" />
          </ButtonLink>
        )}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 text-xs text-muted-foreground">
        <span className="inline-flex items-center gap-1.5 font-medium text-foreground">
          <Zap className="size-3.5 text-brand" />
          {returning
            ? isEs
              ? "Bienvenido de nuevo — continúa desde donde lo dejaste."
              : "Welcome back — pick up right where you left off."
            : isEs
            ? "Gratis y privado · Lleva unos 2 minutos"
            : "Free & private · Takes about 2 minutes"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Lock className="size-3.5 text-success" />
          {isEs ? "Sin registro obligatorio" : "No registration required"}
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-primary" />
          {activeRegion === "us"
            ? "IRS 2026 Engine"
            : activeRegion === "es"
            ? "Motor IRPF 2026 España"
            : "HMRC 2026/27 Engine"}
        </span>
      </div>
    </>
  );
}
