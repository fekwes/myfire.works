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

function resolveCurrencySettings(currencyOrOpts?: string | CurrencyOpts, locale?: string) {
  if (typeof currencyOrOpts === "object" && currencyOrOpts !== null) {
    return {
      locale: currencyOrOpts.locale ?? (currencyOrOpts.currency === "USD" ? "en-US" : "en-GB"),
      currency: currencyOrOpts.currency ?? "GBP",
    };
  }

  const resolvedCurrency = currencyOrOpts ?? "GBP";
  const resolvedLocale = locale ?? (resolvedCurrency === "USD" ? "en-US" : "en-GB");

  return { locale: resolvedLocale, currency: resolvedCurrency };
}

export function formatCurrency(value: number, currencyOrOpts?: string | CurrencyOpts, locale?: string): string {
  const { locale: resolvedLocale, currency: resolvedCurrency } = resolveCurrencySettings(currencyOrOpts, locale);
  const safeValue = Number.isFinite(value) ? value : 0;
  return getFormatter(resolvedLocale, resolvedCurrency).format(safeValue);
}

export function formatCurrencyCompact(value: number, currencyOrOpts?: string | CurrencyOpts, locale?: string): string {
  const { locale: resolvedLocale, currency: resolvedCurrency } = resolveCurrencySettings(currencyOrOpts, locale);
  const safeValue = Number.isFinite(value) ? value : 0;
  const raw = getCompactFormatter(resolvedLocale, resolvedCurrency).format(safeValue);
  return raw.replace(/\.0(?=[kKmMbBtT])/, "");
}
