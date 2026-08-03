"use client";

import { PieChart } from "lucide-react";
import type { Holding } from "@/lib/assets";

export interface PortfolioSplit {
  equity: number; // 0 - 100
  bonds: number;  // 0 - 100
  cash: number;   // 0 - 100
}

export function splitToHoldings(split: PortfolioSplit): Holding[] {
  const total = split.equity + split.bonds + split.cash;
  if (total <= 0) return [];

  const holdings: Holding[] = [];
  if (split.equity > 0) {
    holdings.push({
      label: "Global Equity",
      assetClass: "global-equity",
      ocf: 0.0022,
      weight: split.equity / total,
    });
  }
  if (split.bonds > 0) {
    holdings.push({
      label: "Global Bonds",
      assetClass: "global-bonds",
      ocf: 0.0015,
      weight: split.bonds / total,
    });
  }
  if (split.cash > 0) {
    holdings.push({
      label: "Cash / Money Market",
      assetClass: "cash",
      ocf: 0.001,
      weight: split.cash / total,
    });
  }
  return holdings;
}

export function holdingsToSplit(holdings?: Holding[]): PortfolioSplit {
  if (!holdings || holdings.length === 0) {
    return { equity: 0, bonds: 0, cash: 100 };
  }

  let eq = 0;
  let bd = 0;
  let cs = 0;

  for (const h of holdings) {
    const w = Math.max(0, h.weight ?? 0);
    if (h.assetClass.includes("equity")) eq += w;
    else if (h.assetClass.includes("bond")) bd += w;
    else if (h.assetClass.includes("cash")) cs += w;
    else if (h.assetClass.includes("80")) {
      eq += w * 0.8;
      bd += w * 0.2;
    } else if (h.assetClass.includes("60")) {
      eq += w * 0.6;
      bd += w * 0.4;
    } else if (h.assetClass.includes("100")) {
      eq += w;
    } else {
      eq += w;
    }
  }

  const total = eq + bd + cs;
  if (total <= 0) return { equity: 0, bonds: 0, cash: 100 };

  const exact = [
    { key: "equity", val: (eq / total) * 100 },
    { key: "bonds", val: (bd / total) * 100 },
    { key: "cash", val: (cs / total) * 100 },
  ];
  
  const floored = exact.map(x => ({ key: x.key, floor: Math.floor(x.val), diff: x.val - Math.floor(x.val) }));
  const currentSum = floored.reduce((sum, x) => sum + x.floor, 0);
  
  floored.sort((a, b) => b.diff - a.diff);
  
  for (let i = 0; i < 100 - currentSum; i++) {
    floored[i].floor += 1;
  }
  
  return {
    equity: floored.find(x => x.key === "equity")!.floor,
    bonds: floored.find(x => x.key === "bonds")!.floor,
    cash: floored.find(x => x.key === "cash")!.floor,
  };
}

