"use client";

import { useMemo, useState } from "react";
import { AiInsights } from "@/components/AiInsights";
import { AssetTimelineChart } from "@/components/AssetTimelineChart";
import { DEFAULT_FIRE_FORM_VALUES, FireForm } from "@/components/FireForm";
import { IncomeSafetyChart } from "@/components/IncomeSafetyChart";
import { computeCoastFire } from "@/lib/coast-fire";
import { simulateFire, type FireInputs } from "@/lib/fire-engine";
import { formatCurrency } from "@/lib/format";

type Mode = "plan" | "coast";

function SectionLabel({ children }: { children: React.ReactNode }) {
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
    <div className="rounded-xl border border-border bg-surface-muted p-4 transition-colors hover:border-muted-foreground/30">
      <p className="font-mono text-[0.68rem] uppercase tracking-wide text-muted-foreground">
        {label}
      </p>
      <p className={`mt-1.5 font-display text-xl font-bold tabular ${valueTone}`}>
        {value}
      </p>
    </div>
  );
}

function ModeToggle({
  mode,
  onChange,
}: {
  mode: Mode;
  onChange: (m: Mode) => void;
}) {
  const opt = (m: Mode, label: string) => (
    <button
      type="button"
      onClick={() => onChange(m)}
      aria-pressed={mode === m}
      className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
        mode === m
          ? "bg-foreground text-background"
          : "text-muted-foreground hover:text-foreground"
      }`}
    >
      {label}
    </button>
  );
  return (
    <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted p-1">
      {opt("plan", "Contributing")}
      {opt("coast", "Coast FIRE")}
    </div>
  );
}

function CoastSummary({ inputs }: { inputs: FireInputs }) {
  const coast = useMemo(() => computeCoastFire(inputs), [inputs]);
  const gap = Math.max(0, -coast.surplus);

  return (
    <div
      className={`mt-4 rounded-xl border p-4 ${
        coast.isCoastFire
          ? "border-brand/40 bg-brand/10"
          : "border-border bg-surface-muted"
      }`}
    >
      <div className="flex items-center gap-2">
        <span className="text-lg leading-none">🔥</span>
        <p className="font-display text-base font-bold">
          {coast.isCoastFire ? "You're Coast FIRE" : "Not coasting yet"}
        </p>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
        {coast.isCoastFire ? (
          <>
            You could stop contributing today and your current pots would still
            grow to fund your target income to age{" "}
            {coast.coastingResult.inputs.lifeExpectancyAge}.
          </>
        ) : coast.coastAge !== null ? (
          <>
            Keep contributing until age{" "}
            <span className="font-semibold text-foreground">
              {coast.coastAge}
            </span>{" "}
            and you could then stop and coast to your target.
          </>
        ) : (
          <>
            On these numbers the plan doesn&apos;t reach your target even while
            contributing to retirement — raise contributions or adjust the plan.
          </>
        )}
      </p>

      <div className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
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
          value={formatCurrency(coast.surplus >= 0 ? coast.surplus : gap)}
          tone={coast.surplus >= 0 ? "success" : "danger"}
        />
        <StatTile
          label="Coast age"
          value={coast.coastAge !== null ? `Age ${coast.coastAge}` : "—"}
        />
      </div>
    </div>
  );
}

export function FireDashboard() {
  const [inputs, setInputs] = useState<FireInputs>(DEFAULT_FIRE_FORM_VALUES);
  const [mode, setMode] = useState<Mode>("plan");

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

  const result = mode === "coast" ? coastResult : planResult;
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
        <div className="flex flex-wrap items-center justify-between gap-3">
          <SectionLabel>Projection</SectionLabel>
          <div className="flex items-center gap-3">
            <ModeToggle mode={mode} onChange={setMode} />
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
              {sustainable ? "On track" : "Shortfall"}
            </span>
          </div>
        </div>

        {mode === "coast" ? (
          <CoastSummary inputs={inputs} />
        ) : (
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
        )}

        <div className="mt-7">
          <SectionLabel>
            {mode === "coast"
              ? "Asset balances if you stop contributing"
              : "Asset balances over time"}
          </SectionLabel>
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

        <AiInsights result={planResult} />
      </section>
    </div>
  );
}
