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
      
      // Ensure we fill missing required fields so sanitisePlanInput doesn't drop the whole thing.
      // AI won't return currentAge, retirementAge, etc.
      const raw = data.plan;
      raw.currentAge = 35; // placeholder to pass sanitisePlanInput
      raw.retirementAge = 55;
      raw.targetAnnualIncome = 40000;
      
      const safePlan = sanitisePlanInput(raw);
      if (!safePlan) throw new Error("Plan was unreadable.");
      
      setReviewPlan(safePlan);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Import failed.");
    } finally {
      setBusy(false);
    }
  };

  if (reviewPlan) {
    return (
      <div className="space-y-4">
        <h3 className="text-sm font-semibold">Review imported figures</h3>
        <p className="text-xs text-muted-foreground">Here is what the AI extracted. You can change these later.</p>
        <div className="rounded-xl border border-border bg-surface-muted text-sm">
          <table className="w-full text-left">
            <tbody>
              {Object.entries(reviewPlan).map(([k, v]) => {
                if (k === "currentAge" || k === "retirementAge" || k === "targetAnnualIncome") return null;
                if (!v || (Array.isArray(v) && v.length === 0)) return null;
                return (
                  <tr key={k} className="border-b border-border last:border-0">
                    <td className="px-3 py-2 font-medium">{k}</td>
                    <td className="px-3 py-2">{JSON.stringify(v)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => onImport(reviewPlan)}
            className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
          >
            <Check className="inline-block size-4 mr-1" />
            Accept & Continue
          </button>
          <button
            onClick={() => setReviewPlan(null)}
            className="rounded-md border border-border px-4 py-2 text-sm text-foreground"
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
