"use client";

import { Check, ChevronDown, Sparkles } from "lucide-react";
import { useSyncExternalStore, useState } from "react";
import { usePlan } from "@/components/PlanProvider";
import { Menu } from "@/components/ui";
import { isCountryEnabled } from "@/lib/config/feature-flags";
import { ANALYTICS_EVENTS, trackEvent } from "@/lib/analytics";

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false
  );
}

export function RegionToggle() {
  const { activeRegion, setActiveRegion } = usePlan();
  const mounted = useMounted();
  const [showNotice, setShowNotice] = useState(false);

  if (!mounted) {
    return (
      <div className="h-9 w-20 rounded-full border border-border bg-surface" />
    );
  }

  const esEnabled = isCountryEnabled("es");

  const items = [
    {
      label: "🇬🇧  United Kingdom",
      icon: activeRegion === "uk" ? <Check className="size-3.5 text-primary ml-auto" /> : <span className="size-3.5 ml-auto" />,
      onSelect: () => {
        trackEvent("Region Selected", { country: "uk" });
        setActiveRegion("uk");
      },
    },
    {
      label: esEnabled ? "🇪🇸  España" : "🇪🇸  España (Próximamente)",
      icon: activeRegion === "es" ? (
        <Check className="size-3.5 text-primary ml-auto" />
      ) : !esEnabled ? (
        <span className="ml-auto text-[10px] font-medium text-amber-500 bg-amber-500/10 px-1.5 py-0.5 rounded">
          Próximamente
        </span>
      ) : (
        <span className="size-3.5 ml-auto" />
      ),
      onSelect: () => {
        trackEvent(ANALYTICS_EVENTS.COMING_SOON_CTA_CLICKED, { country: "es" });
        if (esEnabled) {
          setActiveRegion("es");
        } else {
          setShowNotice(true);
        }
      },
    },
    {
      label: "🇺🇸  United States (Coming Soon)",
      icon: activeRegion === "us" ? (
        <Check className="size-3.5 text-primary ml-auto" />
      ) : (
        <span className="ml-auto text-[10px] font-medium text-muted-foreground bg-muted/20 px-1.5 py-0.5 rounded">
          Soon
        </span>
      ),
      onSelect: () => {
        trackEvent(ANALYTICS_EVENTS.COMING_SOON_CTA_CLICKED, { country: "us" });
        setShowNotice(true);
      },
    },
  ];

  const currentLabel =
    activeRegion === "es" ? "🇪🇸 ES" : activeRegion === "us" ? "🇺🇸 US" : "🇬🇧 UK";

  return (
    <>
      <div onPointerDown={() => trackEvent(ANALYTICS_EVENTS.REGION_SELECTOR_VIEWED)}>
        <Menu
          menuLabel="Select Region"
          trigger={
            <span className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors group-hover:text-foreground sm:text-sm">
              <span>{currentLabel}</span>
              <ChevronDown className="size-3.5 text-muted-foreground transition-transform duration-200 group-aria-expanded:rotate-180" />
            </span>
          }
          triggerClassName="group inline-flex h-9 items-center justify-center rounded-full border border-border bg-surface px-3 py-0 text-sm font-medium transition-colors hover:bg-surface-muted focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
          items={items}
          align="right"
        />
      </div>

      {showNotice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-2xl border border-border bg-background p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-2 text-amber-500 font-semibold text-sm">
              <Sparkles className="size-4" />
              <span>Próximamente / Coming Soon</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">
              🇪🇸 España — Lanzamiento muy pronto
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Estamos ultimando la versión adaptada a España (IRPF, Planes de Pensiones, PIAS y normativa local). Por ahora, la versión del Reino Unido es la única activa públicamente.
            </p>
            <div className="pt-2 flex justify-end">
              <button
                type="button"
                onClick={() => setShowNotice(false)}
                className="rounded-full bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground transition-opacity hover:opacity-90"
              >
                Entendido
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
