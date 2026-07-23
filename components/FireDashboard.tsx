"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AiInsights } from "@/components/AiInsights";
import { AssetTimelineChart } from "@/components/AssetTimelineChart";
import { ConfidencePanel } from "@/components/ConfidencePanel";
import { DEFAULT_FIRE_FORM_VALUES, FireForm } from "@/components/FireForm";
import { IncomeSafetyChart } from "@/components/IncomeSafetyChart";
import { SavedPlans } from "@/components/SavedPlans";
import { computeCoastFire } from "@/lib/coast-fire";
import { simulateFire, type FireInputs } from "@/lib/fire-engine";
import { formatCurrency } from "@/lib/format";

type ChartTab = "assets" | "income" | "confidence";

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <h3 className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
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
    <div className="rounded-xl border border-border bg-surface-muted p-3.5 transition-colors hover:border-muted-foreground/30">
      <p className="font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1 font-display text-lg font-bold tabular ${valueTone}`}>
        {value}
      </p>
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: ChartTab;
  onChange: (v: ChartTab) => void;
  options: { value: ChartTab; label: string }[];
}) {
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
            value === o.value
              ? "bg-foreground text-background"
              : "text-muted-foreground hover:text-foreground"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

export function FireDashboard() {
  const [inputs, setInputs] = useState<FireInputs>(DEFAULT_FIRE_FORM_VALUES);
  const [chartTab, setChartTab] = useState<ChartTab>("assets");

  const plan = useMemo(() => simulateFire(inputs), [inputs]);
  const coast = useMemo(() => computeCoastFire(inputs), [inputs]);

  const horizon = plan.inputs.lifeExpectancyAge;
  const firstShortfall = plan.timeline.find(
    (y) => y.shortfall && y.phase !== "accumulation",
  )?.age;
  const lastsTo = firstShortfall ? firstShortfall - 1 : horizon;
  const sustainable = plan.sustainableToLifeExpectancy;

  const coastNote = coast.isCoastFire
    ? "🔥 Coast FIRE — you could stop contributing now and still reach this."
    : coast.coastAge !== null
      ? `🔥 Coast FIRE at age ${coast.coastAge} — after that you could stop contributing.`
      : null;

  return (
    <div className="space-y-5">
      {/* North-star summary */}
      <div className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <MonoLabel>Your plan</MonoLabel>
            <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {sustainable ? "You're on track 🎉" : "There's a shortfall"}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {sustainable
                ? `Your pots fund ${formatCurrency(plan.inputs.targetAnnualIncome)}/yr, after tax, all the way to age ${horizon}.`
                : `Your target income runs short from age ${firstShortfall} — raise contributions, trim the target, or retire later.`}
            </p>
            {coastNote && (
              <p className="mt-2 text-xs font-medium text-muted-foreground">
                {coastNote}
              </p>
            )}
          </div>
          <span
            className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
              sustainable ? "bg-brand/15 text-success" : "bg-danger/15 text-danger"
            }`}
          >
            <span
              className={`size-1.5 rounded-full ${
                sustainable ? "bg-success" : "bg-danger"
              }`}
            />
            {sustainable ? "On track" : "Shortfall"}
          </span>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Retire at" value={`Age ${plan.inputs.retirementAge}`} />
          <StatTile label="SIPP unlocks" value={`Age ${plan.inputs.sippAccessAge}`} />
          <StatTile
            label="Tax-free pension"
            value={formatCurrency(plan.totalTaxFreePension)}
          />
          <StatTile
            label="Plan lasts to"
            value={sustainable ? `Age ${horizon}+` : `Age ${lastsTo}`}
            tone={sustainable ? "success" : "danger"}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:col-span-2">
          <MonoLabel>Your details</MonoLabel>
          <div className="mt-4">
            <SavedPlans inputs={inputs} onLoad={setInputs} />
          </div>
          <div className="mt-5">
            <FireForm value={inputs} onChange={setInputs} />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <MonoLabel>Projection</MonoLabel>
            <Segmented
              value={chartTab}
              onChange={setChartTab}
              options={[
                { value: "assets", label: "Assets" },
                { value: "income", label: "Income" },
                { value: "confidence", label: "Confidence" },
              ]}
            />
          </div>
          <div className="mt-4">
            {chartTab === "assets" ? (
              <AssetTimelineChart result={plan} />
            ) : chartTab === "income" ? (
              <IncomeSafetyChart result={plan} />
            ) : (
              <ConfidencePanel inputs={inputs} />
            )}
          </div>

          <AiInsights result={plan} />
        </section>
      </div>

      <p className="px-1 text-xs text-muted-foreground">
        Estimates based on simplified assumptions — not financial advice.{" "}
        <Link
          href="/methodology"
          className="underline-offset-2 hover:text-foreground hover:underline"
        >
          See the methodology
        </Link>
        .
      </p>
    </div>
  );
}
