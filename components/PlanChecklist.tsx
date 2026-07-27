"use client";

import { ArrowRight, Check, ChevronDown, ListChecks, X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";
import { useAuth } from "@/components/AuthProvider";
import { usePlan } from "@/components/PlanProvider";
import { ButtonLink } from "@/components/ui";
import {
  buildChecklist,
  checklistProgress,
  nextChecklistStep,
} from "@/lib/checklist";

const DISMISS_KEY = "onfire:checklist-dismissed";

export function PlanChecklist() {
  const { inputs } = usePlan();
  const { user, configured } = useAuth();
  const [expanded, setExpanded] = useState(false);
  const [hydration, setHydration] = useState<{
    ready: boolean;
    dismissed: boolean;
  }>({
    ready: false,
    dismissed: false,
  });

  useEffect(() => {
    let dismissed = false;
    try {
      // 4.6 Move dismissal to sessionStorage
      dismissed = sessionStorage.getItem(DISMISS_KEY) === "1";
    } catch {
      // no-op
    }
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setHydration({ ready: true, dismissed });
  }, []);

  const steps = buildChecklist(inputs, !!user, configured);
  const { done, total, complete } = checklistProgress(steps);
  const next = nextChecklistStep(steps);

  if (!hydration.ready) return null;
  // 4.5 return null once every step is done
  if (complete) return null;

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // no-op
    }
    setHydration((h) => ({ ...h, dismissed: true }));
  };
  
  const show = () => {
    try {
      sessionStorage.removeItem(DISMISS_KEY);
    } catch {
      // no-op
    }
    setHydration((h) => ({ ...h, dismissed: false }));
  };

  if (hydration.dismissed) {
    return (
      <div className="no-print mb-4 flex justify-end">
        <button
          onClick={show}
          className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground transition-colors hover:text-foreground"
        >
          <ListChecks className="size-3.5" />
          Show setup guide ({total - done} left)
        </button>
      </div>
    );
  }

  const pct = Math.round((done / total) * 100);

  return (
    <aside
      aria-label="Setup guide"
      className="no-print rounded-2xl border border-accent/40 bg-accent/[0.06] p-5 sm:p-6 mb-4"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="flex items-center gap-1.5 font-mono text-[0.7rem] font-medium uppercase tracking-[0.14em] text-muted-foreground">
            <ListChecks aria-hidden className="size-3.5 shrink-0 text-accent" />
            Setup guide
          </h3>
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <span className="font-semibold text-foreground tabular">
              {done}/{total}
            </span>{" "}
            done — one small step at a time.
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

      {next && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-surface p-4">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-foreground">{next.label}</p>
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
              {next.hint}
            </p>
          </div>
          {next.href && (
            <ButtonLink href={next.href} size="sm" className="shrink-0">
              {next.cta}
              <ArrowRight aria-hidden className="size-3.5" />
            </ButtonLink>
          )}
        </div>
      )}

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
    </aside>
  );
}
