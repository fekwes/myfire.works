"use client";

import {
  Bar,
  ComposedChart,
  Line,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  Legend,
} from "recharts";
import type { FireSimulationResult } from "@/lib/fire-engine";
import { formatCurrency, formatCurrencyCompact } from "@/lib/format";

interface TooltipPayloadEntry {
  name: string;
  value: number;
  payload: { age: number; netIncome: number; shortfall: boolean; [key: string]: unknown };
  color: string;
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
    <div className="rounded-xl border border-border bg-surface/95 p-3 text-xs shadow-xl backdrop-blur min-w-[140px]">
      <p className="mb-2 font-display font-semibold text-foreground">Age {age}</p>
      {payload.filter(p => p.value > 0 && p.name !== 'target' && p.name !== 'netIncome').map(p => (
        <div key={p.name} className="flex justify-between gap-4 mb-1">
          <span className="flex items-center gap-1.5 text-muted-foreground">
            <span className="inline-block size-2 rounded-sm" style={{ backgroundColor: p.color }} />
            {p.name}
          </span>
          <span className="font-medium tabular text-foreground">{formatCurrency(p.value)}</span>
        </div>
      ))}
      <div className="mt-2 pt-2 border-t border-border/50 flex justify-between gap-4 font-semibold">
        <span className="text-foreground">Total Net</span>
        <span className={`tabular ${shortfall ? "text-danger" : "text-success"}`}>
          {formatCurrency(netIncome)}
        </span>
      </div>
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

      const isaGross = year.potWithdrawals.isa?.gross ?? 0;
      const giaGross = year.potWithdrawals.gia?.gross ?? 0;
      const sippGross = year.potWithdrawals.sipp?.gross ?? 0;
      
      const giaNet = Math.max(0, giaGross - year.capitalGainsTaxPaid);
      
      const subjectToIncomeTax = sippGross + year.statePensionIncome + year.rentalIncome + year.partTimeIncome;
      const itRatio = subjectToIncomeTax > 0 ? Math.max(0, 1 - year.incomeTaxPaid / subjectToIncomeTax) : 1;
      
      const sippNet = sippGross * itRatio;
      const statePensionNet = year.statePensionIncome * itRatio;
      const rentalNet = year.rentalIncome * itRatio;
      const workNet = year.partTimeIncome * itRatio;
      const propertyCash = year.propertyCashReleased ?? 0;

      return {
        age: year.age,
        netIncome: Math.round(year.netIncome * deflator),
        isa: Math.round(isaGross * deflator),
        gia: Math.round(giaNet * deflator),
        sipp: Math.round(sippNet * deflator),
        statePension: Math.round(statePensionNet * deflator),
        rental: Math.round(rentalNet * deflator),
        work: Math.round(workNet * deflator),
        propertyCash: Math.round(propertyCash * deflator),
        target: Math.round(target),
        shortfall: year.shortfall,
      };
    });



  return (
    <div className="w-full">
      <div className="h-64 w-full">
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
          <Legend 
            wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
            iconType="circle"
            iconSize={8}
          />
          <Line
            type="stepAfter"
            dataKey="target"
            name="Target"
            stroke="var(--color-muted-foreground)"
            strokeDasharray="4 4"
            dot={false}
            activeDot={false}
            strokeWidth={1.5}
            legendType="plainline"
          />
          <Bar dataKey="work" name="Work" stackId="a" fill="var(--color-data-3)" maxBarSize={18} />
          <Bar dataKey="rental" name="Rental" stackId="a" fill="var(--color-data-2)" maxBarSize={18} />
          <Bar dataKey="statePension" name="State Pension" stackId="a" fill="var(--color-data-1)" maxBarSize={18} />
          <Bar dataKey="sipp" name="SIPP" stackId="a" fill="var(--color-brand)" maxBarSize={18} />
          <Bar dataKey="gia" name="GIA" stackId="a" fill="var(--color-accent)" maxBarSize={18} />
          <Bar dataKey="isa" name="ISA" stackId="a" fill="var(--color-success)" maxBarSize={18} />
          <Bar dataKey="propertyCash" name="Property Cash" stackId="a" fill="#fbbf24" maxBarSize={18} />
        </ComposedChart>
      </ResponsiveContainer>
      </div>
    </div>
  );
}
