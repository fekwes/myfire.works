"use client";

import { X } from "lucide-react";
import Link from "next/link";
import { useEffect, useState } from "react";

const DISMISS_KEY = "onfire:planner-intro-dismissed";

/**
 * A one-time orientation banner shown when someone first lands on the planner
 * (typically straight from the quiz). It names the three things they can do, so
 * the dense dashboard doesn't feel like a wall. Dismissed state persists.
 */
export function PlannerIntro() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShow(localStorage.getItem(DISMISS_KEY) !== "1");
    } catch {
      // no-op
    }
  }, []);

  if (!show) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(DISMISS_KEY, "1");
    } catch {
      // no-op
    }
    setShow(false);
  };

  return (
    <div className="no-print flex items-start gap-3 rounded-2xl border border-primary/30 bg-brand/[0.06] p-4">
      <p className="flex-1 text-sm leading-relaxed text-muted-foreground">
        <span className="font-semibold text-foreground">
          Here&apos;s your plan.
        </span>{" "}
        Nudge the <span className="font-medium text-foreground">quick levers</span>{" "}
        below to watch it update live, add the full detail — balances, property,
        pensions — in{" "}
        <Link
          href="/finances"
          className="font-medium text-foreground underline-offset-2 hover:underline"
        >
          Your Finances
        </Link>
        , or open the{" "}
        <span className="font-medium text-foreground">Confidence</span> tab for a
        market stress-test.
      </p>
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss"
        className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-surface-muted hover:text-foreground"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
