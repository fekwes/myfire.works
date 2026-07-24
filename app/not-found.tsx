import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto flex w-full max-w-lg flex-1 flex-col items-center justify-center px-4 py-24 text-center">
      <span className="font-mono text-[0.7rem] uppercase tracking-[0.14em] text-muted-foreground">
        404 — page not found
      </span>
      <h1 className="mt-4 font-display text-3xl font-bold tracking-tight sm:text-4xl">
        This page went up in smoke.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-muted-foreground">
        The page you&apos;re after doesn&apos;t exist. Let&apos;s get you back
        to planning.
      </p>
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link
          href="/"
          className="rounded-full bg-foreground px-5 py-2.5 text-sm font-semibold text-background transition-opacity hover:opacity-90"
        >
          Back home
        </Link>
        <Link
          href="/planner"
          className="rounded-full border border-border bg-surface px-5 py-2.5 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
        >
          Open the planner
        </Link>
      </div>
    </div>
  );
}
