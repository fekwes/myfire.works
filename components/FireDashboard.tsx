"use client";

import { useMemo, useState } from "react";
import { AiInsights } from "@/components/AiInsights";
import { AssetTimelineChart } from "@/components/AssetTimelineChart";
import { DEFAULT_FIRE_FORM_VALUES, FireForm } from "@/components/FireForm";
import { IncomeSafetyChart } from "@/components/IncomeSafetyChart";
import { simulateFire, type FireInputs } from "@/lib/fire-engine";
import { formatCurrency } from "@/lib/format";

function StatTile({
  label,
  value,
  tone = "default",
}: {
  label: string;
  value: string;
  tone?: "default" | "success" | "danger";
}) {
  const toneClass =
    tone === "success"
      ? "text-success"
      : tone === "danger"
        ? "text-danger"
        : "text-foreground";

  return (
    <div className="rounded-xl border border-border bg-surface-muted p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`mt-1 text-lg font-semibold ${toneClass}`}>{value}</p>
    </div>
  );
}

export function FireDashboard() {
  const [inputs, setInputs] = useState<FireInputs>(DEFAULT_FIRE_FORM_VALUES);
  const result = useMemo(() => simulateFire(inputs), [inputs]);

  return (
    <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
      <section className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
        <h2 className="mb-5 text-sm font-medium text-muted-foreground">
          Your details
        </h2>
        <FireForm value={inputs} onChange={setInputs} />
      </section>

      <section className="rounded-2xl border border-border bg-surface p-6 lg:col-span-3">
        <h2 className="text-sm font-medium text-muted-foreground">
          Projection
        </h2>

        <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile
            label="Bridge → SIPP at"
            value={`Age ${result.inputs.sippAccessAge}`}
          />
          <StatTile
            label="Tax-free lump sum"
            value={formatCurrency(result.taxFreeLumpSum)}
          />
          <StatTile
            label="State Pension from"
            value={`Age ${result.inputs.statePensionAge}`}
          />
          <StatTile
            label="Sustainable to 95"
            value={result.sustainableToLifeExpectancy ? "Yes" : "At risk"}
            tone={result.sustainableToLifeExpectancy ? "success" : "danger"}
          />
        </div>

        <div className="mt-6">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            Asset balances over time
          </h3>
          <AssetTimelineChart result={result} />
        </div>

        <div className="mt-6">
          <h3 className="mb-2 text-xs font-medium text-muted-foreground">
            Net annual income vs. target
          </h3>
          <IncomeSafetyChart result={result} />
        </div>

        <AiInsights result={result} />
      </section>
    </div>
  );
}
