import type { Metadata } from "next";
import { FireDashboard } from "@/components/FireDashboard";

export const metadata: Metadata = {
  title: "Planner",
  description:
    "The full Fireworks planner: model your FIRE number, drawdown across ISA, GIA, SIPP and State Pension, Coast FIRE and Monte Carlo confidence.",
  alternates: { canonical: "/planner" },
};

export default async function PlannerPage({
  searchParams,
}: {
  searchParams: Promise<{ p?: string }>;
}) {
  const { p } = await searchParams;
  return (
    <div className="mx-auto w-full max-w-6xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <FireDashboard sharedParam={p} />
    </div>
  );
}
