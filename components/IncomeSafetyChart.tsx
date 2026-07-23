"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ReferenceLine,
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
    <div className="rounded-lg border border-border bg-surface p-3 text-xs shadow-lg">
      <p className="font-medium text-foreground">Age {age}</p>
      <p className={shortfall ? "text-danger" : "text-success"}>
        {formatCurrency(netIncome)} net{shortfall ? " — shortfall" : ""}
      </p>
    </div>
  );
}

export function IncomeSafetyChart({
  result,
}: {
  result: FireSimulationResult;
}) {
  const data = result.timeline
    .filter((year) => year.phase !== "accumulation")
    .map((year) => ({
      age: year.age,
      netIncome: Math.round(year.netIncome),
      shortfall: year.shortfall,
    }));

  const target = result.inputs.targetAnnualIncome;

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="var(--color-border)"
            vertical={false}
          />
          <XAxis
            dataKey="age"
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={{ stroke: "var(--color-border)" }}
          />
          <YAxis
            tickFormatter={(v) => formatCurrencyCompact(v)}
            tick={{ fill: "var(--color-muted-foreground)", fontSize: 12 }}
            tickLine={false}
            axisLine={false}
            width={56}
          />
          <Tooltip content={<ChartTooltip />} cursor={{ fill: "var(--color-border)", opacity: 0.3 }} />
          <ReferenceLine
            y={target}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
            label={{
              value: "Target",
              position: "insideTopRight",
              fill: "var(--color-muted-foreground)",
              fontSize: 11,
            }}
          />
          <Bar dataKey="netIncome" radius={[3, 3, 0, 0]}>
            {data.map((entry) => (
              <Cell
                key={entry.age}
                fill={
                  entry.shortfall ? "var(--color-danger)" : "var(--color-success)"
                }
              />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
