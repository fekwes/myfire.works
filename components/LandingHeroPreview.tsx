"use client";

import { useCallback, useId, useMemo, useRef, useState } from "react";
import { Clock } from "lucide-react";
import { Spark } from "@/components/Logo";
import { useRegion } from "@/components/RegionProvider";
import { simulateFire, type FireInputs } from "@/lib/fire-engine";
import { computeFireNumber } from "@/lib/fire-number";
import { formatCurrency } from "@/lib/format";

type ScenarioKey = "standard" | "early" | "coast";

interface ScenarioConfig {
  id: ScenarioKey;
  label: string;
  badge: string;
  uk: FireInputs;
  us: FireInputs;
}

const SCENARIOS: ScenarioConfig[] = [
  {
    id: "standard",
    label: "Standard FIRE",
    badge: "Balanced Plan",
    uk: {
      currentAge: 36,
      retirementAge: 54,
      targetAnnualIncome: 38000,
      isaBalance: 190000,
      isaMonthlyContribution: 2100,
      sippBalance: 230000,
      sippMonthlyContribution: 1500,
      inflationRate: 0.025,
    },
    us: {
      currentAge: 36,
      retirementAge: 52,
      targetAnnualIncome: 55000,
      isaBalance: 240000,
      isaMonthlyContribution: 2500,
      sippBalance: 310000,
      sippMonthlyContribution: 2000,
      inflationRate: 0.025,
    },
  },
  {
    id: "early",
    label: "Early FIRE",
    badge: "Aggressive",
    uk: {
      currentAge: 36,
      retirementAge: 49,
      targetAnnualIncome: 34000,
      isaBalance: 210000,
      isaMonthlyContribution: 2800,
      sippBalance: 260000,
      sippMonthlyContribution: 1800,
      inflationRate: 0.025,
    },
    us: {
      currentAge: 36,
      retirementAge: 48,
      targetAnnualIncome: 50000,
      isaBalance: 270000,
      isaMonthlyContribution: 3200,
      sippBalance: 340000,
      sippMonthlyContribution: 2400,
      inflationRate: 0.025,
    },
  },
  {
    id: "coast",
    label: "Coast FIRE",
    badge: "Part-time Ease",
    uk: {
      currentAge: 36,
      retirementAge: 58,
      targetAnnualIncome: 42000,
      isaBalance: 160000,
      isaMonthlyContribution: 1200,
      sippBalance: 190000,
      sippMonthlyContribution: 1000,
      inflationRate: 0.025,
    },
    us: {
      currentAge: 36,
      retirementAge: 56,
      targetAnnualIncome: 62000,
      isaBalance: 200000,
      isaMonthlyContribution: 1600,
      sippBalance: 250000,
      sippMonthlyContribution: 1400,
      inflationRate: 0.025,
    },
  },
];

function calculateSparkline(values: number[], width: number, height: number) {
  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = width / Math.max(values.length - 1, 1);
  
  const getY = (val: number) => height - ((val - min) / range) * (height - 16) - 8;
  const getPoint = (val: number, idx: number) => ({
    x: idx * stepX,
    y: getY(val),
  });

  const points = values.map((val, idx) => getPoint(val, idx));
  const line = points
    .map((p, idx) => `${idx === 0 ? "M" : "L"}${p.x.toFixed(1)},${p.y.toFixed(1)}`)
    .join(" ");

  const area = `${line} L${width},${height} L0,${height} Z`;
  const lastPoint = points[points.length - 1] ?? { x: width, y: height / 2 };

  return { points, line, area, lastPoint, getY };
}

interface LandingHeroPreviewProps {
  onTriggerFireworks?: () => void;
  isFireworksActive?: boolean;
}

