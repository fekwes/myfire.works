"use client";

import { useState } from "react";
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
import type { FireInputs } from "@/lib/fire-engine";
import {
  runMonteCarlo,
  type MonteCarloResult,
  type StrategyResult,
} from "@/lib/monte-carlo";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";

function tone(rate: number) {
  if (rate >= 0.85) return "text-success";
  if (rate >= 0.6) return "text-foreground";
  return "text-danger";
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
  const [equityPct, setEquityPct] = useState(80);
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
              {equityPct}% equity / {100 - equityPct}% bonds
            </span>
          </span>
          <input
            type="range"
            min={0}
            max={100}
            step={5}
            value={equityPct}
            onChange={(e) => setEquityPct(Number(e.target.value))}
            className="w-full accent-[var(--color-brand)]"
          />
        </label>
        <button
          type="button"
          onClick={run}
          disabled={loading}
          className="rounded-lg bg-foreground px-4 py-2 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {loading ? "Running…" : result ? "Re-run" : "Run simulation"}
        </button>
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
                <Tooltip content={<FanTooltip />} />
                <Area
                  dataKey="band"
                  stroke="none"
                  fill="var(--color-brand)"
                  fillOpacity={0.15}
                  isAnimationActive={false}
                />
                <Line
                  dataKey="p50"
                  stroke="var(--color-brand)"
                  strokeWidth={2.5}
                  dot={false}
                  isAnimationActive={false}
                />
              </ComposedChart>
            </ResponsiveContainer>
          </div>

          <p className="text-xs text-muted-foreground">
            Portfolio value (flat withdrawal): median line, shaded 10th–90th
            percentile. {result.sims.toLocaleString()} paths ·{" "}
            {Math.round(result.mean * 1000) / 10}% mean ·{" "}
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
