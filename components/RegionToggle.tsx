"use client";

import { usePlan } from "@/components/PlanProvider";
import { useSyncExternalStore } from "react";

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
    return <div className="h-9 w-24 rounded-full border border-border" />;
  }

  return (
    <select
      value={activeRegion}
      onChange={(e) => setActiveRegion(e.target.value as "uk" | "us")}
      aria-label="Select Region"
      className="h-9 items-center justify-center rounded-full border border-border bg-surface px-3 py-0 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
    >
      <option value="uk">🇬🇧 UK</option>
      <option value="us">🇺🇸 US</option>
    </select>
  );
}
