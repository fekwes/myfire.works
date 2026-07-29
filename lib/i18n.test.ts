import { describe, expect, test } from "vitest";
import { getTranslationByKey, getTranslations } from "./i18n";
import { enGB } from "./i18n/locales/en-GB";
import { esES } from "./i18n/locales/es-ES";

describe("i18n Translation Engine", () => {
  test("en-GB and es-ES have matching keys across all sections", () => {
    const enSections = Object.keys(enGB) as (keyof typeof enGB)[];
    const esSections = Object.keys(esES) as (keyof typeof esES)[];

    expect(esSections.sort()).toEqual(enSections.sort());

    for (const section of enSections) {
      const enKeys = Object.keys(enGB[section]);
      const esKeys = Object.keys(esES[section]);
      expect(esKeys.sort()).toEqual(enKeys.sort());
    }
  });

  test("getTranslationByKey returns localized string", () => {
    const esNavPlanner = getTranslationByKey("es-ES", "nav", "planner");
    expect(esNavPlanner).toBe("Planificador");

    const enNavPlanner = getTranslationByKey("en-GB", "nav", "planner");
    expect(enNavPlanner).toBe("Planner");
  });

  test("getTranslations returns complete dictionary", () => {
    const es = getTranslations("es");
    expect(es.hero.spainLaunchingSoon).toBe("Versión para España disponible muy pronto");
    expect(es.comingSoon.title).toBe("España estará disponible muy pronto");
  });
});
