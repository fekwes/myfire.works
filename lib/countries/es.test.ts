import { describe, expect, test } from "vitest";
import { getPack, isCountryEnabled } from "./index";
import { esPack } from "./es";
import { ES_INCOME_TAX_BANDS_2026, ES_SAVINGS_TAX_BANDS_2026 } from "./es/constants";

describe("Spain (es-ES) Country Pack", () => {
  test("registers esPack correctly", () => {
    const pack = getPack("es");
    expect(pack.id).toBe("es");
    expect(pack.currency.code).toBe("EUR");
    expect(pack.currency.symbol).toBe("€");
  });

  test("contains expected Spanish wrappers", () => {
    const wrapperIds = esPack.wrappers.map((w) => w.id);
    expect(wrapperIds).toContain("pias");
    expect(wrapperIds).toContain("plan-pensiones");
    expect(wrapperIds).toContain("cuenta-valores");
  });

  test("defines correct IRPF 2026 income tax bands", () => {
    expect(ES_INCOME_TAX_BANDS_2026.personalAllowance).toBe(5550);
    expect(ES_INCOME_TAX_BANDS_2026.basicRate).toBe(0.19);
    expect(ES_INCOME_TAX_BANDS_2026.secondRate).toBe(0.24);
    expect(ES_INCOME_TAX_BANDS_2026.thirdRate).toBe(0.30);
    expect(ES_INCOME_TAX_BANDS_2026.fourthRate).toBe(0.37);
    expect(ES_INCOME_TAX_BANDS_2026.fifthRate).toBe(0.45);
    expect(ES_INCOME_TAX_BANDS_2026.topRate).toBe(0.47);
  });

  test("defines correct savings tax bands", () => {
    expect(ES_SAVINGS_TAX_BANDS_2026[0]).toEqual({ upTo: 6000, rate: 0.19 });
    expect(ES_SAVINGS_TAX_BANDS_2026[1]).toEqual({ upTo: 50000, rate: 0.21 });
    expect(ES_SAVINGS_TAX_BANDS_2026[2]).toEqual({ upTo: 200000, rate: 0.23 });
  });

  test("feature flag for Spain works", () => {
    // In Vitest (NODE_ENV === 'test'), isCountryEnabled('es') returns true for testing
    expect(isCountryEnabled("es")).toBe(true);
    expect(isCountryEnabled("uk")).toBe(true);
    expect(isCountryEnabled("unknown")).toBe(false);
  });
});
