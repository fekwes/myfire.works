"use client";

import { ArrowRight, Check, ChevronDown, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { usePlan } from "@/components/PlanProvider";
import { Card } from "@/components/ui";
import {
  buildChecklist,
  type ChecklistFlags,
  checklistProgress,
  nextChecklistStep,
  readChecklistFlags,
} from "@/lib/checklist";

const DISMISS_KEY = "onfire:checklist-dismissed";

/**
 * Progressive "Complete your plan" card. Reveals the single next step with its
 * CTA (plus an optional full view), auto-ticking as the underlying data lands —
 * so onboarding feels like momentum rather than a wall of tasks.
 */
export function PlanChecklist() {
  const { inputs } = usePlan();
  const { user } = useAuth();
  const [expanded, setExpanded] = useState(false);
  // Start hidden until we've read localStorage, to avoid a flash then dismiss.
  const [hydration, setHydration] = useState<{
    ready: boolean;
    dismissed: boolean;
    flags: ChecklistFlags;
  }>({
    ready: false,
    dismissed: false,
    flags: { ranConfidence: false, viewedWithdrawals: false },
  });

  useEffect(() => {
    const readAll = () => {
      let dismissed = false;
      try {
        dismissed = localStorage.getItem(DISMISS_KEY) === "1";
      } catch {
        // no-op
      }
      setHydration({ ready: true, dismissed, flags: readChecklistFlags() });
    };
    readAll();
    const syncFlags = () =>
      setHydration((h) => ({ ...h, flags: readChecklistFlags() }));
    window.addEventListener("onfire:flags", syncFlags);
    window.addEventListener("storage", syncFlags);
    return () => {
      window.removeEventListener("onfire:flags", syncFlags);
      window.removeEventListener("storage", syncFlags);
    };
  }, []);

  const steps = buildChecklist(inputs, hydration.flags, !!user);
  const { done, total, complete } = checklistProgress(steps);
  const next = nextChecklistStep(steps);

  if (!hydration.ready || hydration.dismissed) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // no-op
    }
    setHydration((h) => ({ ...h, dismissed: true }));
  };

  const pct = Math.round((done / total) * 100);

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            {complete ? "Your plan is all set" : "Complete your plan"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {complete ? (
              <>Nice — you&apos;ve set up every part of your plan. 🎉</>
            ) : (
              <>
                <span className="font-semibold text-foreground tabular">
                  {done}/{total}
                </span>{" "}
                done — one small step at a time.
              </>
            )}
          </p>
        </div>
        <button
          type="button"
          onClick={dismiss}
          aria-label="Dismiss checklist"
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
        >
          <X className="size-4" />
        </button>
      </div>

      <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-surface-muted">
        <div
          className="h-full rounded-full bg-brand transition-[width] duration-500 ease-out"
          style={{ width: `${pct}%` }}
          role="progressbar"
          aria-valuenow={done}
          aria-valuemin={0}
          aria-valuemax={total}
        />
      </div>

      {/* The next step — the one thing to do right now. */}
      {!complete && next && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-primary/30 bg-brand/[0.06] p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{next.label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {next.hint}
            </p>
          </div>
          {next.href && (
            <Link
              href={next.href}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full bg-foreground px-4 py-2 text-xs font-semibold text-background transition-opacity hover:opacity-90"
            >
              {next.cta}
              <ArrowRight className="size-3.5" />
            </Link>
          )}
        </div>
      )}

      {/* Optional full view — kept out of the way so the card stays light. */}
      <button
        type="button"
        onClick={() => setExpanded((e) => !e)}
        aria-expanded={expanded}
        className="mt-3 flex items-center gap-1 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
      >
        {expanded ? "Hide" : "Show all steps"}
        <ChevronDown
          className={`size-3.5 transition-transform ${expanded ? "rotate-180" : ""}`}
        />
      </button>

      {expanded && (
        <ul className="mt-3 space-y-2">
          {steps.map((s) => (
            <li key={s.id} className="flex items-center gap-2.5 text-sm">
              <span
                className={`flex size-5 shrink-0 items-center justify-center rounded-full border ${
                  s.done
                    ? "border-success bg-success/15 text-success"
                    : "border-border text-transparent"
                }`}
              >
                <Check className="size-3" />
              </span>
              <span
                className={
                  s.done ? "text-muted-foreground line-through" : "text-foreground"
                }
              >
                {s.label}
              </span>
              {!s.done && s.href && (
                <Link
                  href={s.href}
                  className="ml-auto text-xs font-medium text-primary underline-offset-2 hover:underline"
                >
                  {s.cta}
                </Link>
              )}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
