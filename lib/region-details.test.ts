import { describe, expect, test } from "vitest";
import { REGION_DETAILS } from "../components/RegionProvider";

describe("REGION_DETAILS", () => {
  test("provides UK region metadata and terminology", () => {
    const uk = REGION_DETAILS.uk;
    expect(uk.id).toBe("uk");
    expect(uk.currency).toBe("GBP");
    expect(uk.currencySymbol).toBe("£");
    expect(uk.accounts.taxFree).toBe("ISA");
    expect(uk.accounts.pension).toBe("SIPP");
    expect(uk.accessAges.pension).toBe(57);
  });

  test("provides US region metadata and terminology", () => {
    const us = REGION_DETAILS.us;
    expect(us.id).toBe("us");
    expect(us.currency).toBe("USD");
    expect(us.currencySymbol).toBe("$");
    expect(us.accounts.taxFree).toBe("Roth IRA");
    expect(us.accounts.pension).toBe("401(k) / IRA");
    expect(us.accessAges.pension).toBe(59);
  });
});
