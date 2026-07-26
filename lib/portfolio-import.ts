import { ASSET_CLASSES, type AssetClass, isAssetClass } from "./assets";

/**
 * Turning a model's answer into holdings the engine will accept.
 *
 * This is deliberately a pure module, separate from the route that calls
 * Gemini, because the interesting failures have nothing to do with the network:
 * a model that invents an asset class, returns a fee of 40%, emits weights that
 * sum to 7, hallucinates a fund that wasn't in the input, or replies with prose
 * instead of JSON. Those are all testable without an API key, and they're what
 * actually decides whether an import is safe to apply.
 *
 * The rule the whole feature rests on: the model classifies, it never values.
 * `assetClass` picks a row out of `ASSET_CLASS_RETURN`, and that is where the
 * expected return comes from — so no model output can move the projection off
 * the deterministic, reproducible-from-the-URL path.
 */

/** The classes a model may choose from. Re-exported so the prompt and the
 * validator can't drift apart. */
export { ASSET_CLASSES };

export interface EstimatedHolding {
  label: string;
  assetClass: AssetClass;
  /** Ongoing charge as a decimal fraction (0.0022 = 0.22%). */
  ocf: number;
  /** Share of the imported portfolio, normalised so the set sums to 1. */
  weight: number;
}

/** Fee sanity bounds. Above 3%/yr is not a tracker, it's a misread number. */
const MAX_OCF = 0.03;
/** Used when a model gives no usable fee — roughly a UK index fund. */
const DEFAULT_OCF = 0.002;
/** More rows than any real statement; keeps one bad paste from ballooning. */
const MAX_HOLDINGS = 40;
const MAX_LABEL = 80;

/**
 * Validate and normalise a model's `holdings` array.
 *
 * Every field is treated as hostile: unknown classes drop the row, a
 * non-finite or out-of-range fee falls back to a default rather than
 * poisoning the growth calculation, and weights are renormalised to sum to 1
 * so a model that emits percentages, pound amounts or nothing at all still
 * produces a coherent portfolio.
 */
export function parseEstimatedHoldings(value: unknown): EstimatedHolding[] {
  if (!Array.isArray(value)) return [];

  const rows: EstimatedHolding[] = [];
  for (const item of value) {
    if (rows.length >= MAX_HOLDINGS) break;
    if (typeof item !== "object" || item === null) continue;
    const r = item as Record<string, unknown>;

    // An unrecognised class is the one thing that can't be salvaged: there is
    // no return to look up, and guessing one would be the model setting
    // returns by the back door.
    if (!isAssetClass(r.assetClass)) continue;

    rows.push({
      label:
        typeof r.label === "string" && r.label.trim() !== ""
          ? r.label.trim().slice(0, MAX_LABEL)
          : "Holding",
      assetClass: r.assetClass,
      ocf:
        typeof r.ocf === "number" && Number.isFinite(r.ocf) && r.ocf >= 0
          ? Math.min(MAX_OCF, r.ocf)
          : DEFAULT_OCF,
      weight:
        typeof r.weight === "number" && Number.isFinite(r.weight) && r.weight > 0
          ? r.weight
          : 0,
    });
  }

  return normaliseWeights(rows);
}

/**
 * Rescale weights to sum to 1, falling back to equal weights when none are
 * usable. The engine normalises again downstream, but doing it here means the
 * figures shown in the review step are the figures that get applied.
 */
function normaliseWeights(rows: EstimatedHolding[]): EstimatedHolding[] {
  if (rows.length === 0) return rows;
  const total = rows.reduce((sum, r) => sum + r.weight, 0);
  if (total <= 0) {
    const equal = 1 / rows.length;
    return rows.map((r) => ({ ...r, weight: equal }));
  }
  return rows.map((r) => ({ ...r, weight: r.weight / total }));
}

/**
 * Read the `holdings` array out of a model's raw JSON reply.
 *
 * Returns `[]` for anything unparseable — prose instead of JSON, a truncated
 * response, a top-level array, `null`. The caller turns that into a "couldn't
 * read that" message; it must never throw into the request handler.
 */
export function parseHoldingsResponse(raw: string | null | undefined): EstimatedHolding[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return [];
    return parseEstimatedHoldings((parsed as { holdings?: unknown }).holdings);
  } catch {
    return [];
  }
}

/**
 * Validate the client's request body.
 *
 * Separate from the handler so the size and shape rules are testable, and so
 * the paid call is never reached by a body that was never going to work.
 */
export const MAX_IMPORT_CHARS = 10_000;

export function parseImportRequest(
  raw: string,
): { ok: true; text: string } | { ok: false; status: 400 | 413; error: string } {
  // Checked against the raw body first: a 2 MB paste shouldn't be JSON-parsed
  // before being rejected.
  if (raw.length > MAX_IMPORT_CHARS + 2_000) {
    return {
      ok: false,
      status: 413,
      error: "That's too long to import — paste up to a page or so.",
    };
  }
  try {
    const parsed = JSON.parse(raw) as { text?: unknown };
    if (typeof parsed.text !== "string" || parsed.text.trim() === "") {
      return { ok: false, status: 400, error: "Paste your holdings first." };
    }
    return { ok: true, text: parsed.text.slice(0, MAX_IMPORT_CHARS) };
  } catch {
    return { ok: false, status: 400, error: "Paste your holdings first." };
  }
}
