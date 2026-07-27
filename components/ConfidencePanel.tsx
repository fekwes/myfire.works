"use client";

import { X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import {
  Area,
  CartesianGrid,
  ComposedChart,
  Line,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Button } from "@/components/ui";
import type { FireInputs } from "@/lib/fire-engine";
import {
  runMonteCarlo,
  type MonteCarloResult,
  type StrategyResult,
} from "@/lib/monte-carlo";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";
import { portfolioAllocation } from "@/lib/vanguard-funds";

function tone(rate: number) {
  if (rate >= 0.85) return "text-success";
  if (rate >= 0.6) return "text-foreground";
  return "text-danger";
}

/** Dismissed once, stays dismissed — this is a first-visit explainer. */
const EXPLAINER_KEY = "onfire:confidence-explainer-dismissed";

/**
 * A plain-English intro shown the first time someone opens the Confidence tab,
 * where the jargon is thickest (success rate, guardrails, percentiles). It
 * explains the idea rather than the controls, and can be dismissed for good.
 */
function ConfidenceExplainer() {
  const [state, setState] = useState({ ready: false, dismissed: false });

  useEffect(() => {
    const read = () => {
      let dismissed = false;
      try {
        dismissed = localStorage.getItem(EXPLAINER_KEY) === "1";
      } catch {
        // no-op
      }
      setState({ ready: true, dismissed });
    };
    read();
  }, []);

  if (!state.ready || state.dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(EXPLAINER_KEY, "1");
    } catch {
      // no-op
    }
    setState((s) => ({ ...s, dismissed: true }));
  };

  return (
    <aside className="relative rounded-xl border border-accent/40 bg-accent/[0.06] p-4 pr-9 text-sm leading-relaxed text-muted-foreground">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss explanation"
        className="absolute right-2 top-2 rounded-full p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <p className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
        New here? What this does
      </p>
      <p className="mt-2">
        Markets never deliver a steady return — some decades soar, some slump.
        This runs your plan through 2,000 random market histories and counts how
        often your money lasts to the end.
      </p>
      <p className="mt-2">
        The{" "}
        <span className="font-medium text-foreground">success rate</span> is that
        share of runs — above ~85% is a comfortable margin, below ~60% the plan
        is fragile. The three strategies differ in how you react to bad years: a{" "}
        <span className="font-medium text-foreground">flat</span> withdrawal
        never changes, while{" "}
        <span className="font-medium text-foreground">guardrails</span> trim
        spending (±5% or ±10%) when the pot dips and restore it once markets
        recover.
      </p>
    </aside>
  );
}

function SuccessCard({ s }: { s: StrategyResult }) {
  return (
    <div className="rounded-xl border border-border bg-surface-muted p-3.5">
      <p className="font-mono text-[0.62rem] uppercase tracking-wide text-muted-foreground">
        {s.label}
      </p>
      <p className={`mt-1 font-display text-xl font-bold tabular ${tone(s.successRate)}`}>
        {Math.round(s.successRate * 100)}%
      </p>
      <p className="text-[0.65rem] text-muted-foreground">success rate</p>
    </div>
  );
}

function FanTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: { payload: { p10: number; p50: number; p90: number } }[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  const { p10, p50, p90 } = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-surface/95 p-3 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-display font-semibold text-foreground">Age {label}</p>
      <p className="tabular text-muted-foreground">
        Median <span className="text-foreground">{formatCurrency(p50)}</span>
      </p>
      <p className="tabular text-muted-foreground">
        Range {formatCurrency(p10)} – {formatCurrency(p90)}
      </p>
    </div>
  );
}

