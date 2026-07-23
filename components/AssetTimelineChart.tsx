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
    <div className="rounded-lg border border-border bg-surface p-3 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-foreground">Age {label}</p>
      {payload.map((entry) => (
        <p
          key={entry.name}
          className="flex items-center gap-1.5"
          style={{ color: entry.color }}
        >
          <span
            className="inline-block size-2 rounded-full"
            style={{ background: entry.color }}
          />
          {entry.name}: {formatCurrency(entry.value)}
        </p>
      ))}
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
          margin={{ top: 8, right: 16, bottom: 0, left: 0 }}
        >
          <defs>
            <linearGradient id="isaFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-accent)"
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor="var(--color-accent)"
                stopOpacity={0.02}
              />
            </linearGradient>
            <linearGradient id="sippFill" x1="0" y1="0" x2="0" y2="1">
              <stop
                offset="0%"
                stopColor="var(--color-primary)"
                stopOpacity={0.35}
              />
              <stop
                offset="100%"
                stopColor="var(--color-primary)"
                stopOpacity={0.02}
              />
            </linearGradient>
          </defs>
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
          <Tooltip content={<ChartTooltip />} />
          <Legend
            wrapperStyle={{ fontSize: 12, color: "var(--color-muted-foreground)" }}
          />
          <ReferenceLine
            x={sippAccessAge}
            stroke="var(--color-accent)"
            strokeDasharray="4 4"
            label={{
              value: "Bridge → SIPP",
              position: "insideTopLeft",
              fill: "var(--color-accent)",
              fontSize: 11,
            }}
          />
          <ReferenceLine
            x={statePensionAge}
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
            label={{
              value: "State Pension",
              position: "insideTopRight",
              fill: "var(--color-muted-foreground)",
              fontSize: 11,
            }}
          />
          <Area
            type="monotone"
            dataKey="ISA"
            name="ISA / GIA"
            stroke="var(--color-accent)"
            fill="url(#isaFill)"
            strokeWidth={2}
          />
          <Area
            type="monotone"
            dataKey="SIPP"
            name="SIPP"
            stroke="var(--color-primary)"
            fill="url(#sippFill)"
            strokeWidth={2}
          />
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
