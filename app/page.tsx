export default function Home() {
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-10 sm:px-6 sm:py-14">
      <div className="mb-10 max-w-2xl">
        <h1 className="text-3xl font-semibold tracking-tight sm:text-4xl">
          Plan your UK FIRE journey
        </h1>
        <p className="mt-3 text-base leading-relaxed text-muted-foreground">
          Model how your ISA, GIA and SIPP carry you from early retirement
          through to State Pension age, and see exactly when you cross from
          bridge funding to pension drawdown.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-5">
        <section className="rounded-2xl border border-border bg-surface p-6 lg:col-span-2">
          <h2 className="text-sm font-medium text-muted-foreground">
            Your details
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Input form coming next.
          </p>
        </section>

        <section className="rounded-2xl border border-border bg-surface p-6 lg:col-span-3">
          <h2 className="text-sm font-medium text-muted-foreground">
            Projection
          </h2>
          <p className="mt-4 text-sm text-muted-foreground">
            Dashboard and chart coming next.
          </p>
        </section>
      </div>
    </div>
  );
}
