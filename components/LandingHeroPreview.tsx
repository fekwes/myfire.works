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

function sparklinePath(values: number[], width: number, height: number) {
  const max = Math.max(...values, 1);
  const stepX = width / (values.length - 1);
  const y = (v: number) => height - (v / max) * (height - 6) - 3;
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
    area: `${line} L${width},${height} L0,${height} Z`,
    end: last,
  };
}

export function LandingHeroPreview() {
  const plan = simulateFire(SAMPLE);
  const { fireNumber } = computeFireNumber(SAMPLE);
  const sustainable = plan.sustainableToLifeExpectancy;

  // Total pot over time, in today's money, for the sparkline shape.
  const infl = SAMPLE.inflationRate ?? 0;
  const values = plan.timeline.map(
    (y) =>
      (y.isaBalanceEnd + y.giaBalanceEnd + y.sippBalanceEnd) /
      (1 + infl) ** (y.age - SAMPLE.currentAge),
  );
  const { line, area, end } = sparklinePath(values, 320, 64);

  return (
    <div className="landing-rise rounded-3xl border border-border bg-surface p-6 shadow-[var(--shadow-lg)] [animation-delay:120ms]">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.62rem] uppercase tracking-[0.16em] text-muted-foreground">
          Your plan · preview
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
        Your FIRE number
      </p>
      <p className="mt-1 font-display text-4xl font-bold tabular tracking-tight">
        {formatCurrency(fireNumber)}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        the pot you need by {SAMPLE.retirementAge}, in today&apos;s money.
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
        </defs>
        {/* faint baseline */}
        <line
          x1={0}
          y1={64}
          x2={320}
          y2={64}
          stroke="var(--border)"
          strokeWidth={1}
          vectorEffect="non-scaling-stroke"
        />
        <path d={area} fill="url(#hero-preview-fill)" />
        <path
          d={line}
          fill="none"
          stroke="var(--primary)"
          strokeWidth={2.25}
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        {/* the burst — the FI moment at the end of the trail */}
        <circle cx={end.x} cy={end.y} r={5.5} fill="var(--brand)" opacity={0.28} />
        <circle cx={end.x} cy={end.y} r={2.75} fill="var(--primary)" />
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
