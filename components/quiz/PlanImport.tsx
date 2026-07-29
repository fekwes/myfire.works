"use client";

import { Sparkles, Check } from "lucide-react";
import { useState } from "react";
import { DropPasteInput, type ImportPayload } from "@/components/DropPasteInput";
import type { FireInputs } from "@/lib/fire-engine";
import { sanitisePlanInput } from "@/lib/plan-storage";

/** Profile fields to filter out so the review table focuses exclusively on financial assets & income */
const FILTERED_PROFILE_FIELDS = new Set([
  "currentAge",
  "retirementAge",
  "targetAnnualIncome",
  "contributionsUntilAge",
  "partTimeUntilAge",
  "inflationRate",
  "growthRate",
  "isaGrowth",
  "giaGrowth",
  "sippGrowth",
  "homeGrowth",
  "rentalGrowth",
  "downsizeAge",
  "downsizeReleaseFraction",
  "rentalSaleAge",
  "statePensionAge",
  "sippAccessAge",
  "pensionStrategy",
  "lifeExpectancyAge",
  "statePensionAnnual",
]);

export interface DisplayField {
  key: string;
  label: string;
  category: string;
  val: number;
  prefix?: string;
  suffix?: string;
}

export function getFinancialDisplayFields(
  plan: FireInputs,
  currencySymbol = "£"
): DisplayField[] {
  const definitions: {
    key: string;
    label: string;
    category: string;
    prefix?: string;
    suffix?: string;
  }[] = [
    {
      key: "isaBalance",
      label: "Stocks & Shares ISA Balance",
      category: "Account Wrappers",
      prefix: currencySymbol,
    },
    {
      key: "isaMonthlyContribution",
      label: "ISA Monthly Contribution",
      category: "Monthly Contributions",
      prefix: currencySymbol,
      suffix: "/mo",
    },
    {
      key: "sippBalance",
      label: "SIPP (Pension) Balance",
      category: "Account Wrappers",
      prefix: currencySymbol,
    },
    {
      key: "sippMonthlyContribution",
      label: "SIPP Monthly Contribution",
      category: "Monthly Contributions",
      prefix: currencySymbol,
      suffix: "/mo",
    },
    {
      key: "giaBalance",
      label: "GIA (Taxable) Balance",
      category: "Account Wrappers",
      prefix: currencySymbol,
    },
    {
      key: "giaMonthlyContribution",
      label: "GIA Monthly Contribution",
      category: "Monthly Contributions",
      prefix: currencySymbol,
      suffix: "/mo",
    },
    {
      key: "homeValue",
      label: "Home Property Value",
      category: "Property & Real Estate",
      prefix: currencySymbol,
    },
    {
      key: "rentalValue",
      label: "Rental Property Value",
      category: "Property & Real Estate",
      prefix: currencySymbol,
    },
    {
      key: "rentalMonthlyIncome",
      label: "Rental Monthly Income",
      category: "Income Sources",
      prefix: currencySymbol,
      suffix: "/mo",
    },
    {
      key: "partTimeAnnualIncome",
      label: "Part-time / Side Income",
      category: "Income Sources",
      prefix: currencySymbol,
      suffix: "/yr",
    },
  ];

  const fields: DisplayField[] = [];
  const planWithPots = plan as FireInputs & {
    pots?: Record<string, { balance?: number; monthlyContribution?: number }>;
  };

  for (const def of definitions) {
    if (FILTERED_PROFILE_FIELDS.has(def.key)) continue;

    let val: number | undefined;

    // Check pots dictionary fallback if present
    if (
      def.key === "isaBalance" ||
      def.key === "isaMonthlyContribution" ||
      def.key === "sippBalance" ||
      def.key === "sippMonthlyContribution" ||
      def.key === "giaBalance" ||
      def.key === "giaMonthlyContribution"
    ) {
      const potKey = def.key.startsWith("isa")
        ? "isa"
        : def.key.startsWith("sipp")
        ? "sipp"
        : "gia";
      const isContrib = def.key.endsWith("MonthlyContribution");
      val = planWithPots.pots?.[potKey]?.[isContrib ? "monthlyContribution" : "balance"];
    }

    if (val === undefined) {
      const rawVal = (plan as unknown as Record<string, unknown>)[def.key];
      if (typeof rawVal === "number") val = rawVal;
    }

    if (val !== undefined && val > 0) {
      fields.push({ ...def, val });
    }
  }

  // If no non-zero financial fields were found, show core wrapper & contribution fields so user can input figures
  if (fields.length === 0) {
    return [
      { key: "isaBalance", label: "Stocks & Shares ISA Balance", category: "Account Wrappers", val: plan.isaBalance ?? 0, prefix: currencySymbol },
      { key: "isaMonthlyContribution", label: "ISA Monthly Contribution", category: "Monthly Contributions", val: plan.isaMonthlyContribution ?? 0, prefix: currencySymbol, suffix: "/mo" },
      { key: "sippBalance", label: "SIPP (Pension) Balance", category: "Account Wrappers", val: plan.sippBalance ?? 0, prefix: currencySymbol },
      { key: "sippMonthlyContribution", label: "SIPP Monthly Contribution", category: "Monthly Contributions", val: plan.sippMonthlyContribution ?? 0, prefix: currencySymbol, suffix: "/mo" },
    ];
  }

  return fields;
}

