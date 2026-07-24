"use client";

import { useEffect } from "react";
import { Button, buttonClasses } from "@/components/ui";

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
        <Button type="button" onClick={reset}>
          Try again
        </Button>
        {/* Hard link so the error boundary fully resets on navigation. */}
        <a href="/planner" className={buttonClasses("secondary")}>
          Back to the planner
        </a>
      </div>
    </div>
  );
}
