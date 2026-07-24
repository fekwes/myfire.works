"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { AiInsights } from "@/components/AiInsights";
import { AssetTimelineChart } from "@/components/AssetTimelineChart";
import { ConfidencePanel } from "@/components/ConfidencePanel";
import { IncomeSafetyChart } from "@/components/IncomeSafetyChart";
import { PlanActions } from "@/components/PlanActions";
import { PlannerIntro } from "@/components/PlannerIntro";
import { usePlan } from "@/components/PlanProvider";
import { QuickLevers } from "@/components/QuickLevers";
import { Card } from "@/components/ui";
import { computeCoastFire } from "@/lib/coast-fire";
import { simulateFire } from "@/lib/fire-engine";
import { computeFireNumber } from "@/lib/fire-number";
import { formatCurrency } from "@/lib/format";
import { decodePlan } from "@/lib/share";

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

export function FireDashboard({ sharedParam }: { sharedParam?: string } = {}) {
  const { inputs: ownInputs, setInputs } = usePlan();
  const router = useRouter();
  // A `?p=` param renders someone else's plan read-only, without touching the
  // viewer's own saved plan.
  const shared = useMemo(() => decodePlan(sharedParam), [sharedParam]);
  const readOnly = shared !== null;
  const inputs = shared ?? ownInputs;

  const [chartTab, setChartTab] = useState<ChartTab>("assets");
  // Default to today's money — the frame most people reason in.
  const [realTerms, setRealTerms] = useState(true);

  const makeItMine = () => {
    if (shared) setInputs(shared);
    router.push("/planner");
  };

  const plan = useMemo(() => simulateFire(inputs), [inputs]);
  const coast = useMemo(() => computeCoastFire(inputs), [inputs]);
  const fire = useMemo(() => computeFireNumber(inputs), [inputs]);

  const netWorth =
    inputs.isaBalance +
    (inputs.giaBalance ?? 0) +
    inputs.sippBalance +
    (inputs.rentalValue ?? 0) +
    (inputs.homeValue ?? 0);
  const propertyValue = (inputs.rentalValue ?? 0) + (inputs.homeValue ?? 0);

  // Real-terms display. When on, deflate future-money figures back to today's
  // money by the plan's inflation rate. Only meaningful when inflation > 0.
  const infl = inputs.inflationRate ?? 0;
  const showRealToggle = infl > 0;
  const real = showRealToggle && realTerms;
  const deflateAt = (age: number) =>
    real ? 1 / (1 + infl) ** (age - inputs.currentAge) : 1;

  const retireDefl = deflateAt(plan.inputs.retirementAge);
  const fireNumberDisplay = fire.fireNumber * retireDefl;
  const projectedDisplay = fire.projectedAtRetirement * retireDefl;
  const surplusDisplay = projectedDisplay - fireNumberDisplay;
  const taxFreePensionDisplay = real
    ? plan.timeline.reduce(
        (sum, y) => sum + y.pensionTaxFreeTaken * deflateAt(y.age),
        0,
      )
    : plan.totalTaxFreePension;
  const moneyFrame = real ? "today's money" : "future money";

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
      {readOnly ? (
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-brand/10 px-4 py-3">
          <p className="text-sm font-medium text-foreground">
            You&apos;re viewing a shared plan.
          </p>
          <button
            type="button"
            onClick={makeItMine}
            className="rounded-full bg-foreground px-4 py-1.5 text-xs font-semibold text-background transition-opacity hover:opacity-90"
          >
            Make it mine
          </button>
        </div>
      ) : (
        <div className="no-print flex items-center justify-between gap-3">
          <h1 className="font-display text-lg font-bold tracking-tight">
            Your planner
          </h1>
          <PlanActions />
        </div>
      )}

      {!readOnly && <PlannerIntro />}

      {/* North-star summary — the heaviest card in the hierarchy. */}
      <Card padding="lg">
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
          <div className="flex flex-col items-end gap-2">
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
            {showRealToggle && (
              <div className="inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted p-1">
                {(
                  [
                    { v: true, label: "Today's £" },
                    { v: false, label: "Future £" },
                  ] as const
                ).map((o) => (
                  <button
                    key={o.label}
                    type="button"
                    onClick={() => setRealTerms(o.v)}
                    aria-pressed={realTerms === o.v}
                    title={
                      o.v
                        ? "Show figures in today's money (deflated by inflation)"
                        : "Show the actual future pounds withdrawn"
                    }
                    className={`rounded-full px-2.5 py-0.5 text-[0.7rem] font-semibold transition-colors ${
                      realTerms === o.v
                        ? "bg-foreground text-background"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* FIRE number — the pot needed at retirement vs. what you're on course
            to have. The headline figure a FIRE audience wants. */}
        <div className="mt-5 flex flex-wrap items-end justify-between gap-4 rounded-xl border border-border bg-surface-muted p-4">
          <div>
            <MonoLabel>Your FIRE number</MonoLabel>
            <p className="mt-1.5 font-display text-2xl font-bold tabular sm:text-3xl">
              {formatCurrency(fireNumberDisplay)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              the pot you need at age {plan.inputs.retirementAge}
              {showRealToggle ? ` (in ${moneyFrame})` : ""}, then draw down
              tax-efficiently.
            </p>
          </div>
          <div className="text-right">
            <p className="font-mono text-[0.65rem] uppercase tracking-wide text-muted-foreground">
              On course for
            </p>
            <p
              className={`mt-1 font-display text-xl font-bold tabular ${
                fire.onTrack ? "text-success" : "text-danger"
              }`}
            >
              {formatCurrency(projectedDisplay)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {fire.onTrack
                ? `${formatCurrency(surplusDisplay)} to spare`
                : `${formatCurrency(-surplusDisplay)} short`}
            </p>
          </div>
        </div>

        <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
          <StatTile label="Retire at" value={`Age ${plan.inputs.retirementAge}`} />
          <StatTile
            label={propertyValue > 0 ? "Net worth (incl. property)" : "Net worth today"}
            value={formatCurrency(netWorth)}
          />
          <StatTile
            label="Tax-free pension"
            value={formatCurrency(taxFreePensionDisplay)}
          />
          <StatTile
            label="Plan lasts to"
            value={sustainable ? `Age ${horizon}+` : `Age ${lastsTo}`}
            tone={sustainable ? "success" : "danger"}
          />
        </div>
      </Card>

      {!readOnly && <QuickLevers />}

      <Card padding="md">
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
            <AssetTimelineChart result={plan} realTerms={real} />
          ) : chartTab === "income" ? (
            <IncomeSafetyChart result={plan} />
          ) : (
            <ConfidencePanel inputs={inputs} />
          )}
        </div>

        <AiInsights result={plan} />
      </Card>

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
