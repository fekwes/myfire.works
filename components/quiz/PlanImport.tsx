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

  const getLabelAndValue = (key: string, val: unknown): { label: string; formatted: string } | null => {
    if (val === null || val === undefined || val === 0) return null;
    if (Array.isArray(val) && val.length === 0) return null;

    const labels: Record<string, string> = {
      currentAge: "Current Age",
      retirementAge: "Target Retirement Age",
      targetAnnualIncome: "Target Net Annual Income",
      isaBalance: "ISA Balance",
      isaMonthlyContribution: "ISA Monthly Savings",
      sippBalance: "SIPP (Pension) Balance",
      sippMonthlyContribution: "SIPP Monthly Savings",
      giaBalance: "GIA (Taxable) Balance",
      giaMonthlyContribution: "GIA Monthly Savings",
      homeValue: "Home Property Value",
      rentalValue: "Rental Property Value",
      rentalMonthlyIncome: "Rental Monthly Income",
      partTimeAnnualIncome: "Part-time Annual Income",
      sippAccessAge: "SIPP Access Age",
      statePensionAge: "State Pension Age",
    };

    const label = labels[key] ?? key;
    let formatted = String(val);

    if (typeof val === "number") {
      if (key.includes("Age")) {
        formatted = `${val} years old`;
      } else if (key.includes("Monthly")) {
        formatted = `£${val.toLocaleString()}/mo`;
      } else if (key.includes("Annual") || key.includes("Income")) {
        formatted = `£${val.toLocaleString()}/yr`;
      } else if (key.includes("Balance") || key.includes("Value")) {
        formatted = `£${val.toLocaleString()}`;
      } else {
        formatted = val.toLocaleString();
      }
    } else if (typeof val === "object") {
      formatted = JSON.stringify(val);
    }

    return { label, formatted };
  };

  if (reviewPlan) {
    const entries = Object.entries(reviewPlan)
      .map(([k, v]) => getLabelAndValue(k, v))
      .filter((e): e is { label: string; formatted: string } => e !== null);

    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Review imported figures</h3>
        <p className="text-xs text-muted-foreground">Here is what was extracted from your plan. You can adjust these anytime.</p>
        <div className="rounded-xl border border-border bg-surface-muted p-2 text-sm">
          <table className="w-full text-left">
            <tbody>
              {entries.map(({ label, formatted }) => (
                <tr key={label} className="border-b border-border/50 last:border-0">
                  <td className="px-3 py-2 text-muted-foreground">{label}</td>
                  <td className="px-3 py-2 font-semibold text-foreground text-right">{formatted}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onImport(reviewPlan)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:opacity-90"
          >
            <Check className="inline-block size-4 mr-1" />
            Accept & Continue
          </button>
          <button
            onClick={() => setReviewPlan(null)}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground hover:bg-surface-muted"
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
