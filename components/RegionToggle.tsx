"use client";

import { Check, ChevronDown } from "lucide-react";
import { useSyncExternalStore } from "react";
import { usePlan } from "@/components/PlanProvider";
import { Menu } from "@/components/ui";

const emptySubscribe = () => () => {};

function useMounted() {
  return useSyncExternalStore(
    emptySubscribe,
    () => true,
    () => false,
  );
}

export function RegionToggle() {
  const { activeRegion, setActiveRegion } = usePlan();
  const mounted = useMounted();

  if (!mounted) {
    return (
      <div className="h-9 w-20 rounded-full border border-border bg-surface" />
    );
  }

  const items = [
    {
      label: "🇬🇧  UK",
      icon: activeRegion === "uk" ? <Check className="size-3.5 text-primary ml-auto" /> : <span className="size-3.5 ml-auto" />,
      onSelect: () => setActiveRegion("uk"),
    },
    {
      label: "🇺🇸  US",
      icon: activeRegion === "us" ? <Check className="size-3.5 text-primary ml-auto" /> : <span className="size-3.5 ml-auto" />,
      onSelect: () => setActiveRegion("us"),
    },
  ];

  const currentLabel = activeRegion === "us" ? "🇺🇸 US" : "🇬🇧 UK";

  return (
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
  );
}
