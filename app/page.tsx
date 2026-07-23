import { ArrowRight } from "lucide-react";
import Link from "next/link";

const HIGHLIGHTS = [
  {
    title: "Bridge to pension",
    body: "See exactly how your ISA and GIA carry you from early retirement to the age your SIPP unlocks.",
  },
  {
    title: "Real UK tax",
    body: "2026/27 income-tax bands, the personal-allowance taper, CGT and the 25% tax-free pension — modelled, not hand-waved.",
  },
  {
    title: "Confidence, not guesses",
    body: "Monte Carlo runs stress-test your plan against market swings, so a good year isn't mistaken for a safe one.",
  },
];

export default function Landing() {
  return (
    <div className="mx-auto w-full max-w-5xl flex-1 px-4 py-14 sm:px-6 sm:py-20">
      {/* Hero */}
      <section className="max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-brand" />
          UK-specific tax modelling
        </span>
        <h1 className="mt-5 font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-balance sm:text-[3.5rem]">
          Plan your UK{" "}
          <span className="relative whitespace-nowrap text-primary">
            FIRE
            <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-brand/70" />
          </span>{" "}
          journey.
        </h1>
        <p className="mt-5 text-base leading-relaxed text-muted-foreground sm:text-lg">
          Model how your ISA, GIA and SIPP carry you from early retirement
          through to State Pension age — and see exactly when you cross from
          bridge funding to pension drawdown.
        </p>

        <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center">
          <Link
            href="/start"
            className="inline-flex items-center justify-center gap-2 rounded-full bg-foreground px-6 py-3 text-sm font-semibold text-background transition-opacity hover:opacity-90"
          >
            Build my plan
            <ArrowRight className="size-4" />
          </Link>
          <Link
            href="/planner"
            className="inline-flex items-center justify-center rounded-full border border-border bg-surface px-6 py-3 text-sm font-semibold text-muted-foreground transition-colors hover:text-foreground"
          >
            Skip to the planner
          </Link>
        </div>

        <p className="mt-4 text-xs text-muted-foreground">
          Takes about two minutes. No account needed to see your result.
        </p>
      </section>

      {/* Highlights */}
      <section className="mt-16 grid grid-cols-1 gap-4 sm:mt-20 sm:grid-cols-3">
        {HIGHLIGHTS.map((h) => (
          <div
            key={h.title}
            className="rounded-2xl border border-border bg-surface p-5"
          >
            <h2 className="font-display text-base font-bold tracking-tight">
              {h.title}
            </h2>
            <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
              {h.body}
            </p>
          </div>
        ))}
      </section>

      <p className="mt-12 flex items-start gap-2 rounded-xl border border-border bg-surface-muted px-3.5 py-2.5 text-xs leading-relaxed text-muted-foreground">
        <span aria-hidden>ⓘ</span>
        <span>
          OnFIRE is an{" "}
          <span className="font-medium text-foreground">
            educational tool for learning and exploring
          </span>{" "}
          UK FIRE scenarios. It is not financial advice — figures are estimates
          based on simplified assumptions. Always consult a qualified adviser
          before making decisions.{" "}
          <Link
            href="/methodology"
            className="underline-offset-2 hover:text-foreground hover:underline"
          >
            See the methodology
          </Link>
          .
        </span>
      </p>
    </div>
  );
}
