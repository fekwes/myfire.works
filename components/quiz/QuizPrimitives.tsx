"use client";

import { useEffect, useState } from "react";
import type { ReactNode } from "react";

/** Lime progress bar for the input steps (1–5). */
export function ProgressBar({ step, total }: { step: number; total: number }) {
  const pct = Math.round((step / total) * 100);
  return (
    <div className="w-full">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[0.65rem] uppercase tracking-[0.14em] text-muted-foreground">
          Step {step} of {total}
        </span>
        <span className="font-mono text-[0.65rem] text-muted-foreground">
          {pct}%
        </span>
      </div>
      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={step}
          aria-valuemin={1}
          aria-valuemax={total}
        />
      </div>
    </div>
  );
}

/** Pill toggle used for lifestyle presets and Yes/Skip choices. */
export function Chip({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`rounded-full border px-4 py-2 text-sm font-semibold transition-colors ${
        selected
          ? "border-primary bg-primary text-primary-foreground"
          : "border-border bg-surface-muted text-muted-foreground hover:border-muted-foreground/40 hover:text-foreground"
      }`}
    >
      {children}
    </button>
  );
}

/**
 * Number input styled to match the planner's `NumberInput`, sized a little
 * larger for the one-question-per-screen quiz.
 */
export function QuizNumberInput({
  value,
  onChange,
  prefix,
  suffix,
  min = 0,
  step = 1,
  autoFocus = false,
}: {
  value: number;
  onChange: (value: number) => void;
  prefix?: string;
  suffix?: string;
  min?: number;
  step?: number;
  autoFocus?: boolean;
}) {
  return (
    <div className="flex items-center rounded-xl border border-border bg-background transition-colors hover:border-muted-foreground/40 focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/30">
      {prefix && (
        <span className="pl-4 text-base text-muted-foreground">{prefix}</span>
      )}
      <input
        type="number"
        inputMode="decimal"
        // biome-ignore lint/a11y/noAutofocus: intentional for a one-field-per-screen quiz
        autoFocus={autoFocus}
        value={Number.isNaN(value) ? "" : value}
        min={Number.isFinite(min) ? min : undefined}
        step={step}
        onFocus={(e) => e.target.select()}
        onChange={(e) => onChange(e.target.valueAsNumber)}
        className="tabular w-full min-w-0 bg-transparent px-4 py-3 text-lg outline-none [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      {suffix && (
        <span className="pr-4 text-base whitespace-nowrap text-muted-foreground">
          {suffix}
        </span>
      )}
    </div>
  );
}

/** A labelled field wrapper for the quiz steps. */
export function QuizField({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: ReactNode;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-medium text-foreground">
        {label}
      </span>
      {children}
      {hint && (
        <span className="mt-1.5 block text-xs text-muted-foreground">
          {hint}
        </span>
      )}
    </label>
  );
}

/**
 * Shared chrome for an input step: big question heading, one helper line, the
 * step body, and Back / Continue controls. `key`-ing the outer element on the
 * step index (done by the caller) replays the mount animation.
 */
export function StepShell({
  heading,
  helper,
  children,
  onBack,
  onContinue,
  continueLabel = "Continue",
  continueIcon,
  canContinue = true,
}: {
  heading: string;
  helper?: string;
  children: ReactNode;
  onBack?: () => void;
  onContinue: () => void;
  continueLabel?: string;
  continueIcon?: ReactNode;
  canContinue?: boolean;
}) {
  return (
    <div className="quiz-step">
      <h1 className="font-display text-2xl font-bold tracking-tight text-balance sm:text-3xl">
        {heading}
      </h1>
      {helper && (
        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
          {helper}
        </p>
      )}
      <div className="mt-6 space-y-5">{children}</div>
      <div className="mt-8 flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={onContinue}
          disabled={!canContinue}
          className="flex flex-1 items-center justify-center gap-2 rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90 disabled:opacity-40"
        >
          {continueLabel}
          {continueIcon}
        </button>
      </div>
    </div>
  );
}

/**
 * Count up to `target` over `durationMs`, respecting prefers-reduced-motion
 * (which jumps straight to the final value). Returns the current value.
 */
export function useCountUp(target: number, durationMs = 900): number {
  const [value, setValue] = useState(0);

  useEffect(() => {
    const reduce =
      typeof window !== "undefined" &&
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    // Reduced motion collapses to a single frame that lands on the target.
    const duration = reduce ? 0 : durationMs;
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = duration <= 0 ? 1 : Math.min(1, (now - start) / duration);
      const eased = 1 - (1 - t) ** 3; // easeOutCubic
      setValue(Math.round(target * eased));
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, durationMs]);

  return value;
}

/**
 * Compact, dependency-free asset sparkline for the reveal step: total pot
 * value (ISA + GIA + SIPP) across the plan, with a soft lime area fill.
 */
export function MiniAssetChart({
  points,
  className,
}: {
  points: number[];
  className?: string;
}) {
  const width = 320;
  const height = 72;
  if (points.length < 2) return null;
  const max = Math.max(...points, 1);
  const stepX = width / (points.length - 1);
  const y = (v: number) => height - (v / max) * (height - 6) - 3;
  const line = points
    .map((v, i) => `${i === 0 ? "M" : "L"}${(i * stepX).toFixed(1)},${y(v).toFixed(1)}`)
    .join(" ");
  const area = `${line} L${width},${height} L0,${height} Z`;
  return (
    <svg
      viewBox={`0 0 ${width} ${height}`}
      className={`w-full ${className ?? ""}`}
      preserveAspectRatio="none"
      role="img"
      aria-label="Projected total assets over time"
    >
      <path d={area} fill="var(--brand)" opacity={0.14} />
      <path
        d={line}
        fill="none"
        stroke="var(--primary)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