export function PortfolioAllocationSlider({
  split,
  onChange,
}: {
  split: PortfolioSplit;
  onChange: (split: PortfolioSplit) => void;
}) {
  const handleEquityChange = (newEquity: number) => {
    const remaining = Math.max(0, 100 - newEquity);
    // Keep existing ratio between bonds & cash
    const currentBondsCash = split.bonds + split.cash;
    let newBonds = 0;
    let newCash = remaining;

    if (currentBondsCash > 0) {
      newBonds = Math.round(remaining * (split.bonds / currentBondsCash));
      newCash = remaining - newBonds;
    } else {
      newBonds = Math.round(remaining * 0.7);
      newCash = remaining - newBonds;
    }

    onChange({ equity: newEquity, bonds: newBonds, cash: newCash });
  };

  const handleBondsChange = (newBonds: number) => {
    const remaining = Math.max(0, 100 - split.equity);
    const bondsClamped = Math.min(remaining, Math.max(0, newBonds));
    const cash = remaining - bondsClamped;
    onChange({ equity: split.equity, bonds: bondsClamped, cash });
  };

  const total = Math.max(1, split.equity + split.bonds + split.cash);
  const eqPct = Math.round((split.equity / total) * 100);
  const bdPct = Math.round((split.bonds / total) * 100);
  const csPct = 100 - eqPct - bdPct;

  return (
    <div className="space-y-3 rounded-xl border border-border/80 bg-surface-muted/60 p-3.5 text-xs">
      <div className="space-y-1">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-foreground">
            <PieChart className="size-4 text-brand" />
            <span>Rough Portfolio Mix</span>
          </div>
          <span className="font-mono text-[0.7rem] text-muted-foreground">
            {eqPct}% Equities · {bdPct}% Bonds · {csPct}% Cash
          </span>
        </div>
        <p className="text-[0.68rem] text-muted-foreground leading-normal">
          💡 You will be able to define specific funds and individual holdings later when editing your portfolio in the planner.
        </p>
      </div>

      {/* Visual Allocation Bar */}
      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-surface">
        <div
          style={{ width: `${eqPct}%` }}
          className="bg-emerald-500 transition-all duration-300"
          title={`Equities: ${eqPct}%`}
        />
        <div
          style={{ width: `${bdPct}%` }}
          className="bg-blue-500 transition-all duration-300"
          title={`Bonds: ${bdPct}%`}
        />
        <div
          style={{ width: `${csPct}%` }}
          className="bg-amber-500 transition-all duration-300"
          title={`Cash: ${csPct}%`}
        />
      </div>

      {/* Quick Mix Presets */}
      <div className="flex flex-wrap gap-1.5 pt-1">
        <button
          type="button"
          aria-label="Set to 100% Equities"
          onClick={() => onChange({ equity: 100, bonds: 0, cash: 0 })}
          className={`rounded-md border px-2 py-1 text-[0.68rem] font-medium transition-all active:scale-95 ${
            eqPct >= 95 ? "border-brand bg-brand/15 text-brand" : "border-border hover:bg-surface hover:border-muted-foreground/30"
          }`}
        >
          100% Equities
        </button>
        <button
          type="button"
          aria-label="Set to 80% Equities, 20% Bonds"
          onClick={() => onChange({ equity: 80, bonds: 20, cash: 0 })}
          className={`rounded-md border px-2 py-1 text-[0.68rem] font-medium transition-all active:scale-95 ${
            eqPct === 80 && bdPct === 20 ? "border-brand bg-brand/15 text-brand" : "border-border hover:bg-surface hover:border-muted-foreground/30"
          }`}
        >
          80 / 20 Growth
        </button>
        <button
          type="button"
          aria-label="Set to 60% Equities, 40% Bonds"
          onClick={() => onChange({ equity: 60, bonds: 40, cash: 0 })}
          className={`rounded-md border px-2 py-1 text-[0.68rem] font-medium transition-all active:scale-95 ${
            eqPct === 60 && bdPct === 40 ? "border-brand bg-brand/15 text-brand" : "border-border hover:bg-surface hover:border-muted-foreground/30"
          }`}
        >
          60 / 40 Balanced
        </button>
        <button
          type="button"
          aria-label="Set to 100% Cash"
          onClick={() => onChange({ equity: 0, bonds: 0, cash: 100 })}
          className={`rounded-md border px-2 py-1 text-[0.68rem] font-medium transition-all active:scale-95 ${
            csPct >= 95 ? "border-brand bg-brand/15 text-brand" : "border-border hover:bg-surface hover:border-muted-foreground/30"
          }`}
        >
          100% Cash
        </button>
      </div>

      {/* Interactive Range Sliders */}
      <div className="space-y-2.5 pt-1">
        <div>
          <div className="flex justify-between font-medium text-muted-foreground pb-0.5">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-emerald-500" />
              Equities (Stocks & Shares)
            </span>
            <span className="font-mono text-foreground font-semibold">{eqPct}%</span>
          </div>
          <input
            type="range"
            aria-label="Equities percentage"
            min={0}
            max={100}
            step={5}
            value={split.equity}
            onChange={(e) => handleEquityChange(parseInt(e.target.value, 10))}
            className="w-full h-2 rounded-lg bg-surface border border-border/50 accent-emerald-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none [&::-webkit-slider-runnable-track]:bg-surface-muted [&::-webkit-slider-runnable-track]:rounded-lg [&::-moz-range-track]:bg-surface-muted [&::-moz-range-track]:rounded-lg"
          />
        </div>

        <div>
          <div className="flex justify-between font-medium text-muted-foreground pb-0.5">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-blue-500" />
              Bonds (Fixed Income)
            </span>
            <span className="font-mono text-foreground font-semibold">{bdPct}%</span>
          </div>
          <input
            type="range"
            aria-label="Bonds percentage"
            min={0}
            max={100 - split.equity}
            step={5}
            value={split.bonds}
            onChange={(e) => handleBondsChange(parseInt(e.target.value, 10))}
            className="w-full h-2 rounded-lg bg-surface border border-border/50 accent-blue-500 cursor-pointer focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none [&::-webkit-slider-runnable-track]:bg-surface-muted [&::-webkit-slider-runnable-track]:rounded-lg [&::-moz-range-track]:bg-surface-muted [&::-moz-range-track]:rounded-lg"
          />
        </div>

        <div>
          <div className="flex justify-between font-medium text-muted-foreground pb-0.5">
            <span className="flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-amber-500" />
              Cash & Savings
            </span>
            <span className="font-mono text-foreground font-semibold">{csPct}%</span>
          </div>
          <div className="text-[0.65rem] text-muted-foreground italic">
            Calculated automatically from remaining allocation.
          </div>
        </div>
      </div>
    </div>
  );
}
