"use client";

import { Sparkles } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/Button";
import type { FireSimulationResult } from "@/lib/fire-engine";
import { computeFireNumber } from "@/lib/fire-number";

import { generateDeterministicTips } from "@/lib/deterministic-tips";

interface Tip {
  title: string;
  detail: string;
}

// Global cache to prevent refetching the same plan during a session
const cache = new Map<string, Tip[]>();

export function AiInsights({ result, isProvisional, isReadOnly }: { result: FireSimulationResult, isProvisional: boolean, isReadOnly: boolean }) {
  const [tips, setTips] = useState<Tip[] | null>(null);
  const [loading, setLoading] = useState(false);
  const [isFallback, setIsFallback] = useState(false);
  const fire = useMemo(() => computeFireNumber(result.inputs), [result]);

  // Compute a simple signature of the inputs to use as a cache key
  const signature = useMemo(() => {
    const { inputs } = result;
    return JSON.stringify({
      currentAge: inputs.currentAge,
      retirementAge: inputs.retirementAge,
      targetAnnualIncome: inputs.targetAnnualIncome,
      isaBalance: inputs.pots?.isa?.balance ?? 0,
      isaMonthlyContribution: inputs.pots?.isa?.monthlyContribution ?? 0,
      sippBalance: inputs.pots?.sipp?.balance ?? 0,
      sippMonthlyContribution: inputs.pots?.sipp?.monthlyContribution ?? 0,
    });
  }, [result]);

  const handleAnalyze = async (force: boolean = false) => {
    if (!force && cache.has(signature)) {
      setTips(cache.get(signature)!);
      return;
    }
    setLoading(true);
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          currentAge: result.inputs.currentAge,
          retirementAge: result.inputs.retirementAge,
          targetAnnualIncome: result.inputs.targetAnnualIncome,
          isaBalance: result.inputs.pots?.isa?.balance ?? 0,
          isaMonthlyContribution: result.inputs.pots?.isa?.monthlyContribution ?? 0,
          giaBalance: result.inputs.pots?.gia?.balance ?? 0,
          sippBalance: result.inputs.pots?.sipp?.balance ?? 0,
          sippMonthlyContribution: result.inputs.pots?.sipp?.monthlyContribution ?? 0,
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
        throw new Error(`Status ${res.status}`);
      }

      const data = (await res.json()) as { tips: Tip[]; isFallback?: boolean };
      cache.set(signature, data.tips);
      setTips(data.tips);
      setIsFallback(Boolean(data.isFallback));
    } catch {
      // Complete client-side safety net: generate smart rule-based tips
      const fallbackTips = generateDeterministicTips({
        currentAge: result.inputs.currentAge,
        retirementAge: result.inputs.retirementAge,
        targetAnnualIncome: result.inputs.targetAnnualIncome,
        isaBalance: result.inputs.pots?.isa?.balance ?? 0,
        isaMonthlyContribution: result.inputs.pots?.isa?.monthlyContribution ?? 0,
        giaBalance: result.inputs.pots?.gia?.balance ?? 0,
        sippBalance: result.inputs.pots?.sipp?.balance ?? 0,
        sippMonthlyContribution: result.inputs.pots?.sipp?.monthlyContribution ?? 0,
        propertyValue: (result.inputs.rentalValue ?? 0) + (result.inputs.homeValue ?? 0),
        fireNumber: Math.round(fire.fireNumber),
        projectedAtRetirement: Math.round(fire.projectedAtRetirement),
        sippAccessAge: result.inputs.sippAccessAge ?? 57,
        statePensionAge: result.inputs.statePensionAge ?? 67,
        taxFreeLumpSum: result.taxFreeLumpSum,
        sustainableToLifeExpectancy: result.sustainableToLifeExpectancy,
        isaDepletedAge: result.isaDepletedAge,
        sippDepletedAge: result.sippDepletedAge,
      });
      cache.set(signature, fallbackTips);
      setTips(fallbackTips);
      setIsFallback(true);
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
            {isFallback ? "Strategy tips" : "AI strategy tips"}
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
