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
    { header: isa, value: (y: YearSnapshot) => Math.round(y.pots.isa.end) },
    { header: gia, value: (y: YearSnapshot) => Math.round(y.pots.gia.end) },
    { header: sipp, value: (y: YearSnapshot) => Math.round(y.pots.sipp.end) },
    { header: "Rental value", value: (y: YearSnapshot) => Math.round(y.rentalValueEnd) },
    { header: "Home value", value: (y: YearSnapshot) => Math.round(y.homeValueEnd) },
    { header: `${isa} withdrawal`, value: (y: YearSnapshot) => Math.round(y.potWithdrawals.isa.gross) },
    { header: `${gia} withdrawal`, value: (y: YearSnapshot) => Math.round(y.potWithdrawals.gia.gross) },
    { header: `${sipp} gross`, value: (y: YearSnapshot) => Math.round(y.potWithdrawals.sipp.gross) },
    { header: "Tax-free pension", value: (y: YearSnapshot) => Math.round(y.potWithdrawals.sipp.taxFree) },
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
 * A year-by-year CSV of the simulated plan. All values are integers; the phase
 * and shortfall columns are plain words — none contain commas, so no quoting is
 * needed.
 *
 * Pass `labels` to use region-appropriate column headers (e.g. "Roth IRA" instead of "ISA").
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
