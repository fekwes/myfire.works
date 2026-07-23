"use client";

import { useMemo, useState } from "react";
import { AiInsights } from "@/components/AiInsights";
import { AssetTimelineChart } from "@/components/AssetTimelineChart";
import { DEFAULT_FIRE_FORM_VALUES, FireForm } from "@/components/FireForm";
import { IncomeSafetyChart } from "@/components/IncomeSafetyChart";
import { simulateFire, type FireInputs } from "@/lib/fire-engine";
import { formatCurrency } from "@/lib/format";

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="text-[0.7rem] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </h3>
  );
}

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  const valueTone =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : "text-foreground";

  return (
    <div className="rounded-xl border border-border bg-surface-muted p-4 transition-colors hover:border-muted-foreground/30">
      <p className="text-[0.7rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p
        className={`mt-1.5 font-display text-xl font-bold tabular ${valueTone}`}
      >
        {value}
      </p>
    </div>
  );
}

export function FireDashboard() {
  const [inputs, setInputs] = useState<FireInputs>(DEFAULT_FIRE_FORM_VALUES);
  const result = useMemo(() => simulateFire(inputs), [inputs]);
  const sustainable = result.sustainableToLifeExpectancy;

  return (
    <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:col-span-2">
        <SectionLabel>Your details</SectionLabel>
        <div className="mt-5">
          <FireForm value={inputs} onChange={setInputs} />
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:col-span-3">
        <div className="flex items-center justify-between gap-3">
          <SectionLabel>Projection</SectionLabel>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              sustainable
                ? "bg-brand/15 text-success"
                : "bg-danger/15 text-danger"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                sustainable ? "bg-success" : "bg-danger"
              }`}
            />
            {sustainable ? "On track to 95" : "Shortfall risk"}
          </span>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Bridge → SIPP"
            value={`Age ${result.inputs.sippAccessAge}`}
          />
          <StatTile
            label="Tax-free lump sum"
            value={formatCurrency(result.taxFreeLumpSum)}
          />
          <StatTile
            label="State Pension"
            value={`Age ${result.inputs.statePensionAge}`}
          />
          <StatTile
            label="Sustainable to 95"
            value={sustainable ? "Yes" : "At risk"}
            tone={sustainable ? "success" : "danger"}
          />
        </div>

        <div className="mt-7">
          <SectionLabel>Asset balances over time</SectionLabel>
          <div className="mt-3">
            <AssetTimelineChart result={result} />
          </div>
        </div>

        <div className="mt-7">
          <SectionLabel>Net annual income vs. target</SectionLabel>
          <div className="mt-3">
            <IncomeSafetyChart result={result} />
          </div>
        </div>

        <AiInsights result={result} />
      </section>
    </div>
  );
}
