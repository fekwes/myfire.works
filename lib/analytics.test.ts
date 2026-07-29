import { describe, expect, test, vi } from "vitest";
import { ANALYTICS_EVENTS, trackEvent } from "./analytics";

describe("Umami Analytics Helper", () => {
  test("defines all key product funnel events", () => {
    expect(ANALYTICS_EVENTS.LANDING_PAGE_VIEWED).toBe("Landing page viewed");
    expect(ANALYTICS_EVENTS.REGION_SELECTOR_VIEWED).toBe("Region selector viewed");
    expect(ANALYTICS_EVENTS.COMING_SOON_CTA_CLICKED).toBe("Coming soon CTA clicked");
    expect(ANALYTICS_EVENTS.PRIMARY_CONVERSION_CTA_CLICKED).toBe("Primary conversion CTA clicked");
    expect(ANALYTICS_EVENTS.FORM_STARTED).toBe("Form started");
    expect(ANALYTICS_EVENTS.FORM_SUBMITTED).toBe("Form submitted");
    expect(ANALYTICS_EVENTS.SUCCESSFUL_COMPLETION).toBe("Successful completion");
  });

  test("safely no-ops when window.umami is undefined", () => {
    expect(() => trackEvent("Test Event", { foo: "bar" })).not.toThrow();
  });

  test("invokes window.umami.track when window.umami is defined", () => {
    const mockTrack = vi.fn();
    (global as unknown as { window: { umami: { track: typeof mockTrack } } }).window = {
      umami: { track: mockTrack },
    };

    trackEvent(ANALYTICS_EVENTS.LANDING_PAGE_VIEWED, { country: "es" });

    expect(mockTrack).toHaveBeenCalledWith("Landing page viewed", { country: "es" });
  });
});
