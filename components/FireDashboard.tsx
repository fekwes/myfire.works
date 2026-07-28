"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useMemo, useState } from "react";
import { AiInsights } from "@/components/AiInsights";
import { AssetTimelineChart } from "@/components/AssetTimelineChart";
import { ConfidencePanel } from "@/components/ConfidencePanel";
import { IncomeSafetyChart } from "@/components/IncomeSafetyChart";
import { PlanActions } from "@/components/PlanActions";
import { usePlan } from "@/components/PlanProvider";
import { QuickLevers } from "@/components/QuickLevers";
import { Button, Card } from "@/components/ui";
import { OverviewPanel } from "@/components/OverviewPanel";
import { useFormat } from "@/hooks/useFormat";
import { simulateFire } from "@/lib/fire-engine";
import { decodePlan } from "@/lib/share";

type ChartTab = "assets" | "income" | "confidence";
const CHART_TABS: ChartTab[] = ["assets", "income", "confidence"];

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
    if (e.key === "ArrowRight") { e.preventDefault(); move(1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); move(-1); }
    else if (e.key === "Home") { e.preventDefault(); onChange(options[0].value); document.getElementById(tabId(options[0].value))?.focus(); }
    else if (e.key === "End") { e.preventDefault(); const last = options[options.length - 1]; onChange(last.value); document.getElementById(tabId(last.value))?.focus(); }
  };

  return (
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
  const { format } = useFormat();
  const router = useRouter();
  const shared = useMemo(() => decodePlan(sharedParam), [sharedParam]);
  const readOnly = shared !== null;
  const inputs = shared ?? ownInputs;

  const paramTab = asChartTab(useSearchParams().get("tab"));
  const [manual, setManual] = useState<{ forParam: ChartTab | null; tab: ChartTab } | null>(null);
  const [hashTab, setHashTab] = useState<ChartTab | null>(null);

  const chartTab: ChartTab = manual && manual.forParam === paramTab ? manual.tab : (paramTab ?? hashTab ?? "assets");
  const setChartTab = (tab: ChartTab) => setManual({ forParam: paramTab, tab });

  const chartPanelId = useId();
  const chartTabsPrefix = useId();

  const chartTabId = (tab: ChartTab) => `${chartTabsPrefix}-${tab}`;

  const [realTerms, setRealTerms] = useState(true);

  const infl = inputs.inflationRate ?? 0;
  const showRealToggle = infl > 0;
  const real = showRealToggle && realTerms;


  useEffect(() => {
    const openFromHash = () => { if (window.location.hash === "#confidence") setHashTab("confidence"); };
    openFromHash();
    window.addEventListener("hashchange", openFromHash);
    window.addEventListener("popstate", openFromHash);
    return () => { window.removeEventListener("hashchange", openFromHash); window.removeEventListener("popstate", openFromHash); };
  }, []);

  const makeItMine = () => { if (shared) setInputs(shared); router.push("/planner"); };

  const plan = useMemo(() => simulateFire(inputs), [inputs]);

  const netWorth = (inputs.pots?.isa?.balance ?? inputs.isaBalance ?? 0) + ((inputs.pots?.gia?.balance ?? inputs.giaBalance ?? 0) ?? 0) + (inputs.pots?.sipp?.balance ?? inputs.sippBalance ?? 0) + (inputs.rentalValue ?? 0) + (inputs.homeValue ?? 0);
  const provisional = netWorth === 0;

  const sustainable = plan.sustainableToLifeExpectancy;
  const firstShortfall = plan.timeline.find((y) => y.shortfall)?.age;
  const lastYear = plan.timeline[plan.timeline.length - 1];
  const horizon = Math.max(inputs.lifeExpectancyAge ?? 90, lastYear ? lastYear.age : 0);

  return (
    <div className="mx-auto w-full max-w-4xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 sm:flex-nowrap">
        <div>
          <div className="flex items-center gap-3">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">
              {readOnly ? "Shared plan" : "Your plan"}
            </h2>
            <span
              className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                provisional ? "bg-surface-muted text-muted-foreground" : sustainable ? "bg-brand/15 text-success" : "bg-danger/15 text-danger"
              }`}
            >
              <span
                className={`size-1.5 rounded-full ${
                  provisional ? "bg-muted-foreground" : sustainable ? "bg-success" : "bg-danger"
                }`}
              />
              {provisional ? "Provisional" : sustainable ? "On track" : "Shortfall"}
            </span>
          </div>
          <p className="mt-1 max-w-[45ch] text-sm text-muted-foreground">
            {provisional
              ? "Add your balances to see if you're on track."
              : sustainable
                ? `Funds ${format(plan.inputs.targetAnnualIncome)}/yr to age ${horizon}.`
                : `Falls short from age ${firstShortfall}.`}
          </p>
        </div>
        <div className="shrink-0">
          {readOnly ? (
            <Button onClick={makeItMine}>Make it mine</Button>
          ) : (
            <PlanActions />
          )}
        </div>
      </div>

      {restoreError && (
        <div className="rounded-lg border border-danger/40 bg-danger/10 px-4 py-3 text-sm text-danger">
          <p className="font-medium">Couldn&apos;t load your saved plan</p>
          <p className="mt-0.5 opacity-90">{restoreError}</p>
        </div>
      )}

      {!readOnly && <QuickLevers />}

      {/* Projection */}
      <Card padding="md" id="confidence" className="scroll-mt-24">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <MonoLabel>Projection</MonoLabel>
            {showRealToggle && (
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
          </div>
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
        
        <AiInsights result={plan} isProvisional={provisional} isReadOnly={readOnly} />
      </Card>

      <OverviewPanel result={plan} realTerms={real} />

      <p className="px-1 text-xs text-muted-foreground">
        Estimates based on simplified assumptions — not financial advice.{" "}
        <Link href="/methodology" className="underline-offset-2 hover:text-foreground hover:underline">
          See the methodology
        </Link>
        .
      </p>
    </div>
  );
}
