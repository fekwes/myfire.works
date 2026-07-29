import type {
  FireInputs,
  FireSimulationResult,
  YearSnapshot,
} from "./fire-engine";
import type { PackLabels } from "./countries/types";

/** Build the CSV column definitions, using region-appropriate labels. */
function csvColumns(labels?: PackLabels) {
  const isa = labels?.taxFreeWrapper ?? "ISA";
  const gia = labels?.taxableWrapper ?? "GIA";
  const sipp = labels?.taxDeferredWrapper ?? "SIPP";
  const sp = labels?.statePension ?? "State pension";

  return [
    { header: "Age", value: (y: YearSnapshot) => y.age },
    { header: "Phase", value: (y: YearSnapshot) => y.phase },
    { header: isa, value: (y: YearSnapshot) => Math.round(y.pots?.isa?.end ?? y.pots?.[Object.keys(y.pots)[0]]?.end ?? 0) },
    { header: gia, value: (y: YearSnapshot) => Math.round(y.pots?.gia?.end ?? y.pots?.[Object.keys(y.pots)[1]]?.end ?? 0) },
    { header: sipp, value: (y: YearSnapshot) => Math.round(y.pots?.sipp?.end ?? y.pots?.[Object.keys(y.pots)[2]]?.end ?? 0) },
    { header: "Rental value", value: (y: YearSnapshot) => Math.round(y.rentalValueEnd) },
    { header: "Home value", value: (y: YearSnapshot) => Math.round(y.homeValueEnd) },
    { header: `${isa} withdrawal`, value: (y: YearSnapshot) => Math.round(y.potWithdrawals?.isa?.gross ?? y.potWithdrawals?.[Object.keys(y.potWithdrawals)[0]]?.gross ?? 0) },
    { header: `${gia} withdrawal`, value: (y: YearSnapshot) => Math.round(y.potWithdrawals?.gia?.gross ?? y.potWithdrawals?.[Object.keys(y.potWithdrawals)[1]]?.gross ?? 0) },
    { header: `${sipp} gross`, value: (y: YearSnapshot) => Math.round(y.potWithdrawals?.sipp?.gross ?? y.potWithdrawals?.[Object.keys(y.potWithdrawals)[2]]?.gross ?? 0) },
    { header: "Tax-free pension", value: (y: YearSnapshot) => Math.round(y.potWithdrawals?.sipp?.taxFree ?? y.potWithdrawals?.[Object.keys(y.potWithdrawals)[2]]?.taxFree ?? 0) },
    { header: sp, value: (y: YearSnapshot) => Math.round(y.statePensionIncome) },
    { header: "Rental income", value: (y: YearSnapshot) => Math.round(y.rentalIncome) },
    { header: "Part-time income", value: (y: YearSnapshot) => Math.round(y.partTimeIncome) },
    { header: "Income tax", value: (y: YearSnapshot) => Math.round(y.incomeTaxPaid) },
    { header: "Capital gains tax", value: (y: YearSnapshot) => Math.round(y.capitalGainsTaxPaid) },
    { header: "Net income", value: (y: YearSnapshot) => Math.round(y.netIncome) },
    { header: "Shortfall", value: (y: YearSnapshot) => (y.shortfall ? "yes" : "no") },
  ] as const;
}

/** Number of columns in the CSV export (handy for tests). */
export const CSV_COLUMN_COUNT = csvColumns().length;

/**
 * A year-by-year CSV of the simulated plan.
 * Safe across all country packs (UK, US, ES) with optional chaining on pot keys.
 */
export function planTimelineCsv(result: FireSimulationResult, labels?: PackLabels): string {
  const cols = csvColumns(labels);
  const header = cols.map((c) => c.header).join(",");
  const rows = result.timeline.map((y) =>
    cols.map((c) => c.value(y)).join(","),
  );
  return [header, ...rows].join("\n");
}

/** Pretty-printed JSON of the plan's inputs (re-importable / shareable). */
export function planInputsJson(inputs: FireInputs): string {
  return JSON.stringify(inputs, null, 2);
}
