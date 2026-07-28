const formatters: Record<string, Intl.NumberFormat> = {
  GBP: new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    maximumFractionDigits: 0,
  }),
  USD: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }),
};

const compactFormatters: Record<string, Intl.NumberFormat> = {
  GBP: new Intl.NumberFormat("en-GB", {
    style: "currency",
    currency: "GBP",
    notation: "compact",
    maximumFractionDigits: 1,
  }),
  USD: new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    notation: "compact",
    maximumFractionDigits: 1,
  }),
};

export function formatCurrency(
  value: number,
  currency: "GBP" | "USD" = "GBP",
): string {
  const formatter = formatters[currency] ?? formatters.GBP;
  return formatter.format(value);
}

export function formatCurrencyCompact(
  value: number,
  currency: "GBP" | "USD" = "GBP",
): string {
  const formatter = compactFormatters[currency] ?? compactFormatters.GBP;
  return formatter.format(value);
}
