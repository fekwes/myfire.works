"use client";

import { Sparkles } from "lucide-react";
import { useMemo, useState } from "react";
import type { FireSimulationResult } from "@/lib/fire-engine";
import { computeFireNumber } from "@/lib/fire-number";

interface Tip {
  title: string;
  detail: string;
}

export function AiInsights({ result }: { result: FireSimulationResult }) {
  const [tips, setTips] = useState<Tip[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fire = useMemo(() => computeFireNumber(result.inputs), [result.inputs]);

  async function handleAnalyze() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentAge: result.inputs.currentAge,
          retirementAge: result.inputs.retirementAge,
          targetAnnualIncome: result.inputs.targetAnnualIncome,
          isaBalance: result.inputs.isaBalance,
          isaMonthlyContribution: result.inputs.isaMonthlyContribution,
          giaBalance: result.inputs.giaBalance,
          sippBalance: result.inputs.sippBalance,
          sippMonthlyContribution: result.inputs.sippMonthlyContribution,
          propertyValue: result.inputs.rentalValue + result.inputs.homeValue,
          fireNumber: Math.round(fire.fireNumber),
          projectedAtRetirement: Math.round(fire.projectedAtRetirement),
          sippAccessAge: result.inputs.sippAccessAge,
          statePensionAge: result.inputs.statePensionAge,
          taxFreeLumpSum: result.taxFreeLumpSum,
          sustainableToLifeExpectancy: result.sustainableToLifeExpectancy,
          isaDepletedAge: result.isaDepletedAge,
          sippDepletedAge: result.sippDepletedAge,
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(
          (body as { error?: string } | null)?.error ??
            `Request failed (${res.status})`,
        );
      }

      const data = (await res.json()) as { tips: Tip[] };
      setTips(data.tips);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  }

  return (
    // Generated tips are worth printing; an empty prompt with a button isn't.
    <div
      className={`mt-7 rounded-xl border border-border bg-surface-muted p-4 ${
        tips ? "" : "no-print"
      }`}
    >
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Sparkles aria-hidden className="size-4 text-primary" />
          <h3 className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            AI strategy tips
          </h3>
        </div>
        <button
          type="button"
          onClick={handleAnalyze}
          disabled={loading}
          className="no-print rounded-full bg-foreground px-3.5 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Analyzing…" : tips ? "Regenerate" : "Get tips"}
        </button>
      </div>

      {error && <p className="mt-3 text-xs text-danger">{error}</p>}

      {tips && (
        <ul className="mt-4 space-y-3.5">
          {tips.map((tip) => (
            <li key={tip.title} className="border-l-2 border-brand pl-3">
              <p className="text-sm font-semibold text-foreground">
                {tip.title}
              </p>
              <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
                {tip.detail}
              </p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
