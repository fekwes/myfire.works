"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Surface the error for debugging; in production this feeds your logs.
    console.error(error);
  }, [error]);

  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-danger">
        Something went wrong
      </span>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        That didn&apos;t go to plan.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        An unexpected error occurred. Your saved plans are safe — try again.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          Try again
        </button>
        <a
          href="/planner"
          className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Back to the planner
        </a>
      </div>
    </div>
  );
}
