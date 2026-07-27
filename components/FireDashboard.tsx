"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { AiInsights } from "@/components/AiInsights";
// Statically imported on purpose. Splitting these behind `next/dynamic` was
// tried and measured: it costs ~8 KB of extra chunk overhead on first load,
// and deferring all three duplicates Recharts into a second chunk, taking the
// all-tabs total from 359 KB to 477 KB. One shared chunk is the smaller answer;
// the real lever on this payload is Recharts itself, not how it's split.
import { AssetTimelineChart } from "@/components/AssetTimelineChart";
import { ConfidencePanel } from "@/components/ConfidencePanel";
import { IncomeSafetyChart } from "@/components/IncomeSafetyChart";
import { Spark } from "@/components/Logo";
import { PlanActions } from "@/components/PlanActions";
import { PlanChecklist } from "@/components/PlanChecklist";
import { usePlan } from "@/components/PlanProvider";
import { QuickLevers } from "@/components/QuickLevers";
import { Button, Card } from "@/components/ui";
import { WhatIfCard } from "@/components/WhatIfCard";
import { computeCoastFire } from "@/lib/coast-fire";
import { simulateFire } from "@/lib/fire-engine";
import { computeFireNumber } from "@/lib/fire-number";
import { formatCurrency } from "@/lib/format";
import { decodePlan } from "@/lib/share";

type ChartTab = "assets" | "income" | "confidence";

const CHART_TABS: ChartTab[] = ["assets", "income", "confidence"];

/** Narrow an untrusted `?tab=` value to a real tab, or null. */
function asChartTab(value: string | null): ChartTab | null {
  return CHART_TABS.includes(value as ChartTab) ? (value as ChartTab) : null;
}

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

/**
 * The chart switcher. These are genuine tabs — each one swaps the panel below
 * — so it follows the WAI-ARIA tabs pattern rather than a row of pressed
 * buttons: roving tabindex, Arrow/Home/End to move between them, and the panel
 * wired back to its tab.
 */