export function PlanReview({
  plan,
  onChangePlan,
  onAccept,
  onBackToImport,
  currencySymbol = "£",
}: {
  plan: FireInputs;
  onChangePlan: (plan: FireInputs) => void;
  onAccept: () => void;
  onBackToImport?: () => void;
  currencySymbol?: string;
}) {
  const fields = getFinancialDisplayFields(plan, currencySymbol);

  const handleFieldChange = (key: string, rawVal: string) => {
    const num = parseFloat(rawVal);
    const val = isNaN(num) ? 0 : num;
    const updated = { ...plan } as FireInputs & {
      pots?: Record<string, { balance?: number; monthlyContribution?: number }>;
    };

    (updated as unknown as Record<string, unknown>)[key] = val;

    if (
      key === "isaBalance" ||
      key === "isaMonthlyContribution" ||
      key === "sippBalance" ||
      key === "sippMonthlyContribution" ||
      key === "giaBalance" ||
      key === "giaMonthlyContribution"
    ) {
      const potKey = key.startsWith("isa") ? "isa" : key.startsWith("sipp") ? "sipp" : "gia";
      const isContrib = key.endsWith("MonthlyContribution");
      const pots = { ...(updated.pots ?? {}) };
      const currentPot = pots[potKey] ?? { balance: 0, monthlyContribution: 0 };
      pots[potKey] = {
        ...currentPot,
        [isContrib ? "monthlyContribution" : "balance"]: val,
      };
      updated.pots = pots;
    }

    onChangePlan(updated);
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-surface-muted p-3 space-y-1 text-sm">
        <div className="divide-y divide-border/40">
          {fields.map(({ key, label, category, val, prefix, suffix }) => (
            <div key={key} className="flex items-center justify-between py-2.5 px-2">
              <div className="flex flex-col min-w-0 pr-2">
                <span className="text-xs font-semibold text-foreground truncate">{label}</span>
                <span className="text-[0.65rem] text-muted-foreground">{category}</span>
              </div>
              <div className="shrink-0 inline-flex items-center gap-1 rounded-md border border-border bg-background px-2.5 py-1 text-xs font-semibold focus-within:border-brand focus-within:ring-1 focus-within:ring-brand transition-all">
                {prefix && <span className="text-muted-foreground font-mono text-xs">{prefix}</span>}
                <input
                  type="number"
                  value={val === 0 ? "" : val}
                  placeholder="0"
                  onChange={(e) => handleFieldChange(key, e.target.value)}
                  className="w-28 text-right bg-transparent text-xs font-bold text-foreground outline-none tabular-nums"
                />
                {suffix && <span className="text-muted-foreground font-mono text-xs">{suffix}</span>}
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center gap-2 pt-1">
        <button
          type="button"
          onClick={onAccept}
          className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-brand px-4 py-2.5 text-sm font-semibold text-brand-foreground shadow transition-colors hover:bg-brand/90"
        >
          <Check className="size-4" />
          Accept & Continue
        </button>
        {onBackToImport && (
          <button
            type="button"
            onClick={onBackToImport}
            className="rounded-xl border border-border bg-background px-4 py-2.5 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground hover:bg-surface-muted"
          >
            Re-import
          </button>
        )}
      </div>
    </div>
  );
}

export function PlanImport({
  onImport,
  onCancel,
  placeholder,
  currencySymbol = "£",
  skipReview = true,
}: {
  onImport: (plan: FireInputs) => void;
  onCancel: () => void;
  placeholder?: string;
  currencySymbol?: string;
  skipReview?: boolean;
}) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [reviewPlan, setReviewPlan] = useState<FireInputs | null>(null);

  const handlePayload = async (payload: ImportPayload) => {
    setBusy(true);
    setError(null);
    try {
      const body = payload.type === "text" ? { text: payload.text } : { file: payload };
      const res = await fetch("/api/import-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data.plan) {
        throw new Error(data.error ?? "Import failed.");
      }

      const raw = data.plan;
      raw.currentAge = raw.currentAge ?? 35;
      raw.retirementAge = raw.retirementAge ?? 55;
      raw.targetAnnualIncome = raw.targetAnnualIncome ?? 30000;

      const safePlan = sanitisePlanInput(raw);
      if (!safePlan) throw new Error("Plan was unreadable.");

      if (skipReview) {
        onImport(safePlan);
      } else {
        setReviewPlan(safePlan);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  if (reviewPlan) {
    const hasDetectedBalances =
      (reviewPlan.isaBalance ?? 0) > 0 ||
      (reviewPlan.sippBalance ?? 0) > 0 ||
      (reviewPlan.giaBalance ?? 0) > 0 ||
      (reviewPlan.homeValue ?? 0) > 0 ||
      (reviewPlan.rentalValue ?? 0) > 0;

    return (
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold">Review & Validate Financial Assets</h3>
          <p className="text-xs text-muted-foreground">
            Review what was extracted. You can edit any figure directly in the inputs below.
          </p>
        </div>

        {!hasDetectedBalances && (
          <div className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-3 text-xs text-amber-300 space-y-1">
            <p className="font-semibold">⚠️ No wrapper balances automatically detected in this file.</p>
            <p className="text-amber-200/80">
              Please enter your ISA, SIPP, and GIA figures directly in the fields below, or paste a text summary.
            </p>
          </div>
        )}

        <PlanReview
          plan={reviewPlan}
          onChangePlan={setReviewPlan}
          onAccept={() => onImport(reviewPlan)}
          onBackToImport={() => setReviewPlan(null)}
          currencySymbol={currencySymbol}
        />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 text-brand">
        <Sparkles className="size-4" />
        <h3 className="text-sm font-semibold">Import your full plan</h3>
      </div>
      <p className="text-xs text-muted-foreground">
        Paste a statement or drop a file (CSV, PDF, image). We&apos;ll extract your balances, contributions, and holdings using AI.
      </p>

      <DropPasteInput
        busy={busy}
        onPayload={handlePayload}
        onError={setError}
        placeholder={
          placeholder ??
          "e.g. I have £35k in Stocks & Shares ISA in Vanguard FTSE Global All Cap (adding £500/mo), £150k SIPP in HSBC FTSE 250 (adding £1,000/mo), £20k GIA, £450k home value, and £800/mo rental income..."
        }
      />

      {busy && <p className="text-xs text-muted-foreground animate-pulse">Reading plan with AI...</p>}
      {error && <p className="text-xs text-danger font-medium">{error}</p>}

      {!busy && !reviewPlan && (
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-muted-foreground underline hover:text-foreground"
        >
          Cancel import
        </button>
      )}
    </div>
  );
}
