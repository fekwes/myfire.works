import type { Metadata } from "next";
import { FinancesPanel } from "@/components/FinancesPanel";

export const metadata: Metadata = {
  title: "Your finances",
  description:
    "Edit everything behind your OnFIRE plan: ISA, SIPP and GIA balances, contributions, property, growth, inflation and the statutory scenario.",
};

export default function FinancesPage() {
  return (
    <div className="mx-auto w-full max-w-4xl flex-1 px-4 py-6 sm:px-6 sm:py-8">
      <FinancesPanel />
    </div>
  );
}
