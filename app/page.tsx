import { FireDashboard } from "@/components/FireDashboard";

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

      <FireDashboard />
    </div>
  );
}
