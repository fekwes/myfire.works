"use client";

import { TrendingDown, TrendingUp } from "lucide-react";
import { useMemo } from "react";
import { usePlan } from "@/components/PlanProvider";
import { Card } from "@/components/ui";
import { formatCurrency } from "@/lib/format";
import { retirementSensitivity } from "@/lib/what-if";

function Lever({
  icon,
  heading,
  value,
  sub,
  tone,
}: {
  icon: React.ReactNode;
  heading: string;
  value: string;
  sub: string;
  tone: "danger" | "success";
}) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted p-4">
      <div className="flex items-center gap-1.5 text-muted-foreground">
        {icon}
        <span className="font-mono text-[0.62rem] uppercase tracking-wide">
          {heading}
        </span>
      </div>
      <p
        className={`mt-1.5 font-display text-xl font-bold tabular ${
          tone === "danger" ? "text-danger" : "text-success"
        }`}
      >
        {value}
      </p>
      <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
        {sub}
      </p>
    </div>
  );
}

/** "What if I retire a year earlier / later?" — the monthly-saving trade-off. */
export function WhatIfCard() {
  const { inputs } = usePlan();
  const s = useMemo(() => retirementSensitivity(inputs), [inputs]);

  return (
    <Card>
      <h3 className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        What if you retire…
      </h3>
      <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-2">
        {s.earlierAge !== null && (
          <Lever
            icon={<TrendingUp className="size-3.5" />}
            heading={`A year earlier — age ${s.earlierAge}`}
            tone="danger"
            value={
              s.earlierExtraMonthly === null
                ? "Not by saving alone"
                : s.earlierExtraMonthly < 1
                  ? "Already covered"
                  : `+${formatCurrency(s.earlierExtraMonthly)}/mo`
            }
            sub={
              s.earlierExtraMonthly === null
                ? "You couldn't fund it with extra contributions alone — trim the target or keep the current age."
                : s.earlierExtraMonthly < 1
                  ? "You're already on track to retire a year earlier."
                  : "extra into your ISA + pension to stay on track."
            }
          />
        )}
        <Lever
          icon={<TrendingDown className="size-3.5" />}
          heading={`A year later — age ${s.laterAge}`}
          tone="success"
          value={
            s.laterSavingMonthly < 1
              ? "No change needed"
              : `−${formatCurrency(s.laterSavingMonthly)}/mo`
          }
          sub={
            s.laterSavingMonthly < 1
              ? "Waiting a year doesn't change what you need to save."
              : "you could contribute this much less and still stay on track."
          }
        />
      </div>
    </Card>
  );
}
