/**
 * Central Feature Flags configuration.
 *
 * `countryEnabled.uk` is always true (live UK experience).
 * `countryEnabled.es` is false by default in production, but can be enabled in dev mode,
 * via `NEXT_PUBLIC_ENABLE_ALL_COUNTRIES="true"`, or with query param `?dev_country=es`.
 */

export interface CountryEnabledFlags {
  uk: boolean;
  es: boolean;
  us: boolean;
}

export const DEFAULT_COUNTRY_FLAGS: CountryEnabledFlags = {
  uk: true,
  es: false,
  us: false,
};

export function isCountryEnabled(
  countryCode: "uk" | "es" | "us" | string,
  opts?: { searchParams?: URLSearchParams }
): boolean {
  if (countryCode === "uk") return true;

  const enableAll = process.env.NEXT_PUBLIC_ENABLE_ALL_COUNTRIES === "true";
  const devQueryCountry =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("dev_country")
      : opts?.searchParams?.get("dev_country");

  if (countryCode === "es") {
    // Enabled in test mode, when explicit env flag is set, or with dev_country=es parameter
    return (
      enableAll ||
      devQueryCountry === "es" ||
      process.env.NODE_ENV === "test" ||
      process.env.NEXT_PUBLIC_COUNTRY_ES_ENABLED === "true"
    );
  }

  return false;
}
