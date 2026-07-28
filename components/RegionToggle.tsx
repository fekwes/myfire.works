"use client";

import { Check, ChevronDown } from "lucide-react";
import { useSyncExternalStore } from "react";
import { usePlan } from "@/components/PlanProvider";
import { Menu, type MenuItem } from "@/components/ui";
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

const BADGE_STYLE =
  "text-[10px] font-semibold text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded-full border border-amber-400/25";

export function RegionToggle() {
  const { activeRegion, setActiveRegion } = usePlan();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className="h-9 w-20 rounded-full border border-border bg-surface" />
    );
  }

  const esEnabled = isCountryEnabled("es");

  const items: MenuItem[] = [
    {
      label: "United Kingdom",
      icon: <span className="text-base">🇬🇧</span>,
      badge: activeRegion === "uk" ? <Check className="size-4 text-primary" /> : null,
      onSelect: () => {
        trackEvent("Region Selected", { country: "uk" });
        setActiveRegion("uk");
      },
    },
    {
      label: "España",
      icon: <span className="text-base">🇪🇸</span>,
      badge:
        activeRegion === "es" ? (
          <Check className="size-4 text-primary" />
        ) : !esEnabled ? (
          <span className={BADGE_STYLE}>
            Próximamente
          </span>
        ) : null,
      onSelect: () => {
        trackEvent(ANALYTICS_EVENTS.COMING_SOON_CTA_CLICKED, { country: "es" });
        setActiveRegion("es");
      },
    },
    {
      label: "United States",
      icon: <span className="text-base">🇺🇸</span>,
      badge:
        activeRegion === "us" ? (
          <Check className="size-4 text-primary" />
        ) : (
          <span className={BADGE_STYLE}>
            Coming Soon
          </span>
        ),
      onSelect: () => {
        trackEvent(ANALYTICS_EVENTS.COMING_SOON_CTA_CLICKED, { country: "us" });
        setActiveRegion("us");
      },
    },
  ];

  const currentLabel =
    activeRegion === "es" ? "🇪🇸 ES" : activeRegion === "us" ? "🇺🇸 US" : "🇬🇧 UK";

  return (
    <div onPointerDown={() => trackEvent(ANALYTICS_EVENTS.REGION_SELECTOR_VIEWED)}>
      <Menu
        menuLabel="Select Region"
        widthClassName="w-60"
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
  );
}