export function ConfidencePanel({ inputs }: { inputs: FireInputs }) {
  // The allocation the user's chosen funds imply — the default the simulation
  // runs at, so the risk analysis matches the portfolio they actually built.
  const alloc = useMemo(() => portfolioAllocation(inputs), [inputs]);
  const derivedPct = Math.round(alloc.equity * 100);

  // The slider defaults to the funds' implied allocation; a manual drag sets
  // an override, so changing funds keeps flowing through until the user takes
  // control. "Use my portfolio" clears the override.
  const [manualPct, setManualPct] = useState<number | null>(null);
  const equityPct = manualPct ?? derivedPct;
  const overridden = manualPct !== null && manualPct !== derivedPct;

  const [result, setResult] = useState<MonteCarloResult | null>(null);
  const [loading, setLoading] = useState(false);

  function run() {
    setLoading(true);
    // Yield so the loading state paints before the (~100ms) computation.
    setTimeout(() => {
      setResult(runMonteCarlo(inputs, { equityFraction: equityPct / 100, sims: 2000 }));
      setLoading(false);
    }, 20);
  }

  const flat = result?.strategies.find((s) => s.key === "flat");
  const fanData = flat?.percentiles.map((p) => ({
    age: p.age,
    band: [p.p10, p.p90] as [number, number],
    p50: p.p50,
  }));

  return (
    <div className="space-y-4">
      <ConfidenceExplainer />

      <p className="text-sm leading-relaxed text-muted-foreground">
        Instead of one fixed return, this runs 2,000 randomised market paths to
        estimate the <span className="font-medium text-foreground">probability</span>{" "}
        your plan survives — and how three withdrawal strategies compare.
      </p>

      <div className="flex flex-wrap items-end gap-4">
        <label className="flex-1">
          <span className="mb-1.5 flex items-center justify-between text-sm font-medium text-foreground">
            <span>Equity allocation</span>
            <span className="tabular text-muted-foreground">
              {equityPct}% equity / {100 - equityPct}% bonds &amp; cash
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={equityPct}
            onChange={(e) => setManualPct(Number(e.target.value))}
            className="w-full accent-[var(--color-brand)]"
          />
          <span className="mt-1 block text-xs text-muted-foreground">
            {overridden ? (
              <>
                Your funds imply {derivedPct}% equity.{" "}
                <button
                  type="button"
                  onClick={() => setManualPct(null)}
                  className="font-medium text-foreground underline-offset-2 hover:underline"
                >
                  Use my portfolio
                </button>
              </>
            ) : (
              "Set from the funds you picked in Edit plan — drag to explore."
            )}
          </span>
        </label>
        <Button type="button" onClick={run} disabled={loading}>
          {loading ? "Running…" : result ? "Re-run" : "Run simulation"}
        </Button>
      </div>

      {result && (
        <>
          <div className="grid grid-cols-3 gap-3">
            {result.strategies.map((s) => (
              <SuccessCard key={s.key} s={s} />
            ))}
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart
                data={fanData}
                margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
              >
                <CartesianGrid
                  strokeDasharray="2 5"
                  stroke="var(--color-border)"
                  vertical={false}
                />
                <XAxis
                  dataKey="age"
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={{ stroke: "var(--color-border)" }}
                  minTickGap={20}
                />
                <YAxis
                  tickFormatter={(v) => formatCurrencyCompact(v)}
                  tick={{ fill: "var(--color-muted-foreground)", fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  width={52}
                />
                <Tooltip
                  content={<FanTooltip />}
                  cursor={{
                    stroke: "var(--color-muted-foreground)",
                    strokeWidth: 1,
                    strokeDasharray: "3 3",
                  }}
                />
                {/* One entity, two marks: the shaded band is the uncertainty
                    around the median line, so both wear the same hue. */}
                <Area
                  dataKey="band"
                  stroke="none"
                  fill="var(--color-data-1)"
                  fillOpacity={0.16}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="p50"
                  stroke="var(--color-data-1)"
                  strokeWidth={2}
                  dot={false}
                  activeDot={{
                    r: 4,
                    strokeWidth: 2,
                    stroke: "var(--color-chart-surface)",
                  }}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-0.5 w-4 rounded-full bg-data-1"
              />
              Median outcome
            </span>
            <span className="flex items-center gap-1.5">
              <span
                aria-hidden
                className="inline-block h-2.5 w-4 rounded-sm bg-data-1/20"
              />
              10th–90th percentile
            </span>
          </div>

          <p className="text-xs text-muted-foreground">
            Portfolio value, flat withdrawal. {result.sims.toLocaleString()}{" "}
            paths · {Math.round(result.mean * 1000) / 10}% mean ·{" "}
            {Math.round(result.vol * 1000) / 10}% volatility.
          </p>
        </>
      )}

      {!result && !loading && (
        <p className="rounded-lg border border-dashed border-border px-3 py-6 text-center text-xs text-muted-foreground">
          Choose an allocation and run the simulation to see your success odds.
        </p>
      )}
    </div>
  );
}