export function LandingHeroPreview({
  onTriggerFireworks,
  isFireworksActive = false,
}: LandingHeroPreviewProps) {
  const gradientId = useId();
  const { region, details } = useRegion();
  const [selectedScenario, setSelectedScenario] = useState<ScenarioKey>("standard");
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);
  const [localFireworks, setLocalFireworks] = useState(false);
  const svgRef = useRef<SVGSVGElement | null>(null);

  const scenarioConfig = useMemo(
    () => SCENARIOS.find((s) => s.id === selectedScenario) ?? SCENARIOS[0],
    [selectedScenario]
  );

  const sampleInputs = region === "uk" ? scenarioConfig.uk : scenarioConfig.us;
  const plan = useMemo(() => simulateFire(sampleInputs), [sampleInputs]);
  const { fireNumber } = useMemo(() => computeFireNumber(sampleInputs), [sampleInputs]);
  const sustainable = plan.sustainableToLifeExpectancy;

  const infl = sampleInputs.inflationRate ?? 0;
  const timelineValues = useMemo(() => {
    return plan.timeline.map((y) => {
      const totalGross = y.isaBalanceEnd + y.giaBalanceEnd + y.sippBalanceEnd;
      const yearsFromNow = Math.max(0, y.age - sampleInputs.currentAge);
      return totalGross / Math.pow(1 + infl, yearsFromNow);
    });
  }, [plan.timeline, sampleInputs.currentAge, infl]);

  const chartWidth = 440;
  const chartHeight = 130;
  const { points, line, area } = useMemo(
    () => calculateSparkline(timelineValues, chartWidth, chartHeight),
    [timelineValues]
  );

  // Identify index where retirement occurs
  const retirementIdx = useMemo(() => {
    const idx = plan.timeline.findIndex((t) => t.age >= sampleInputs.retirementAge);
    return idx >= 0 ? idx : Math.floor(plan.timeline.length / 2);
  }, [plan.timeline, sampleInputs.retirementAge]);

  const retirementPoint = points[retirementIdx] ?? points[points.length - 1];

  const handlePointerMove = useCallback(
    (e: React.PointerEvent<SVGSVGElement>) => {
      if (!svgRef.current || points.length === 0) return;
      const rect = svgRef.current.getBoundingClientRect();
      const x = e.clientX - rect.left;
      const ratio = Math.max(0, Math.min(1, x / rect.width));
      const idx = Math.round(ratio * (points.length - 1));
      setHoveredIdx(idx);
    },
    [points]
  );

  const handlePointerLeave = useCallback(() => {
    setHoveredIdx(null);
  }, []);

  const triggerCelebration = useCallback(() => {
    setLocalFireworks(true);
    if (onTriggerFireworks) {
      onTriggerFireworks();
    }
    const timer = setTimeout(() => {
      setLocalFireworks(false);
    }, 2800);
    return () => clearTimeout(timer);
  }, [onTriggerFireworks]);

  const isCelebrating = isFireworksActive || localFireworks;
  const activeHoverIdx = hoveredIdx !== null ? hoveredIdx : retirementIdx;
  const activeYearData = plan.timeline[activeHoverIdx] ?? plan.timeline[0];
  const activePoint = points[activeHoverIdx] ?? retirementPoint;
  const activeValue = timelineValues[activeHoverIdx] ?? 0;

  const isUk = region === "uk";
  const primaryAccountLabel = isUk ? "ISA & GIA Liquid" : "Roth & Brokerage";
  const pensionAccountLabel = isUk ? "SIPP Pension" : "401(k) & IRA";
  const pensionUnlockAge = isUk ? 57 : 59;
  const pensionUnlockDisplay = details.accessAges.pensionLabel;

  return (
    <div className="relative group">
      {/* Soft dark mode ambient backdrop glow */}
      <div className="absolute -inset-1.5 rounded-3xl bg-gradient-to-br from-brand/25 via-accent/20 to-primary/20 opacity-60 blur-xl transition-all duration-500 group-hover:opacity-85 group-hover:blur-2xl" />

      {/* Main Glassmorphic Visual Hero Container */}
      <div className="relative overflow-hidden rounded-3xl border border-border/90 bg-surface/90 p-5 shadow-[var(--shadow-lg)] backdrop-blur-xl transition-all duration-300 dark:border-white/10 dark:bg-surface/85 sm:p-7">
        
        {/* Scenario Switcher Tabs */}
        <div className="flex items-center justify-between gap-2 border-b border-border/70 pb-4">
          <div className="flex items-center gap-1 sm:gap-1.5 overflow-x-auto no-scrollbar py-0.5">
            {SCENARIOS.map((sc) => (
              <button
                key={sc.id}
                type="button"
                onClick={() => setSelectedScenario(sc.id)}
                className={`relative flex items-center gap-1.5 rounded-full px-3 py-1.5 font-mono text-xs font-semibold transition-all duration-200 cursor-pointer ${
                  selectedScenario === sc.id
                    ? "bg-brand/15 text-primary border border-brand/40 shadow-xs"
                    : "text-muted-foreground hover:bg-surface-muted/60 hover:text-foreground border border-transparent"
                }`}
              >
                <span>{sc.label}</span>
                {selectedScenario === sc.id && (
                  <span className="size-1.5 rounded-full bg-brand animate-pulse shrink-0" />
                )}
              </button>
            ))}
          </div>

          {/* Interactive LaunchPad Spark Trigger Button */}
          <button
            type="button"
            onClick={triggerCelebration}
            className="flex items-center gap-1.5 rounded-full border border-brand/40 bg-brand/10 px-3 py-1.5 text-xs font-bold text-primary transition-all duration-200 hover:border-brand/80 hover:bg-brand/20 hover:scale-105 active:scale-95 shadow-xs shrink-0 cursor-pointer"
            aria-label="Simulate celebratory FIRE fireworks"
            title="Click to simulate FIRE celebration!"
          >
            <Spark className={`size-3.5 text-brand transition-transform ${isCelebrating ? "rotate-45 scale-125" : ""}`} />
            <span className="hidden sm:inline">Simulate FIRE ✨</span>
            <span className="sm:hidden">FI ✨</span>
          </button>
        </div>

        {/* Hero Preview Header Details */}
        <div className="mt-4 flex flex-wrap items-baseline justify-between gap-2">
          <div>
            <div className="flex items-center gap-2">
              <span className="font-mono text-[0.68rem] uppercase tracking-wider text-muted-foreground">
                Target FIRE Pot ({details.currencySymbol})
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[0.62rem] font-bold ${
                  sustainable
                    ? "bg-success/15 text-success border border-success/30"
                    : "bg-danger/15 text-danger border border-danger/30"
                }`}
              >
                <span className={`size-1.5 rounded-full ${sustainable ? "bg-success" : "bg-danger"}`} />
                {sustainable ? "98% Monte Carlo Confidence" : "Shortfall Risk"}
              </span>
            </div>
            <p className="mt-1 font-display text-3xl font-extrabold tabular tracking-tight text-foreground sm:text-4xl">
              {formatCurrency(fireNumber, details.currency)}
            </p>
          </div>

          <div className="text-right">
            <span className="font-mono text-[0.65rem] uppercase tracking-wider text-muted-foreground">
              Target Age
            </span>
            <p className="font-display text-xl font-bold text-foreground">
              Retire @ {sampleInputs.retirementAge}
            </p>
          </div>
        </div>

        {/* Interactive Scrubbing Tooltip & Details Banner */}
        <div className="mt-4 rounded-xl border border-border/80 bg-surface-muted/60 p-3 backdrop-blur-xs transition-all duration-200">
          <div className="flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2">
              <span className="rounded-md bg-brand/15 px-2 py-0.5 font-mono font-bold text-primary">
                Age {activeYearData?.age ?? sampleInputs.retirementAge}
              </span>
              <span className="font-medium text-foreground">
                Net Worth: <strong className="font-bold tabular text-primary">{formatCurrency(activeValue, details.currency)}</strong>
              </span>
            </div>
            <span className="font-mono text-[0.68rem] text-muted-foreground hidden sm:inline">
              {activeYearData?.age < sampleInputs.retirementAge
                ? "Accumulation Phase"
                : activeYearData?.age < pensionUnlockAge
                ? `Bridge Phase (${primaryAccountLabel})`
                : `${pensionAccountLabel} Unlocked`}
            </span>
          </div>

          <div className="mt-2 grid grid-cols-2 gap-2 text-[0.7rem] font-mono text-muted-foreground">
            <div className="flex items-center justify-between border-r border-border/60 pr-2">
              <span>{isUk ? "ISA / Taxable:" : "Roth / Brokerage:"}</span>
              <span className="font-bold text-foreground tabular">
                {formatCurrency(
                  (activeYearData?.isaBalanceEnd ?? 0) + (activeYearData?.giaBalanceEnd ?? 0),
                  details.currency
                )}
              </span>
            </div>
            <div className="flex items-center justify-between pl-2">
              <span>{isUk ? "SIPP Pension:" : "401(k) / IRA:"}</span>
              <span className="font-bold text-foreground tabular">
                {formatCurrency(activeYearData?.sippBalanceEnd ?? 0, details.currency)}
              </span>
            </div>
          </div>
        </div>

        {/* Interactive SVG Sparkline Chart Canvas */}
        <div className="relative mt-4">
          {/* Subtle instruction helper on hover */}
          <div className="absolute right-1 top-0 z-10 font-mono text-[0.62rem] text-muted-foreground/80 pointer-events-none flex items-center gap-1">
            <Clock className="size-3 text-brand" />
            <span>Hover to inspect timeline</span>
          </div>

          <svg
            ref={svgRef}
            viewBox={`0 0 ${chartWidth} ${chartHeight}`}
            className="w-full overflow-visible cursor-crosshair touch-none select-none"
            preserveAspectRatio="none"
            onPointerMove={handlePointerMove}
            onPointerLeave={handlePointerLeave}
            role="img"
            aria-label={`Interactive FIRE curve projection over time showing target FIRE at age ${sampleInputs.retirementAge}`}
          >
            <defs>
              <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="var(--brand)" stopOpacity={0.35} />
                <stop offset="60%" stopColor="var(--accent)" stopOpacity={0.12} />
                <stop offset="100%" stopColor="var(--brand)" stopOpacity={0} />
              </linearGradient>
            </defs>

            {/* Baseline grid line */}
            <line
              x1={0}
              y1={chartHeight - 8}
              x2={chartWidth}
              y2={chartHeight - 8}
              stroke="var(--border)"
              strokeWidth={1}
              strokeDasharray="4 4"
            />

            {/* Retirement Age Threshold Vertical Marker Line */}
            <line
              x1={retirementPoint.x}
              y1={8}
              x2={retirementPoint.x}
              y2={chartHeight - 8}
              stroke="var(--brand)"
              strokeWidth={1.5}
              strokeDasharray="3 3"
              opacity={0.7}
            />

            {/* Area Fill */}
            <path d={area} fill={`url(#${gradientId})`} />

            {/* Line Path */}
            <path
              d={line}
              fill="none"
              stroke="var(--primary)"
              strokeWidth={2.75}
              strokeLinecap="round"
              strokeLinejoin="round"
            />

            {/* Retirement Age Milestone Dot */}
            <g>
              <circle
                cx={retirementPoint.x}
                cy={retirementPoint.y}
                r={isCelebrating ? 14 : 7}
                fill="var(--brand)"
                opacity={isCelebrating ? 0.7 : 0.3}
                className="transition-all duration-300"
              />
              <circle
                cx={retirementPoint.x}
                cy={retirementPoint.y}
                r={isCelebrating ? 6 : 3.5}
                fill="var(--primary)"
                className="transition-all duration-300"
              />
            </g>

            {/* Hover Crosshair & Node Marker */}
            {hoveredIdx !== null && activePoint && (
              <g className="transition-opacity duration-150">
                <line
                  x1={activePoint.x}
                  y1={8}
                  x2={activePoint.x}
                  y2={chartHeight - 8}
                  stroke="var(--accent)"
                  strokeWidth={1.5}
                  opacity={0.8}
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r={8}
                  fill="var(--accent)"
                  opacity={0.4}
                />
                <circle
                  cx={activePoint.x}
                  cy={activePoint.y}
                  r={4}
                  fill="#ffffff"
                />
              </g>
            )}
          </svg>

          {/* Chart X-Axis Labels */}
          <div className="flex justify-between font-mono text-[0.62rem] text-muted-foreground mt-1 px-1">
            <span>Age {sampleInputs.currentAge} (Now)</span>
            <span className="font-bold text-brand">FIRE @ Age {sampleInputs.retirementAge}</span>
            <span>Age {plan.inputs.lifeExpectancyAge}</span>
          </div>
        </div>

        {/* Key Feature Metric Cards */}
        <div className="mt-5 grid grid-cols-3 gap-2 sm:gap-3">
          <div className="rounded-xl border border-border/80 bg-surface-muted/50 p-2.5 sm:p-3">
            <span className="block font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">
              Bridge Years
            </span>
            <p className="mt-0.5 font-display text-xs font-extrabold text-foreground sm:text-sm">
              {sampleInputs.retirementAge} → {isUk ? "57" : "59½"}
            </p>
            <span className="block font-mono text-[0.58rem] text-muted-foreground mt-0.5 truncate">
              {primaryAccountLabel}
            </span>
          </div>

          <div className="rounded-xl border border-border/80 bg-surface-muted/50 p-2.5 sm:p-3">
            <span className="block font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">
              {isUk ? "SIPP Unlocks" : "401(k) Unlocks"}
            </span>
            <p className="mt-0.5 font-display text-xs font-extrabold text-foreground sm:text-sm">
              {pensionUnlockDisplay}
            </p>
            <span className="block font-mono text-[0.58rem] text-success mt-0.5 truncate">
              {isUk ? "25% Tax-Free" : "Penalty-Free"}
            </span>
          </div>

          <div className="rounded-xl border border-border/80 bg-surface-muted/50 p-2.5 sm:p-3">
            <span className="block font-mono text-[0.58rem] uppercase tracking-wider text-muted-foreground">
              {isUk ? "State Pension" : "Social Security"}
            </span>
            <p className="mt-0.5 font-display text-xs font-extrabold text-foreground sm:text-sm">
              Age 67
            </p>
            <span className="block font-mono text-[0.58rem] text-accent mt-0.5 truncate">
              Guaranteed Floor
            </span>
          </div>
        </div>

        {/* Celebratory Celebration Banner when active */}
        {isCelebrating && (
          <div className="mt-4 flex items-center justify-between rounded-xl border border-brand/50 bg-brand/10 p-3 animate-fade-in">
            <div className="flex items-center gap-2">
              <Spark className="size-4 text-brand animate-spin" />
              <span className="font-display text-xs font-bold text-foreground">
                🎉 FI Reached at Age {sampleInputs.retirementAge}! Plan holds across {isUk ? "ISA, SIPP & State Pension" : "Roth, 401(k) & Social Security"}.
              </span>
            </div>
            <span className="rounded-full bg-success/20 px-2 py-0.5 font-mono text-[0.62rem] font-extrabold text-success">
              100% On Track
            </span>
          </div>
        )}

      </div>
    </div>
  );
}
