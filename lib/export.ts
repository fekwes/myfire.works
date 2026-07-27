import type {
  FireInputs,
  FireSimulationResult,
  YearSnapshot,
} from "./fire-engine";

/** Columns for the year-by-year CSV export of a plan's timeline. */
const CSV_COLUMNS: {
  header: string;
  value: (y: YearSnapshot) => string | number;
}[] = [
  { header: "Age", value: (y) => y.age },
  { header: "Phase", value: (y) => y.phase },
  { header: "ISA", value: (y) => Math.round(y.pots.isa.end) },
  { header: "GIA", value: (y) => Math.round(y.pots.gia.end) },
  { header: "SIPP", value: (y) => Math.round(y.pots.sipp.end) },
  { header: "Rental value", value: (y) => Math.round(y.rentalValueEnd) },
  { header: "Home value", value: (y) => Math.round(y.homeValueEnd) },
  { header: "ISA withdrawal", value: (y) => Math.round(y.potWithdrawals.isa.gross) },
  { header: "GIA withdrawal", value: (y) => Math.round(y.potWithdrawals.gia.gross) },
  { header: "SIPP gross", value: (y) => Math.round(y.potWithdrawals.sipp.gross) },
  { header: "Tax-free pension", value: (y) => Math.round(y.potWithdrawals.sipp.taxFree) },
  { header: "State pension", value: (y) => Math.round(y.statePensionIncome) },
  { header: "Rental income", value: (y) => Math.round(y.rentalIncome) },
  { header: "Part-time income", value: (y) => Math.round(y.partTimeIncome) },
  { header: "Income tax", value: (y) => Math.round(y.incomeTaxPaid) },
  { header: "Capital gains tax", value: (y) => Math.round(y.capitalGainsTaxPaid) },
  { header: "Net income", value: (y) => Math.round(y.netIncome) },
  { header: "Shortfall", value: (y) => (y.shortfall ? "yes" : "no") },
];

/** Number of columns in the CSV export (handy for tests). */
export const CSV_COLUMN_COUNT = CSV_COLUMNS.length;

/**
 * A year-by-year CSV of the simulated plan. All values are integers; the phase
 * and shortfall columns are plain words — none contain commas, so no quoting is
 * needed.
 */
export function planTimelineCsv(result: FireSimulationResult): string {
  const header = CSV_COLUMNS.map((c) => c.header).join(",");
  const rows = result.timeline.map((y) =>
    CSV_COLUMNS.map((c) => c.value(y)).join(","),
  );
  return [header, ...rows].join("\n");
}

/** Pretty-printed JSON of the plan's inputs (re-importable / shareable). */
export function planInputsJson(inputs: FireInputs): string {
  return JSON.stringify(inputs, null, 2);
}
