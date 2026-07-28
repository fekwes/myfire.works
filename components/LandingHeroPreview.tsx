"use client";

import { usePlan } from "@/components/PlanProvider";
import { useFormat } from "@/hooks/useFormat";
import { simulateFire, type FireInputs } from "@/lib/fire-engine";
import { computeFireNumber } from "@/lib/fire-number";

// Sample plans tailored to each country pack so the hero card reflects local numbers
const UK_SAMPLE: FireInputs = {
  country: "uk",
  currentAge: 40,
  retirementAge: 55,
  targetAnnualIncome: 24000,
  isaBalance: 120000,
  isaMonthlyContribution: 600,
  sippBalance: 180000,
  sippMonthlyContribution: 500,
  inflationRate: 0.025,
};

const US_SAMPLE: FireInputs = {
  country: "us",
  currentAge: 40,
  retirementAge: 55,
  targetAnnualIncome: 50000,
  pots: {
    "roth-ira": { balance: 150000, monthlyContribution: 600, growth: 0.06 },
    "401k": { balance: 250000, monthlyContribution: 1000, growth: 0.06 },
    brokerage: { balance: 50000, monthlyContribution: 200, growth: 0.06 },
  },
  inflationRate: 0.025,
};

function burstRays(cx: number, cy: number) {
  return Array.from({ length: 12 }, (_, i) => {
    const angle = (i / 12) * Math.PI * 2;
    const inner = 6;
    const outer = 12 + (i % 3) * 4.5;
    return {
      x1: +(cx + Math.cos(angle) * inner).toFixed(2),
      y1: +(cy + Math.sin(angle) * inner).toFixed(2),
      x2: +(cx + Math.cos(angle) * outer).toFixed(2),
      y2: +(cy + Math.sin(angle) * outer).toFixed(2),
      tip: i % 2 === 0,
      violet: i % 3 === 0,
    };
  });
}

const PLOT = { right: 288, top: 14, baseline: 60 };

function sparklinePath(values: number[], width: number) {
  const max = Math.max(...values, 1);
  const stepX = PLOT.right / Math.max(1, values.length - 1);
  const span = PLOT.baseline - PLOT.top;
  const y = (v: number) => PLOT.baseline - (v / max) * span;
  const point = (v: number, i: number) => ({ x: i * stepX, y: y(v) });
  const line = values
    .map((v, i) => {
      const p = point(v, i);
      return `${i === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`;
    })
    .join(" ");
  const last = point(values[values.length - 1], values.length - 1);
  return {
    line,
    area: `${line} L${PLOT.right},${PLOT.baseline} L0,${PLOT.baseline} Z`,
    end: last,
    width,
  };
}

export function LandingHeroPreview() {
  const { activeRegion, activePack } = usePlan();
  const { format } = useFormat();

  const sample = activeRegion === "us" ? US_SAMPLE : UK_SAMPLE;
  const plan = simulateFire(sample);
  const { fireNumber } = computeFireNumber(sample);
  const sustainable = plan.sustainableToLifeExpectancy;

  const infl = sample.inflationRate ?? 0;
  const values = plan.timeline
    .filter((y) => y.age <= sample.retirementAge)
    .map((y) => {
      let totalEnd = 0;
      for (const pot of Object.values(y.pots)) {
        totalEnd += pot.end;
      }
      return totalEnd / (1 + infl) ** (y.age - sample.currentAge);
    });

  const { line, area, end } = sparklinePath(values, 320);

  return (
    <div
      data-launch-to
      className="landing-rise relative overflow-hidden rounded-3xl border border-border/50 bg-surface/80 p-6 shadow-2xl shadow-brand/5 backdrop-blur-xl [animation-delay:120ms]"
    >
      {/* Inner top glow highlight */}
      <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent" />
      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
          {activeRegion === "us" ? "🇺🇸 Sample US Plan" : "🇬🇧 Sample UK Plan"}
        </span>
        <span
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[0.7rem] font-medium ${
            sustainable ? "bg-brand/15 text-success" : "bg-danger/15 text-danger"
          }`}
        >
          <span className={`size-1.5 rounded-full ${sustainable ? "bg-success" : "bg-danger"}`} />
          {sustainable ? "On track" : "Shortfall"}
        </span>
      </div>

      <p className="mt-5 font-mono text-[0.62rem] uppercase tracking-wide text-muted-foreground">
        FIRE target pot
      </p>
      <p className="mt-1 font-display text-4xl font-bold tabular tracking-tight text-transparent bg-clip-text bg-gradient-to-br from-brand to-accent">
        {format(fireNumber)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        pot needed by age {sample.retirementAge} to spend {format(sample.targetAnnualIncome)}/yr in today&apos;s money.
      </p>

      <svg
        viewBox="0 0 320 70"
        className="mt-5 w-full overflow-visible"
        preserveAspectRatio="xMidYMid meet"
        role="img"
        aria-label="Projected assets rising over time, ending at your FIRE moment"
      >
        <defs>
          <linearGradient id="hero-preview-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.28} />
            <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
          </linearGradient>
          <radialGradient id="hero-burst-glow">
            <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.55} />
            <stop offset="45%" stopColor="var(--primary)" stopOpacity={0.18} />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity={0} />
          </radialGradient>
          <linearGradient id="hero-fill-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="78%" stopColor="#fff" stopOpacity={1} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <mask id="hero-fill-mask">
            <rect x="0" y="0" width="320" height="70" fill="url(#hero-fill-fade)" />
          </mask>
        </defs>
        <line
          x1={0}
          y1={PLOT.baseline}
          x2={320}
          y2={PLOT.baseline}
          stroke="var(--border)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <path
          className="hero-chart-fill"
          d={area}
          fill="url(#hero-preview-fill)"
          mask="url(#hero-fill-mask)"
        />
        <path
          data-launch-join
          className="hero-chart-draw"
          d={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          pathLength={1}
        />

        <circle
          className="spark-pop"
          cx={end.x}
          cy={end.y}
          r={26}
          fill="url(#hero-burst-glow)"
        />
        <g className="spark-pop">
          {burstRays(end.x, end.y).map((r, i) => (
            <g key={i}>
              <line
                x1={r.x1}
                y1={r.y1}
                x2={r.x2}
                y2={r.y2}
                stroke={r.violet ? "var(--accent)" : "var(--brand)"}
                strokeWidth={0.9}
                strokeLinecap="round"
                opacity={0.85}
              />
              {r.tip && <circle cx={r.x2} cy={r.y2} r={0.9} fill="var(--brand)" />}
            </g>
          ))}
          <circle cx={end.x} cy={end.y} r={4.5} fill="none" stroke="var(--primary)" strokeWidth={0.7} opacity={0.5} />
          <circle cx={end.x} cy={end.y} r={2.75} fill="var(--brand)" />
        </g>
      </svg>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <div className="rounded-xl border border-border bg-surface-muted p-3">
          <p className="font-mono text-[0.58rem] uppercase tracking-wide text-muted-foreground">
            Target retirement age
          </p>
          <p className="mt-0.5 font-display text-sm font-bold">
            Age {sample.retirementAge}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-3">
          <p className="font-mono text-[0.58rem] uppercase tracking-wide text-muted-foreground">
            {activePack.labels.taxDeferredWrapper} unlock age
          </p>
          <p className="mt-0.5 font-display text-sm font-bold text-success">
            Age {sample.country === "us" ? "59½" : "57"}
          </p>
        </div>
      </div>
    </div>
  );
}
