import { FireDashboard } from "@/components/FireDashboard";

export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-10 max-w-2xl">
        <span className="inline-flex items-center gap-2 rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-muted-foreground">
          <span className="size-1.5 rounded-full bg-brand" />
          UK-specific tax modelling
        </span>
        <h1 className="mt-4 font-display text-4xl font-bold leading-[1.05] tracking-tight text-balance sm:text-5xl">
          Plan your UK <span className="text-primary">FIRE</span> journey.
        </h1>
        <p className="mt-4 text-base leading-relaxed text-muted-foreground sm:text-lg">
          Model how your ISA, GIA and SIPP carry you from early retirement
          through to State Pension age — and see exactly when you cross from
          bridge funding to pension drawdown.
        </p>
      </div>

      <FireDashboard />
    </div>
  );
}
