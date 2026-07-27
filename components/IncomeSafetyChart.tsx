"use client";

import {
  Bar,
  ComposedChart,
  Line,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FireSimulationResult } from "@/lib/fire-engine";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";

interface TooltipPayloadEntry {
  payload: { age: number; netIncome: number; shortfall: boolean };
}

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
}) {
  if (!active || !payload?.length) return null;
  const { age, netIncome, shortfall } = payload[0].payload;
  return (
    <div className="rounded-xl border border-border bg-surface/95 p-3 text-xs shadow-xl backdrop-blur">
      <p className="mb-1 font-display font-semibold text-foreground">Age {age}</p>
      <p className={`tabular ${shortfall ? "text-danger" : "text-success"}`}>
        {formatCurrency(netIncome)} net{shortfall ? " — shortfall" : ""}
      </p>
    </div>
  );
}

export function IncomeSafetyChart({
  result,
  realTerms = false,
}: {
  result: FireSimulationResult;
  realTerms?: boolean;
}) {
  const data = result.timeline
    .filter((year) => year.phase !== "accumulation")
    .map((year) => {
      const yearsOut = year.age - result.inputs.currentAge;
      const inflation = result.inputs.inflationRate ?? 0;
      const deflator = realTerms ? 1 / ((1 + inflation) ** yearsOut) : 1;
      
      const inflatedTarget = result.inputs.targetAnnualIncome * ((1 + inflation) ** yearsOut);
      const target = realTerms ? result.inputs.targetAnnualIncome : inflatedTarget;

      return {
        age: year.age,
        netIncome: Math.round(year.netIncome * deflator),
        target: Math.round(target),
        shortfall: year.shortfall,
      };
    });

  const hasShortfall = data.some((d) => d.shortfall);
  const target = result.inputs.targetAnnualIncome;

  return (
    <div className="w-full">
      <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
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
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-border)", opacity: 0.3 }} />
          <Line
            type="stepAfter"
            dataKey="target"
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
            strokeWidth={1.5}
          />
          <Bar dataKey="netIncome" radius={[4, 4, 0, 0]} maxBarSize={18}>
            {data.map((entry) => (
              <Cell
                key={entry.age}
                fill={
                  entry.shortfall ? "var(--color-danger)" : "var(--color-success)"
                }
              />
            ))}
          </Bar>
        </ComposedChart>
      </ResponsiveContainer>
      </div>

      {/* State is never colour-alone: name both states in a key. */}
      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block size-2.5 rounded-sm bg-success"
          />
          Target met
        </span>
        {hasShortfall && (
          <span className="flex items-center gap-1.5">
            <span
              aria-hidden
              className="inline-block size-2.5 rounded-sm bg-danger"
            />
            Shortfall
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span
            aria-hidden
            className="inline-block h-0 w-4 border-t border-dashed border-muted-foreground"
          />
          Your target ({formatCurrency(target)})
        </span>
      </div>
    </div>
  );
}
