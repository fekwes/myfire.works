/**
 * Currency formatting with region support.
 *
 * `formatCurrency` and `formatCurrencyCompact` accept an optional
 * `{ locale, currency }` bag. When omitted they fall back to GBP/en-GB
 * so every existing call site keeps working until it's migrated.
 *
 * Formatters are cached by (locale, currency) so we never construct more
 * than one Intl.NumberFormat per combination.
 */

interface CurrencyOpts {
  locale?: string;
  currency?: string;
}

// ---- formatter cache -------------------------------------------------- //

const cache = new Map<string, Intl.NumberFormat>();
const compactCache = new Map<string, Intl.NumberFormat>();

function key(locale: string, currency: string): string {
  return `${locale}:${currency}`;
}

function getFormatter(locale: string, currency: string): Intl.NumberFormat {
  const k = key(locale, currency);
  let f = cache.get(k);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      maximumFractionDigits: 0,
    });
    cache.set(k, f);
  }
  return f;
}

function getCompactFormatter(locale: string, currency: string): Intl.NumberFormat {
  const k = key(locale, currency);
  let f = compactCache.get(k);
  if (!f) {
    f = new Intl.NumberFormat(locale, {
      style: "currency",
      currency,
      notation: "compact",
      maximumFractionDigits: 1,
    });
    compactCache.set(k, f);
  }
  return f;
}

// ---- public API ------------------------------------------------------- //

export function formatCurrency(value: number, opts?: CurrencyOpts): string {
  const locale = opts?.locale ?? "en-GB";
  const currency = opts?.currency ?? "GBP";
  const safeValue = Number.isFinite(value) ? value : 0;
  return getFormatter(locale, currency).format(safeValue);
}

export function formatCurrencyCompact(value: number, opts?: CurrencyOpts): string {
  const locale = opts?.locale ?? "en-GB";
  const currency = opts?.currency ?? "GBP";
  const safeValue = Number.isFinite(value) ? value : 0;
  return getCompactFormatter(locale, currency).format(safeValue);
}
