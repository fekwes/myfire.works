"use client";

import { useRegion } from "@/components/RegionProvider";

export function RegionToggle({ className = "" }: { className?: string }) {
  const { region, setRegion } = useRegion();

  return (
    <div
      role="radiogroup"
      aria-label="Select tax jurisdiction"
      className={`inline-flex items-center rounded-full border border-border/80 bg-surface/90 p-0.5 shadow-xs backdrop-blur-xs transition-colors ${className}`}
    >
      <button
        type="button"
        role="radio"
        aria-checked={region === "uk"}
        onClick={() => setRegion("uk")}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.68rem] font-semibold tracking-wide transition-all ${
          region === "uk"
            ? "bg-brand text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span aria-hidden>🇬🇧</span>
        <span>UK (£)</span>
      </button>
      <button
        type="button"
        role="radio"
        aria-checked={region === "us"}
        onClick={() => setRegion("us")}
        className={`flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[0.68rem] font-semibold tracking-wide transition-all ${
          region === "us"
            ? "bg-brand text-primary-foreground shadow-xs"
            : "text-muted-foreground hover:text-foreground"
        }`}
      >
        <span aria-hidden>🇺🇸</span>
        <span>US ($)</span>
      </button>
    </div>
  );
}
