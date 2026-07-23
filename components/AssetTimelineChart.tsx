"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { FireSimulationResult } from "@/lib/fire-engine";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";

interface TooltipPayloadEntry {
  name: string;
  value: number;
  color: string;
}

function ChartTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: TooltipPayloadEntry[];
  label?: number;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-xl border border-border bg-surface/95 p-3 text-xs shadow-xl backdrop-blur">
      <p className="mb-2 font-display font-semibold text-foreground">
        Age {label}
      </p>
      <div className="space-y-1">
        {payload.map((entry) => (
          <p
            key={entry.name}
            className="flex items-center justify-between gap-4 tabular"
          >
            <span className="flex items-center gap-1.5 text-muted-foreground">
              <span
                className="inline-block size-2 rounded-full"
                style={{ background: entry.color }}
              />
              {entry.name}
            </span>
            <span className="font-medium text-foreground">
              {formatCurrency(entry.value)}
            </span>
          </p>
        ))}
      </div>
    </div>
  );
}

export function AssetTimelineChart({
  result,
}: {
  result: FireSimulationResult;
}) {
  const data = result.timeline.map((year) => ({
    age: year.age,
    ISA: Math.round(year.isaBalanceEnd),
    SIPP: Math.round(year.sippBalanceEnd),
  }));

  const { sippAccessAge, statePensionAge } = result.inputs;

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="isaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-data-2)" stopOpacity={0.3} />
              <stop offset="100%" stopColor="var(--color-data-2)" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="sippFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-data-1)" stopOpacity={0.35} />
              <stop offset="100%" stopColor="var(--color-data-1)" stopOpacity={0.01} />
            </linearGradient>
          </defs>
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
          <Tooltip content={<ChartTooltip />} />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
          />
          {/* Vertically separated labels so they never collide */}
          <ReferenceLine
            x={sippAccessAge}
            stroke="var(--color-brand)"
            strokeDasharray="4 4"
            label={{
              value: "SIPP access",
              position: "insideTopLeft",
              fill: "var(--color-muted-foreground)",
              fontSize: 10,
            }}
          />
          <ReferenceLine
            x={statePensionAge}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
            label={{
              value: "State Pension",
              position: "insideBottomRight",
              fill: "var(--color-muted-foreground)",
              fontSize: 10,
            }}
          />
          <Area
            type="monotone"
            dataKey="ISA"
            name="ISA / GIA"
            stroke="var(--color-data-2)"
            fill="url(#isaFill)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
          <Area
            type="monotone"
            dataKey="SIPP"
            name="SIPP"
            stroke="var(--color-data-1)"
            fill="url(#sippFill)"
            strokeWidth={2.5}
            dot={false}
            activeDot={{ r: 4, strokeWidth: 0 }}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
