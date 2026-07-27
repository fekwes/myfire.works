"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { FireSimulationResult } from "@/lib/fire-engine";
import { computeFireNumber } from "@/lib/fire-number";

interface Tip {
  title: string;
  detail: string;
}

// Global cache to prevent refetching the same plan during a session
const cache = new Map<string, Tip[]>();

export function AiInsights({ result, isProvisional, isReadOnly }: { result: FireSimulationResult, isProvisional: boolean, isReadOnly: boolean }) {
  const [tips, setTips] = useState<Tip[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fire = useMemo(() => computeFireNumber(result.inputs), [result]);

  // Compute a simple signature of the inputs to use as a cache key
  const signature = useMemo(() => {
    const { inputs } = result;
    return JSON.stringify({
      currentAge: inputs.currentAge,
      retirementAge: inputs.retirementAge,
      targetAnnualIncome: inputs.targetAnnualIncome,
      isaBalance: inputs.isaBalance,
      isaMonthlyContribution: inputs.isaMonthlyContribution,
      sippBalance: inputs.sippBalance,
      sippMonthlyContribution: inputs.sippMonthlyContribution,
    });
  }, [result.inputs]);

  const handleAnalyze = async (force: boolean = false) => {
    if (!force && cache.has(signature)) {
      setTips(cache.get(signature)!);
      return;
    }
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
          giaBalance: result.inputs.giaBalance ?? 0,
          sippBalance: result.inputs.sippBalance,
          sippMonthlyContribution: result.inputs.sippMonthlyContribution,
          propertyValue: (result.inputs.rentalValue ?? 0) + (result.inputs.homeValue ?? 0),
          fireNumber: Math.round(fire.fireNumber),
          projectedAtRetirement: Math.round(fire.projectedAtRetirement),
          sippAccessAge: result.inputs.sippAccessAge ?? 57,
          statePensionAge: result.inputs.statePensionAge ?? 67,
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
      cache.set(signature, data.tips);
      setTips(data.tips);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (process.env.NEXT_PUBLIC_AI_TIPS_AUTORUN !== "true") return;
    if (isProvisional || isReadOnly) return;
    if (cache.has(signature)) {
      setTimeout(() => setTips(cache.get(signature)!), 0);
      return;
    }
    // Auto-run once
    // eslint-disable-next-line react-hooks/set-state-in-effect
    handleAnalyze();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [signature, isProvisional, isReadOnly]);

  return (
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
        <Button
          type="button"
          size="sm"
          onClick={() => handleAnalyze(true)}
          disabled={loading}
          className="no-print"
        >
          {loading ? "Analysing…" : tips ? "Regenerate" : "Get tips"}
        </Button>
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
