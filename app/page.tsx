import { FireDashboard } from "@/components/FireDashboard";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-10 max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted-foreground">
          <span className="size-1.5 rounded-full bg-brand" />
          UK-specific tax modelling
        </span>
        <h1 className="mt-4 font-display text-4xl font-extrabold leading-[1.02] tracking-tight text-balance sm:text-[3.25rem]">
          Plan your UK{" "}
          <span className="relative whitespace-nowrap text-primary">
            FIRE
            <span className="absolute -bottom-1 left-0 h-[3px] w-full rounded-full bg-brand/70" />
          </span>{" "}
          journey.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          Model how your ISA, GIA and SIPP carry you from early retirement
          through to State Pension age — and see exactly when you cross from
          bridge funding to pension drawdown.
        </p>
        <p className="mt-5 flex items-start gap-2 rounded-lg border border-border bg-surface-muted px-3 py-2 text-xs leading-relaxed text-muted-foreground">
          <span aria-hidden>ⓘ</span>
          <span>
            OnFIRE is an{" "}
            <span className="font-medium text-foreground">
              educational tool for learning and exploring
            </span>{" "}
            UK FIRE scenarios. It is not financial advice — figures are
            estimates based on simplified assumptions. Always consult a
            qualified adviser before making decisions.
          </span>
        </p>
      </div>

      <FireDashboard />
    </div>
  );
}
