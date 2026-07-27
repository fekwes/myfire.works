import { simulateFire, type FireInputs } from "@/lib/fire-engine";
import { computeFireNumber } from "@/lib/fire-number";
import { formatCurrency } from "@/lib/format";

// A representative on-track plan. These are real engine outputs — the same
// numbers the planner would show — so the hero previews the actual product
// rather than a mocked-up screenshot.
const SAMPLE: FireInputs = {
  currentAge: 36,
  retirementAge: 54,
  targetAnnualIncome: 38000,
  isaBalance: 190000,
  isaMonthlyContribution: 2100,
  sippBalance: 230000,
  sippMonthlyContribution: 1500,
  inflationRate: 0.025,
};

// The burst that ends the arc. Rays are struck in the sparkline's own user
// units; the SVG is `overflow-visible` so the longest ones and the bloom spill
// past the plot into the card's padding, which is the point — the FI moment
// escapes the chart.
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

// The plot is inset inside the viewBox rather than filling it. The final point
// is the burst, and a burst in the very corner gets guillotined — the line, the
// area's closing edge and the bloom all hit the boundary at once, which is what
// made the old chart look cut off. Leaving room right and above lets the climax
// sit *in* the frame with its glow spilling past.
const PLOT = { right: 288, top: 14, baseline: 60 };

function sparklinePath(values: number[], width: number) {
  const max = Math.max(...values, 1);
  const stepX = PLOT.right / (values.length - 1);
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
  const plan = simulateFire(SAMPLE);
  const { fireNumber } = computeFireNumber(SAMPLE);
  const sustainable = plan.sustainableToLifeExpectancy;

  // Total pot over time, in today's money, for the sparkline shape — the
  // *accumulation* only. The burst at the end of this line is the FI moment, so
  // the line has to stop there. Running on to life expectancy (as it did) drew
  // forty flat years of drawdown after the climax, which both contradicted the
  // chart's own label and left the curve arriving at the burst dead level.
  const infl = SAMPLE.inflationRate ?? 0;
  const values = plan.timeline
    .filter((y) => y.age <= SAMPLE.retirementAge)
    .map(
      (y) =>
        (y.isaBalanceEnd + y.giaBalanceEnd + y.sippBalanceEnd) /
        (1 + infl) ** (y.age - SAMPLE.currentAge),
    );
  const { line, area, end } = sparklinePath(values, 320);

  return (
    <div
      data-launch-to
      className="landing-rise rounded-3xl border border-border bg-surface p-6 shadow-[var(--shadow-lg)] [animation-delay:120ms]"
    >
      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
          Example plan
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
        FIRE number
      </p>
      <p className="mt-1 font-display text-4xl font-bold tabular tracking-tight">
        {formatCurrency(fireNumber)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        the pot this example needs by age {SAMPLE.retirementAge}, in today&apos;s
        money.
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
          {/* The area has to stop somewhere, and a vertical edge directly under
              the burst reads as a cut. Dissolve the last stretch instead. */}
          <linearGradient id="hero-fill-fade" x1="0" y1="0" x2="1" y2="0">
            <stop offset="78%" stopColor="#fff" stopOpacity={1} />
            <stop offset="100%" stopColor="#fff" stopOpacity={0} />
          </linearGradient>
          <mask id="hero-fill-mask">
            <rect x="0" y="0" width="320" height="70" fill="url(#hero-fill-fade)" />
          </mask>
        </defs>
        {/* faint baseline — sits on the plot's floor, not the viewBox's */}
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
        {/* This line is the second half of the hero's launch trail — the
            decorative arc runs under the card and re-emerges here as real
            engine output, so it draws itself once the trail has finished. */}
        <path
          data-launch-join
          className="hero-chart-draw"
          d={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
        />

        {/* The burst — the FI moment, where the trail finally goes off. */}
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
            Retire at
          </p>
          <p className="mt-0.5 font-display text-sm font-bold">
            Age {SAMPLE.retirementAge}
          </p>
        </div>
        <div className="rounded-xl border border-border bg-surface-muted p-3">
          <p className="font-mono text-[0.58rem] uppercase tracking-wide text-muted-foreground">
            Plan lasts to
          </p>
          <p className="mt-0.5 font-display text-sm font-bold text-success">
            Age {plan.inputs.lifeExpectancyAge}+
          </p>
        </div>
      </div>
    </div>
  );
}
