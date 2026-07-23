"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { AiInsights } from "@/components/AiInsights";
import { AssetTimelineChart } from "@/components/AssetTimelineChart";
import { DEFAULT_FIRE_FORM_VALUES, FireForm } from "@/components/FireForm";
import { IncomeSafetyChart } from "@/components/IncomeSafetyChart";
import { computeCoastFire, type CoastFireResult } from "@/lib/coast-fire";
import {
  type FireSimulationResult,
  simulateFire,
  type FireInputs,
} from "@/lib/fire-engine";
import { formatCurrency } from "@/lib/format";

type Mode = "plan" | "coast";
type ChartTab = "assets" | "income";

function MonoLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
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

function Segmented<T extends string>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { value: T; label: string }[];
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

/** The north-star band: verdict + the few numbers that matter, at a glance. */
function PlanSummary({
  mode,
  onModeChange,
  plan,
  coast,
}: {
  mode: Mode;
  onModeChange: (m: Mode) => void;
  plan: FireSimulationResult;
  coast: CoastFireResult;
}) {
  const horizon = plan.inputs.lifeExpectancyAge;
  const firstShortfall = plan.timeline.find(
    (y) => y.shortfall && y.phase !== "accumulation",
  )?.age;
  const lastsTo = firstShortfall ? firstShortfall - 1 : horizon;
  const sustainable = plan.sustainableToLifeExpectancy;

  return (
    <div className="rounded-2xl border border-border bg-surface p-5 sm:p-7">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <MonoLabel>{mode === "coast" ? "Coast FIRE" : "Your plan"}</MonoLabel>
          {mode === "coast" ? (
            <>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {coast.isCoastFire ? "You're Coast FIRE 🔥" : "Not coasting yet"}
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {coast.isCoastFire
                  ? `Stop contributing today and your pots still fund your target to age ${coast.coastingResult.inputs.lifeExpectancyAge}.`
                  : coast.coastAge !== null
                    ? `Keep contributing until age ${coast.coastAge} and you could then stop and coast.`
                    : "On these numbers the plan falls short even while contributing to retirement."}
              </p>
            </>
          ) : (
            <>
              <h2 className="mt-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
                {sustainable ? "You're on track 🎉" : "There's a shortfall"}
              </h2>
              <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
                {sustainable
                  ? `Your pots fund ${formatCurrency(plan.inputs.targetAnnualIncome)}/yr, after tax, all the way to age ${horizon}.`
                  : `Your target income runs short from age ${firstShortfall} — raise contributions, trim the target, or retire later.`}
              </p>
            </>
          )}
        </div>
        <Segmented
          value={mode}
          onChange={onModeChange}
          options={[
            { value: "plan", label: "Contributing" },
            { value: "coast", label: "Coast FIRE" },
          ]}
        />
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {mode === "coast" ? (
          <>
            <StatTile
              label="Coast number"
              value={formatCurrency(coast.coastNumber)}
            />
            <StatTile
              label="Invested today"
              value={formatCurrency(coast.currentInvested)}
            />
            <StatTile
              label={coast.surplus >= 0 ? "Surplus" : "Gap to coast"}
              value={formatCurrency(Math.abs(coast.surplus))}
              tone={coast.surplus >= 0 ? "success" : "danger"}
            />
            <StatTile
              label="Coast age"
              value={coast.coastAge !== null ? `Age ${coast.coastAge}` : "—"}
            />
          </>
        ) : (
          <>
            <StatTile label="Retire at" value={`Age ${plan.inputs.retirementAge}`} />
            <StatTile
              label="SIPP unlocks"
              value={`Age ${plan.inputs.sippAccessAge}`}
            />
            <StatTile
              label="Tax-free lump sum"
              value={formatCurrency(plan.taxFreeLumpSum)}
            />
            <StatTile
              label="Plan lasts to"
              value={sustainable ? `Age ${horizon}+` : `Age ${lastsTo}`}
              tone={sustainable ? "success" : "danger"}
            />
          </>
        )}
      </div>
    </div>
  );
}

export function FireDashboard() {
  const [inputs, setInputs] = useState<FireInputs>(DEFAULT_FIRE_FORM_VALUES);
  const [mode, setMode] = useState<Mode>("plan");
  const [chartTab, setChartTab] = useState<ChartTab>("assets");

  const planResult = useMemo(() => simulateFire(inputs), [inputs]);
  const coastResult = useMemo(
    () =>
      simulateFire({
        ...inputs,
        isaMonthlyContribution: 0,
        giaMonthlyContribution: 0,
        sippMonthlyContribution: 0,
      }),
    [inputs],
  );
  const coast = useMemo(() => computeCoastFire(inputs), [inputs]);
  const shown = mode === "coast" ? coastResult : planResult;

  return (
    <div className="space-y-5">
      <PlanSummary
        mode={mode}
        onModeChange={setMode}
        plan={planResult}
        coast={coast}
      />

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-5">
        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:col-span-2">
          <MonoLabel>Your details</MonoLabel>
          <div className="mt-5">
            <FireForm value={inputs} onChange={setInputs} />
          </div>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-5 sm:p-6 lg:col-span-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <MonoLabel>
              {mode === "coast" ? "If you stop contributing" : "Projection"}
            </MonoLabel>
            <Segmented
              value={chartTab}
              onChange={setChartTab}
              options={[
                { value: "assets", label: "Assets" },
                { value: "income", label: "Income" },
              ]}
            />
          </div>
          <div className="mt-4">
            {chartTab === "assets" ? (
              <AssetTimelineChart result={shown} />
            ) : (
              <IncomeSafetyChart result={shown} />
            )}
          </div>

          <AiInsights result={planResult} />
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
