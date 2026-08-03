"use client";

import { Check, Home, Landmark, Wallet } from "lucide-react";
import { useState } from "react";
import type { FireInputs } from "@/lib/fire-engine";
import {
  holdingsToSplit,
  PortfolioAllocationSlider,
  type PortfolioSplit,
  splitToHoldings,
} from "@/components/quiz/PortfolioAllocationSlider";

export function ManualAssetEntry({
  plan,
  onChangePlan,
  onAccept,
  currencySymbol = "£",
}: {
  plan: FireInputs;
  onChangePlan: (plan: FireInputs) => void;
  onAccept: () => void;
  currencySymbol?: string;
}) {
  const [showProperty, setShowProperty] = useState(
    (plan.homeValue ?? 0) > 0 || (plan.rentalValue ?? 0) > 0 || (plan.rentalMonthlyIncome ?? 0) > 0,
  );

  const currentSplit = holdingsToSplit(plan.isaHoldings ?? plan.sippHoldings ?? plan.giaHoldings);

  const handleFieldChange = (key: keyof FireInputs, rawVal: string) => {
    const num = parseFloat(rawVal);
    const val = isNaN(num) ? 0 : Math.max(0, num);
    const updated = { ...plan, [key]: val };
    onChangePlan(updated);
  };

  const handleSplitChange = (nextSplit: PortfolioSplit) => {
    const holdings = splitToHoldings(nextSplit);
    onChangePlan({
      ...plan,
      isaHoldings: holdings,
      sippHoldings: holdings,
      giaHoldings: holdings,
    });
  };

  return (
    <div className="space-y-4">
      {/* Account Wrappers & Monthly Contributions */}
      <div className="rounded-xl border border-border bg-surface-muted/60 p-3.5 space-y-3">
        <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
          <Wallet className="size-4 text-brand" />
          <span>Account Wrappers & Monthly Savings</span>
        </div>

        <div className="space-y-3">
          {/* Stocks & Shares ISA */}
          <div className="rounded-lg border border-border bg-background p-3 space-y-2">
            <span className="text-xs font-semibold text-foreground block">Stocks & Shares ISA</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
                  Balance
                </label>
                <div className="flex items-center gap-1 rounded-md border border-border bg-surface-muted px-2.5 py-1 text-xs focus-within:border-brand">
                  <span className="text-muted-foreground font-mono">{currencySymbol}</span>
                  <input
                    type="number"
                    value={plan.isaBalance === 0 ? "" : plan.isaBalance}
                    placeholder="0"
                    onChange={(e) => handleFieldChange("isaBalance", e.target.value)}
                    className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
                  Monthly Contrib.
                </label>
                <div className="flex items-center gap-1 rounded-md border border-border bg-surface-muted px-2.5 py-1 text-xs focus-within:border-brand">
                  <span className="text-muted-foreground font-mono">{currencySymbol}</span>
                  <input
                    type="number"
                    value={plan.isaMonthlyContribution === 0 ? "" : plan.isaMonthlyContribution}
                    placeholder="0"
                    onChange={(e) => handleFieldChange("isaMonthlyContribution", e.target.value)}
                    className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums"
                  />
                  <span className="text-[0.65rem] text-muted-foreground font-mono">/mo</span>
                </div>
              </div>
            </div>
          </div>

          {/* SIPP (Personal Pension) */}
          <div className="rounded-lg border border-border bg-background p-3 space-y-2">
            <span className="text-xs font-semibold text-foreground block">SIPP (Personal Pension)</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
                  Balance
                </label>
                <div className="flex items-center gap-1 rounded-md border border-border bg-surface-muted px-2.5 py-1 text-xs focus-within:border-brand">
                  <span className="text-muted-foreground font-mono">{currencySymbol}</span>
                  <input
                    type="number"
                    value={plan.sippBalance === 0 ? "" : plan.sippBalance}
                    placeholder="0"
                    onChange={(e) => handleFieldChange("sippBalance", e.target.value)}
                    className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
                  Monthly Contrib.
                </label>
                <div className="flex items-center gap-1 rounded-md border border-border bg-surface-muted px-2.5 py-1 text-xs focus-within:border-brand">
                  <span className="text-muted-foreground font-mono">{currencySymbol}</span>
                  <input
                    type="number"
                    value={plan.sippMonthlyContribution === 0 ? "" : plan.sippMonthlyContribution}
                    placeholder="0"
                    onChange={(e) => handleFieldChange("sippMonthlyContribution", e.target.value)}
                    className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums"
                  />
                  <span className="text-[0.65rem] text-muted-foreground font-mono">/mo</span>
                </div>
              </div>
            </div>
          </div>

          {/* GIA (General Investment Account) */}
          <div className="rounded-lg border border-border bg-background p-3 space-y-2">
            <span className="text-xs font-semibold text-foreground block">GIA (Taxable Brokerage)</span>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
                  Balance
                </label>
                <div className="flex items-center gap-1 rounded-md border border-border bg-surface-muted px-2.5 py-1 text-xs focus-within:border-brand">
                  <span className="text-muted-foreground font-mono">{currencySymbol}</span>
                  <input
                    type="number"
                    value={plan.giaBalance === 0 ? "" : plan.giaBalance}
                    placeholder="0"
                    onChange={(e) => handleFieldChange("giaBalance", e.target.value)}
                    className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums"
                  />
                </div>
              </div>
              <div>
                <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
                  Monthly Contrib.
                </label>
                <div className="flex items-center gap-1 rounded-md border border-border bg-surface-muted px-2.5 py-1 text-xs focus-within:border-brand">
                  <span className="text-muted-foreground font-mono">{currencySymbol}</span>
                  <input
                    type="number"
                    value={plan.giaMonthlyContribution === 0 ? "" : plan.giaMonthlyContribution}
                    placeholder="0"
                    onChange={(e) => handleFieldChange("giaMonthlyContribution", e.target.value)}
                    className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums"
                  />
                  <span className="text-[0.65rem] text-muted-foreground font-mono">/mo</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Rough Portfolio Allocation Double Slider */}
      <PortfolioAllocationSlider split={currentSplit} onChange={handleSplitChange} />

      {/* Property & Real Estate (Optional Collapsible) */}
      <div className="rounded-xl border border-border bg-surface-muted/60 p-3.5 space-y-2">
        <button
          type="button"
          onClick={() => setShowProperty(!showProperty)}
          className="flex w-full items-center justify-between text-xs font-semibold text-foreground text-left"
        >
          <div className="flex items-center gap-1.5">
            <Home className="size-4 text-brand" />
            <span>Property & Rental Income (Optional)</span>
          </div>
          <span className="text-[0.68rem] text-brand underline font-medium">
            {showProperty ? "Hide" : "+ Add Property"}
          </span>
        </button>

        {showProperty && (
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50">
            <div>
              <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
                Home Value
              </label>
              <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs">
                <span className="text-muted-foreground font-mono">{currencySymbol}</span>
                <input
                  type="number"
                  value={plan.homeValue === 0 ? "" : plan.homeValue}
                  placeholder="0"
                  onChange={(e) => handleFieldChange("homeValue", e.target.value)}
                  className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums"
                />
              </div>
            </div>
            <div>
              <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
                Rental Value
              </label>
              <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs">
                <span className="text-muted-foreground font-mono">{currencySymbol}</span>
                <input
                  type="number"
                  value={plan.rentalValue === 0 ? "" : plan.rentalValue}
                  placeholder="0"
                  onChange={(e) => handleFieldChange("rentalValue", e.target.value)}
                  className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums"
                />
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
                Rental Monthly Net Income
              </label>
              <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs">
                <span className="text-muted-foreground font-mono">{currencySymbol}</span>
                <input
                  type="number"
                  value={plan.rentalMonthlyIncome === 0 ? "" : plan.rentalMonthlyIncome}
                  placeholder="0"
                  onChange={(e) => handleFieldChange("rentalMonthlyIncome", e.target.value)}
                  className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums"
                />
                <span className="text-[0.65rem] text-muted-foreground font-mono">/mo</span>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onAccept}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground shadow transition-colors hover:bg-brand/90"
        >
          <Check className="size-4" />
          Save & Continue to Plan
        </button>
      </div>
    </div>
  );
}