function Segmented({
  value,
  onChange,
  options,
  panelId,
  tabId,
}: {
  value: ChartTab;
  onChange: (v: ChartTab) => void;
  options: { value: ChartTab; label: string }[];
  panelId: string;
  tabId: (tab: ChartTab) => string;
}) {
  const move = (delta: number) => {
    const i = options.findIndex((o) => o.value === value);
    const next = options[(i + delta + options.length) % options.length];
    onChange(next.value);
    document.getElementById(tabId(next.value))?.focus();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "ArrowRight") {
      e.preventDefault();
      move(1);
    } else if (e.key === "ArrowLeft") {
      e.preventDefault();
      move(-1);
    } else if (e.key === "Home") {
      e.preventDefault();
      onChange(options[0].value);
      document.getElementById(tabId(options[0].value))?.focus();
    } else if (e.key === "End") {
      e.preventDefault();
      const last = options[options.length - 1];
      onChange(last.value);
      document.getElementById(tabId(last.value))?.focus();
    }
  };

  return (
    // A tab switcher can't be operated on paper; the printed sheet keeps
    // whichever chart was on screen.
    <div
      role="tablist"
      aria-label="Projection view"
      onKeyDown={onKeyDown}
      className="no-print inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted p-1"
    >
      {options.map((o) => {
        const selected = value === o.value;
        return (
          <button
            key={o.value}
            id={tabId(o.value)}
            type="button"
            role="tab"
            aria-selected={selected}
            aria-controls={panelId}
            tabIndex={selected ? 0 : -1}
            onClick={() => onChange(o.value)}
            className={`rounded-full px-3 py-1 text-xs font-semibold transition-colors ${
              selected
                ? "bg-foreground text-background"
                : "text-muted-foreground hover:text-foreground"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export function FireDashboard({ sharedParam }: { sharedParam?: string } = {}) {
  const { inputs: ownInputs, setInputs, restoreError } = usePlan();
  const router = useRouter();
  // A `?p=` param renders someone else's plan read-only, without touching the
  // viewer's own saved plan.
  const shared = useMemo(() => decodePlan(sharedParam), [sharedParam]);
  const readOnly = shared !== null;
  const inputs = shared ?? ownInputs;

  // Which chart is showing is URL state, so it can be linked to. `?tab=` is a
  // search param rather than a fragment because Next's client router changes
  // the fragment through history without emitting hashchange or popstate —
  // the checklist sits on this very page, so its "Open the Confidence tab"
  // link is a same-page navigation that a fragment alone can't drive.
  const paramTab = asChartTab(useSearchParams().get("tab"));
  // A tab the user picked wins until the URL asks for a different one, at
  // which point the stale selection stops matching and the URL takes over.
  const [manual, setManual] = useState<{
    forParam: ChartTab | null;
    tab: ChartTab;
  } | null>(null);
  // Legacy/bookmarked `#confidence` links still work on a cold load.
  const [hashTab, setHashTab] = useState<ChartTab | null>(null);

  const chartTab: ChartTab =
    manual && manual.forParam === paramTab
      ? manual.tab
      : (paramTab ?? hashTab ?? "assets");
  const setChartTab = (tab: ChartTab) => setManual({ forParam: paramTab, tab });

  // Default to today's money — the frame most people reason in.
  const [realTerms, setRealTerms] = useState(true);

  const chartPanelId = useId();
  const chartTabsPrefix = useId();
  const chartTabId = (tab: ChartTab) => `${chartTabsPrefix}-${tab}`;

  // Deep link from the checklist: /planner#confidence opens the Confidence tab.
  //
  // This has to handle the warm path, not just a cold load: the checklist sits
  // *on* the planner, so "Open the Confidence tab" is a same-page navigation.
  // A mount-only effect left those users staring at the Assets tab.
  useEffect(() => {
    const openFromHash = () => {
      if (window.location.hash === "#confidence") setHashTab("confidence");
    };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    window.addEventListener("popstate", openFromHash);
    return () => {
      window.removeEventListener("hashchange", openFromHash);
      window.removeEventListener("popstate", openFromHash);
    };
  }, []);

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

  // Until at least one starting balance is entered, every verdict is computed
  // from a zero starting point — arithmetically true, but a judgement we
  // haven't earned. The quiz seeds contributions but no balances, so a brand-
  // new plan lands here and would otherwise open on a confident red
  // "shortfall". Show the plan as visibly *incomplete* rather than *failing*:
  // keep the FIRE number (it depends only on target and age), but hold back the
  // on-track/shortfall call, the surplus/shortfall figure, how long the plan
  // lasts and the Coast note until there's real data behind them.
  const provisional = netWorth === 0;

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
    ? "Coast FIRE — you could stop contributing now and still reach this."
    : coast.coastAge !== null
      ? `Coast FIRE at age ${coast.coastAge} — after that you could stop contributing.`
      : null;

  return (
    <div className="space-y-5">
      {readOnly ? (
        <div className="no-print flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/40 bg-brand/10 px-4 py-3">
          <p className="text-sm font-medium text-foreground">
            You&apos;re viewing a shared plan.
          </p>
          <Button type="button" size="sm" onClick={makeItMine}>
            Make it mine
          </Button>
        </div>
      ) : (
        <div className="no-print flex items-center justify-between gap-3">
          <h1 className="font-display text-lg font-bold tracking-tight">
            Dashboard
          </h1>
          <PlanActions />
        </div>
      )}

      {/* A signed-in user whose saved plan couldn't be read is looking at the
          defaults, which is indistinguishable from their data having been
          thrown away. Say which it is, before they read any of the figures. */}
      {!readOnly && restoreError && (
        <p
          role="alert"
          className="no-print rounded-xl border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger"
        >
          {restoreError} Nothing has been lost — the figures below are the
          defaults, not your plan.
        </p>
      )}

      {/* The setup guide is for turning a real plan into a complete one, so it
          waits until there's a plan to complete. While provisional, the north-
          star card already carries the single "add your balances" ask — showing
          the checklist here too would ask for the same thing twice. */}
      {!readOnly && !provisional && <PlanChecklist />}

      {/* North-star summary — the heaviest card in the hierarchy. */}
      <Card padding="lg">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="min-w-0">
            <MonoLabel>Your plan</MonoLabel>
            <h2 className="mt-2 flex items-center gap-2 font-display text-2xl font-bold tracking-tight sm:text-3xl">
              {provisional
                ? "Add your balances first"
                : sustainable
                  ? "You're on track"
                  : "There's a shortfall"}
              {!provisional && sustainable && (
                <Spark size={22} className="text-brand" />
              )}
            </h2>
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-muted-foreground">
              {provisional
                ? "Right now this is just your monthly contributions growing from a zero starting balance — nothing to judge yet. Add what you've saved so far and we'll tell you whether you're on track."
                : sustainable
                  ? `Your pots fund ${formatCurrency(plan.inputs.targetAnnualIncome)}/yr, after tax, all the way to age ${horizon}.`
                  : `Your savings fully cover your target income until age ${lastsTo}, but fall short from age ${firstShortfall}. Raise contributions, trim the target, or retire a little later to close it.`}
            </p>
            {provisional && !readOnly && (
              <Link
                href="/finances#balances"
                className="mt-2.5 inline-flex items-center gap-1 text-sm font-semibold text-primary underline-offset-4 hover:underline"
              >
                Add them in Edit plan
                <span aria-hidden>&rarr;</span>
              </Link>
            )}
            {!provisional && coastNote && (
              <p className="mt-2 flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
                <Spark size={13} className="shrink-0 text-primary" />
                {coastNote}
              </p>
            )}
          </div>
          {/* Wraps under the heading on narrow screens — align it with the
              copy there, and back to the right once it sits alongside. */}
          <div className="flex flex-col items-start gap-2 sm:items-end">
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                provisional
                  ? "bg-surface-muted text-muted-foreground"
                  : sustainable
                    ? "bg-brand/15 text-success"
                    : "bg-danger/15 text-danger"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  provisional
                    ? "bg-muted-foreground"
                    : sustainable
                      ? "bg-success"
                      : "bg-danger"
                }`}
              />
              {provisional ? "Provisional" : sustainable ? "On track" : "Shortfall"}
            </span>
            {showRealToggle && (
              // The money frame is already stated in the FIRE-number caption,
              // so the toggle itself is screen-only chrome.
              <div className="no-print inline-flex items-center gap-1 rounded-full border border-border bg-surface-muted p-1">
                {(
                  [
                    { v: true, label: "Today's money" },
                    { v: false, label: "Future money" },
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
            {showRealToggle && (
              <p className="no-print mt-1 text-[0.65rem] text-muted-foreground text-right max-w-[200px]">
                {realTerms
                  ? "Adjusted for inflation — what these amounts are worth in 2026 terms"
                  : "Not adjusted — the cash amounts in each future year"}
              </p>
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
            {/* Two measures of the same plan: `sustainable` runs the real
                drawdown (contributions and all), while the FIRE number is the
                pot you'd need if you stopped contributing at retirement. Near
                the boundary they can disagree by a rounding margin — so a gap
                only earns the alarm colour when the plan genuinely fails.
                Otherwise it's information, not a warning. */}
            <p
              className={`mt-1 font-display text-xl font-bold tabular ${
                provisional
                  ? "text-muted-foreground"
                  : fire.onTrack
                    ? "text-success"
                    : sustainable
                      ? "text-foreground"
                      : "text-danger"
              }`}
            >
              {formatCurrency(projectedDisplay)}
            </p>
            <p className="mt-0.5 text-xs text-muted-foreground">
              {provisional
                ? "from contributions alone — add balances to compare"
                : fire.onTrack
                  ? `${formatCurrency(surplusDisplay)} to spare`
                  : `${formatCurrency(-surplusDisplay)} short of it`}
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
            value={
              provisional ? "—" : sustainable ? `Age ${horizon}+` : `Age ${lastsTo}`
            }
            tone={provisional ? "default" : sustainable ? "success" : "danger"}
          />
        </div>
      </Card>

      {!readOnly && <QuickLevers />}
      {!readOnly && <WhatIfCard />}

      <Card padding="md" id="confidence" className="scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <MonoLabel>Projection</MonoLabel>
          <Segmented
            value={chartTab}
            onChange={setChartTab}
            panelId={chartPanelId}
            tabId={chartTabId}
            options={[
              { value: "assets", label: "Assets" },
              { value: "income", label: "Income" },
              { value: "confidence", label: "Confidence" },
            ]}
          />
        </div>
        <div
          id={chartPanelId}
          role="tabpanel"
          aria-labelledby={chartTabId(chartTab)}
          tabIndex={0}
          className="mt-4 focus-visible:outline-none"
        >
          {chartTab === "assets" ? (
            <AssetTimelineChart result={plan} realTerms={real} />
          ) : chartTab === "income" ? (
            <IncomeSafetyChart result={plan} realTerms={realTerms} />
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
