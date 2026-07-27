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
    return <div className="h-9 w-16 rounded-full border border-border" />;
  }

  const isUs = activeRegion === "us";

  return (
    <button
      type="button"
      onClick={() => setActiveRegion(isUs ? "uk" : "us")}
      aria-label={isUs ? "Switch to UK region" : "Switch to US region"}
      className="flex h-9 items-center justify-center gap-1.5 rounded-full border border-border bg-surface px-3 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
    >
      <span>{isUs ? "🇺🇸" : "🇬🇧"}</span>
      <span className="hidden sm:inline">{isUs ? "US" : "UK"}</span>
    </button>
  );
}
