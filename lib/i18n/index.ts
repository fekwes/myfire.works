import { enGB } from "./locales/en-GB";
import { esES } from "./locales/es-ES";
import { Locale, Translations } from "./types";

export const LOCALES: Record<Locale, Translations> = {
  "en-GB": enGB,
  "es-ES": esES,
};

export function getTranslations(locale: Locale | string): Translations {
  if (locale === "es-ES" || locale === "es") {
    return esES;
  }
  return enGB;
}

export function getTranslationByKey(
  locale: Locale | string,
  section: keyof Translations,
  key: string
): string {
  const trans = getTranslations(locale);
  const sec = trans[section] as Record<string, string> | undefined;
  return sec?.[key] ?? enGB[section]?.[key as keyof (typeof enGB)[typeof section]] ?? key;
}
