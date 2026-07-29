declare global {
  interface Window {
    umami?: {
      track: (eventName: string, eventData?: Record<string, unknown>) => void;
    };
  }
}

export const ANALYTICS_EVENTS = {
  LANDING_PAGE_VIEWED: "Landing page viewed",
  REGION_SELECTOR_VIEWED: "Region selector viewed",
  COMING_SOON_CTA_CLICKED: "Coming soon CTA clicked",
  PRIMARY_CONVERSION_CTA_CLICKED: "Primary conversion CTA clicked",
  FORM_STARTED: "Form started",
  FORM_SUBMITTED: "Form submitted",
  SUCCESSFUL_COMPLETION: "Successful completion",
} as const;

/**
 * Safe wrapper to send cookieless product events to Umami Analytics.
 */
export function trackEvent(eventName: string, eventData?: Record<string, unknown>): void {
  if (typeof window !== "undefined" && window.umami && typeof window.umami.track === "function") {
    try {
      window.umami.track(eventName, eventData);
    } catch {
      // Ignore errors silently
    }
  }
}
