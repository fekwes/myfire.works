"use client";

import {
  Area,
  CartesianGrid,
  ComposedChart,
  Legend,
  Line,
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

/**
 * Hovered point marker: 8px across with a 2px surface ring, so it stays
 * readable where two series cross.
 */
const activeDot = {
  r: 4,
  strokeWidth: 2,
  stroke: "var(--color-chart-surface)",
};

export function AssetTimelineChart({
  result,
  realTerms = false,
}: {
  result: FireSimulationResult;
  /** Show values in today's money (deflated by the plan's inflation rate). */
  realTerms?: boolean;
}) {
  const { currentAge, inflationRate } = result.inputs;
  const deflate = (value: number, age: number) =>
    realTerms && inflationRate > 0
      ? value / (1 + inflationRate) ** (age - currentAge)
      : value;

  const data = result.timeline.map((year) => ({
    age: year.age,
    ISA: Math.round(deflate(year.pots.isa.end, year.age)),
    GIA: Math.round(deflate(year.pots.gia.end, year.age)),
    SIPP: Math.round(deflate(year.pots.sipp.end, year.age)),
    "Net worth": Math.round(
      deflate(
        year.pots.isa.end +
          year.pots.gia.end +
          year.pots.sipp.end +
          year.rentalValueEnd +
          year.homeValueEnd,
        year.age,
      ),
    ),
  }));

  const { sippAccessAge, statePensionAge } = result.inputs;
  const hasGia = data.some((d) => d.GIA > 0.5);
  // Only worth a separate net-worth line when property lifts it above the pots.
  const hasProperty = result.timeline.some(
    (y) => y.rentalValueEnd > 0.5 || y.homeValueEnd > 0.5,
  );

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <ComposedChart
          data={data}
          margin={{ top: 12, right: 12, bottom: 0, left: 0 }}
        >
          {/* Hue is bound to the account, never to draw order or rank: ISA is
              always ember, SIPP always violet, GIA always teal. Hiding an
              empty GIA therefore never repaints the other two. */}
          <defs>
            <linearGradient id="isaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-data-1)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--color-data-1)" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="sippFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-data-2)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--color-data-2)" stopOpacity={0.01} />
            </linearGradient>
            <linearGradient id="giaFill" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--color-data-3)" stopOpacity={0.32} />
              <stop offset="100%" stopColor="var(--color-data-3)" stopOpacity={0.01} />
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
          <Tooltip
            content={<ChartTooltip />}
            cursor={{
              stroke: "var(--color-muted-foreground)",
              strokeWidth: 1,
              strokeDasharray: "3 3",
            }}
          />
          <Legend
            iconType="plainline"
            wrapperStyle={{ fontSize: 12, paddingTop: 4 }}
          />
          {/* Milestone annotations stay neutral so they never read as a series.
              Labels sit at opposite corners so they can't collide. */}
          <ReferenceLine
            x={sippAccessAge}
            stroke="var(--color-muted-foreground)"
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
            name="ISA"
            stroke="var(--color-data-1)"
            fill="url(#isaFill)"
            strokeWidth={2}
            dot={false}
            activeDot={activeDot}
          />
          {hasGia && (
            <Area
              type="monotone"
              dataKey="GIA"
              name="GIA"
              stroke="var(--color-data-3)"
              fill="url(#giaFill)"
              strokeWidth={2}
              dot={false}
              activeDot={activeDot}
            />
          )}
          <Area
            type="monotone"
            dataKey="SIPP"
            name="SIPP"
            stroke="var(--color-data-2)"
            fill="url(#sippFill)"
            strokeWidth={2}
            dot={false}
            activeDot={activeDot}
          />
          {hasProperty && (
            <Line
              type="monotone"
              dataKey="Net worth"
              name="Net worth (incl. property)"
              stroke="var(--color-muted-foreground)"
              strokeWidth={1.5}
              strokeDasharray="5 4"
              dot={false}
              activeDot={activeDot}
            />
          )}
        </ComposedChart>
      </ResponsiveContainer>
    </div>
  );
}
