"use client";

import { Sparkles, Check } from "lucide-react";
import { useState } from "react";
import { DropPasteInput, type ImportPayload } from "@/components/DropPasteInput";
import type { FireInputs } from "@/lib/fire-engine";
import { sanitisePlanInput } from "@/lib/plan-storage";

export function PlanImport({
  onImport,
  onCancel,
}: {
  onImport: (plan: FireInputs) => void;
  onCancel: () => void;
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

      setReviewPlan(safePlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  const handleFieldChange = (key: string, rawVal: string) => {
    if (!reviewPlan) return;
    const num = parseFloat(rawVal);
    const val = isNaN(num) ? 0 : num;
    const updated = { ...reviewPlan };

    if (key === "currentAge") updated.currentAge = val;
    else if (key === "retirementAge") updated.retirementAge = val;
    else if (key === "targetAnnualIncome") updated.targetAnnualIncome = val;
    else if (
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
      (updated as unknown as Record<string, unknown>)[key] = val;
    } else {
      (updated as unknown as Record<string, unknown>)[key] = val;
    }

    setReviewPlan(updated);
  };

  const getDisplayFields = () => {
    if (!reviewPlan) return [];
    const fields: { key: string; label: string; val: number; prefix?: string; suffix?: string }[] = [];

    const fieldDefs: { key: string; label: string; prefix?: string; suffix?: string }[] = [
      { key: "currentAge", label: "Current Age", suffix: "yrs" },
      { key: "retirementAge", label: "Target Retirement Age", suffix: "yrs" },
      { key: "targetAnnualIncome", label: "Target Net Annual Income", prefix: "£", suffix: "/yr" },
      { key: "isaBalance", label: "ISA Balance", prefix: "£" },
      { key: "isaMonthlyContribution", label: "ISA Monthly Savings", prefix: "£", suffix: "/mo" },
      { key: "sippBalance", label: "SIPP (Pension) Balance", prefix: "£" },
      { key: "sippMonthlyContribution", label: "SIPP Monthly Savings", prefix: "£", suffix: "/mo" },
      { key: "giaBalance", label: "GIA (Taxable) Balance", prefix: "£" },
      { key: "giaMonthlyContribution", label: "GIA Monthly Savings", prefix: "£", suffix: "/mo" },
      { key: "homeValue", label: "Home Property Value", prefix: "£" },
      { key: "rentalValue", label: "Rental Property Value", prefix: "£" },
      { key: "rentalMonthlyIncome", label: "Rental Monthly Income", prefix: "£", suffix: "/mo" },
      { key: "partTimeAnnualIncome", label: "Part-time Annual Income", prefix: "£", suffix: "/yr" },
      { key: "sippAccessAge", label: "SIPP Access Age", suffix: "yrs" },
      { key: "statePensionAge", label: "State Pension Age", suffix: "yrs" },
    ];

    for (const def of fieldDefs) {
      let val: number | undefined;

      if (
        def.key === "isaBalance" ||
        def.key === "isaMonthlyContribution" ||
        def.key === "sippBalance" ||
        def.key === "sippMonthlyContribution" ||
        def.key === "giaBalance" ||
        def.key === "giaMonthlyContribution"
      ) {
        const potKey = def.key.startsWith("isa") ? "isa" : def.key.startsWith("sipp") ? "sipp" : "gia";
        const isContrib = def.key.endsWith("MonthlyContribution");
        val = reviewPlan.pots?.[potKey]?.[isContrib ? "monthlyContribution" : "balance"];
      }

      if (val === undefined) {
        const rawVal = (reviewPlan as unknown as Record<string, unknown>)[def.key];
        if (typeof rawVal === "number") val = rawVal;
      }

      if (val !== undefined && (val > 0 || def.key === "currentAge" || def.key === "retirementAge" || def.key === "targetAnnualIncome")) {
        fields.push({ ...def, val });
      }
    }

    return fields;
  };

  if (reviewPlan) {
    const fields = getDisplayFields();

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Review & Edit Imported Figures</h3>
        <p className="text-xs text-muted-foreground">
          Review what was extracted. You can edit any figure directly in the boxes below before confirming.
        </p>
        <div className="rounded-xl border border-border bg-surface-muted p-3 text-sm">
          <table className="w-full text-left">
            <tbody>
              {fields.map(({ key, label, val, prefix, suffix }) => (
                <tr key={key} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2.5 text-xs font-medium text-muted-foreground">{label}</td>
                  <td className="px-3 py-2.5 text-right">
                    <div className="inline-flex items-center justify-end gap-1">
                      {prefix && <span className="text-xs text-muted-foreground font-mono">{prefix}</span>}
                      <input
                        type="number"
                        value={val}
                        onChange={(e) => handleFieldChange(key, e.target.value)}
                        className="w-28 rounded-md border border-border bg-background px-2.5 py-1 text-right text-xs font-bold text-foreground focus:border-brand focus:outline-none focus:ring-1 focus:ring-brand"
                      />
                      {suffix && <span className="text-xs text-muted-foreground font-mono">{suffix}</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2 pt-1">
          <button
            onClick={() => onImport(reviewPlan)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90 transition-opacity"
          >
            <Check className="inline-block size-4 mr-1" />
            Accept & Continue
          </button>
          <button
            onClick={() => setReviewPlan(null)}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-muted transition-colors"
          >
            Try again
          </button>
        </div>
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
        Paste a statement or drop a file (CSV, PDF, image). We&apos;ll extract your balances, contributions, and holdings using AI. Note: Data is sent to Google Gemini for processing.
      </p>
      
      <DropPasteInput
        busy={busy}
        onPayload={handlePayload}
        onError={setError}
        placeholder="Paste text, or drop a PDF / image..."
      />
      
      {busy && <p className="text-xs text-muted-foreground">Reading plan with AI...</p>}
      {error && <p className="text-xs text-danger">{error}</p>}
      
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
