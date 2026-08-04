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


function CurrencyInput({
  value,
  onChange,
  placeholder,
  className,
}: {
  value: number;
  onChange: (val: number) => void;
  placeholder?: string;
  className?: string;
}) {
  const [draft, setDraft] = useState<string | null>(null);
  const shown = draft ?? (value === 0 ? "" : String(value));

  return (
    <input
      type="text"
      inputMode="decimal"
      autoComplete="off"
      value={shown}
      placeholder={placeholder}
      className={className}
      onChange={(e) => {
        // Allow digits, single decimal point, and empty string
        const raw = e.target.value.replace(/[^0-9.]/g, "");
        // Prevent multiple decimal points
        const parts = raw.split(".");
        const sanitised = parts.length > 2
          ? parts[0] + "." + parts.slice(1).join("")
          : raw;
        setDraft(sanitised);
        const num = parseFloat(sanitised);
        if (!isNaN(num)) {
          onChange(Math.max(0, num));
        } else if (sanitised === "" || sanitised === ".") {
          onChange(0);
        }
      }}
      onBlur={() => setDraft(null)}
    />
  );
}

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

  const currentSplit = holdingsToSplit(
    plan.pots?.isa?.holdings ?? plan.pots?.sipp?.holdings ?? plan.pots?.gia?.holdings ?? 
    plan.isaHoldings ?? plan.sippHoldings ?? plan.giaHoldings
  );

  const handleFieldChange = (key: keyof FireInputs, rawVal: number | string) => {
    const num = typeof rawVal === "number" ? rawVal : parseFloat(rawVal);
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
                <div className="flex items-center gap-1 rounded-md border border-border bg-surface-muted px-2.5 py-1 text-xs focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all">
                  <span className="text-muted-foreground font-mono" aria-hidden="true">{currencySymbol}</span>
                  <CurrencyInput value={plan.isaBalance ?? 0} placeholder="0" onChange={(v) => handleFieldChange("isaBalance", v)} className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums" />
                </div>
              </div>
              <div>
                <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
                  Monthly Contrib.
                </label>
                <div className="flex items-center gap-1 rounded-md border border-border bg-surface-muted px-2.5 py-1 text-xs focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all">
                  <span className="text-muted-foreground font-mono" aria-hidden="true">{currencySymbol}</span>
                  <CurrencyInput value={plan.isaMonthlyContribution ?? 0} placeholder="0" onChange={(v) => handleFieldChange("isaMonthlyContribution", v)} className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums" />
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
                <div className="flex items-center gap-1 rounded-md border border-border bg-surface-muted px-2.5 py-1 text-xs focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all">
                  <span className="text-muted-foreground font-mono" aria-hidden="true">{currencySymbol}</span>
                  <CurrencyInput value={plan.sippBalance ?? 0} placeholder="0" onChange={(v) => handleFieldChange("sippBalance", v)} className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums" />
                </div>
              </div>
              <div>
                <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
                  Monthly Contrib.
                </label>
                <div className="flex items-center gap-1 rounded-md border border-border bg-surface-muted px-2.5 py-1 text-xs focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all">
                  <span className="text-muted-foreground font-mono" aria-hidden="true">{currencySymbol}</span>
                  <CurrencyInput value={plan.sippMonthlyContribution ?? 0} placeholder="0" onChange={(v) => handleFieldChange("sippMonthlyContribution", v)} className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums" />
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
                <div className="flex items-center gap-1 rounded-md border border-border bg-surface-muted px-2.5 py-1 text-xs focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all">
                  <span className="text-muted-foreground font-mono" aria-hidden="true">{currencySymbol}</span>
                  <CurrencyInput value={plan.giaBalance ?? 0} placeholder="0" onChange={(v) => handleFieldChange("giaBalance", v)} className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums" />
                </div>
              </div>
              <div>
                <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
                  Monthly Contrib.
                </label>
                <div className="flex items-center gap-1 rounded-md border border-border bg-surface-muted px-2.5 py-1 text-xs focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all">
                  <span className="text-muted-foreground font-mono" aria-hidden="true">{currencySymbol}</span>
                  <CurrencyInput value={plan.giaMonthlyContribution ?? 0} placeholder="0" onChange={(v) => handleFieldChange("giaMonthlyContribution", v)} className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums" />
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
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-border/50 animate-in fade-in slide-in-from-top-2 duration-300">
            <div>
              <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
                Home Value
              </label>
              <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all">
                <span className="text-muted-foreground font-mono" aria-hidden="true">{currencySymbol}</span>
                <CurrencyInput value={plan.homeValue ?? 0} placeholder="0" onChange={(v) => handleFieldChange("homeValue", v)} className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums" />
              </div>
            </div>
            <div>
              <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
                Rental Value
              </label>
              <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all">
                <span className="text-muted-foreground font-mono" aria-hidden="true">{currencySymbol}</span>
                <CurrencyInput value={plan.rentalValue ?? 0} placeholder="0" onChange={(v) => handleFieldChange("rentalValue", v)} className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums" />
              </div>
            </div>
            <div className="col-span-2">
              <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
                Rental Monthly Net Income
              </label>
              <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all">
                <span className="text-muted-foreground font-mono" aria-hidden="true">{currencySymbol}</span>
                <CurrencyInput value={plan.rentalMonthlyIncome ?? 0} placeholder="0" onChange={(v) => handleFieldChange("rentalMonthlyIncome", v)} className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums" />
                <span className="text-[0.65rem] text-muted-foreground font-mono">/mo</span>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Defined Benefit Pension (Optional Collapsible) */}
      <div className="rounded-xl border border-border bg-surface-muted/60 p-3.5 space-y-2">
        <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
          <Landmark className="size-4 text-brand" />
          <span>Defined Benefit (Final Salary) Pension</span>
        </div>
        <div className="grid grid-cols-2 gap-2 pt-1">
          <div>
            <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
              Annual Pension Income
            </label>
            <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all">
              <span className="text-muted-foreground font-mono" aria-hidden="true">{currencySymbol}</span>
              <CurrencyInput
                value={plan.dbPensionAnnualIncome ?? 0}
                placeholder="0"
                onChange={(v) => handleFieldChange("dbPensionAnnualIncome", v)}
                className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums"
              />
              <span className="text-[0.65rem] text-muted-foreground font-mono">/yr</span>
            </div>
          </div>
          <div>
            <label className="text-[0.68rem] font-medium text-muted-foreground block mb-1">
              Starts at Age
            </label>
            <div className="flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all">
              <CurrencyInput
                value={plan.dbPensionStartingAge ?? 60}
                placeholder="60"
                onChange={(v) => handleFieldChange("dbPensionStartingAge", v)}
                className="w-full text-right bg-transparent font-bold text-foreground outline-none tabular-nums"
              />
              <span className="text-[0.65rem] text-muted-foreground font-mono">yrs</span>
            </div>
          </div>
        </div>
      </div>

      {/* Expected Lump Sums (Inheritance / Donations / Sales) */}
      <div className="rounded-xl border border-border bg-surface-muted/60 p-3.5 space-y-2">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-1.5 font-semibold text-xs text-foreground">
            <Landmark className="size-4 text-brand" />
            <span>Expected Lump Sums (Inheritance, Gifts, Sales)</span>
          </div>
          <button
            type="button"
            onClick={() => {
              const current = plan.expectedLumpSums ?? [];
              onChangePlan({
                ...plan,
                expectedLumpSums: [
                  ...current,
                  { amount: 50000, expectedAge: 60, description: "Inheritance / Gift" },
                ],
              });
            }}
            className="text-[0.68rem] font-medium text-brand hover:underline"
          >
            + Add Lump Sum
          </button>
        </div>

        {(plan.expectedLumpSums ?? []).length > 0 && (
          <div className="space-y-2 pt-1">
            {(plan.expectedLumpSums ?? []).map((ls, idx) => (
              <div key={idx} className="grid grid-cols-12 gap-1.5 items-center rounded-lg border border-border bg-background p-2 text-xs">
                <div className="col-span-4">
                  <input
                    type="text"
                    value={ls.description}
                    placeholder="e.g. Inheritance"
                    onChange={(e) => {
                      const updated = [...(plan.expectedLumpSums ?? [])];
                      updated[idx] = { ...updated[idx], description: e.target.value };
                      onChangePlan({ ...plan, expectedLumpSums: updated });
                    }}
                    className="w-full bg-transparent text-xs font-medium text-foreground outline-none border-b border-border focus:border-brand"
                  />
                </div>
                <div className="col-span-4 flex items-center gap-0.5 rounded border border-border bg-surface-muted px-1.5 py-0.5">
                  <span className="text-[0.65rem] text-muted-foreground font-mono">{currencySymbol}</span>
                  <CurrencyInput
                    value={ls.amount}
                    onChange={(v) => {
                      const updated = [...(plan.expectedLumpSums ?? [])];
                      updated[idx] = { ...updated[idx], amount: v };
                      onChangePlan({ ...plan, expectedLumpSums: updated });
                    }}
                    className="w-full text-right bg-transparent font-bold text-foreground text-xs outline-none tabular-nums"
                  />
                </div>
                <div className="col-span-3 flex items-center gap-0.5 rounded border border-border bg-surface-muted px-1 py-0.5">
                  <CurrencyInput
                    value={ls.expectedAge}
                    onChange={(v) => {
                      const updated = [...(plan.expectedLumpSums ?? [])];
                      updated[idx] = { ...updated[idx], expectedAge: v };
                      onChangePlan({ ...plan, expectedLumpSums: updated });
                    }}
                    className="w-full text-right bg-transparent font-bold text-foreground text-xs outline-none tabular-nums"
                  />
                  <span className="text-[0.6rem] text-muted-foreground font-mono">yrs</span>
                </div>
                <button
                  type="button"
                  onClick={() => {
                    const updated = (plan.expectedLumpSums ?? []).filter((_, i) => i !== idx);
                    onChangePlan({ ...plan, expectedLumpSums: updated });
                  }}
                  className="col-span-1 text-xs text-danger font-bold hover:opacity-80 text-center"
                  title="Remove lump sum"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="pt-2">
        <button
          type="button"
          onClick={onAccept}
          className="w-full inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-3 text-sm font-semibold text-brand-foreground shadow transition-transform hover:bg-brand/90 active:scale-[0.98]"
        >
          <Check className="size-4" />
          Save & Continue to Plan
        </button>
      </div>
    </div>
  );
}
