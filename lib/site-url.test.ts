import { describe, expect, it } from "vitest";
import { pickSiteUrl } from "./site-url";

const LOCALHOST = "http://localhost:3000";

describe("pickSiteUrl", () => {
  it("takes a well-formed origin as-is", () => {
    expect(pickSiteUrl(["https://myfire.works"])).toBe("https://myfire.works");
  });

  it("tolerates a missing protocol", () => {
    expect(pickSiteUrl(["myfire.works"])).toBe("https://myfire.works");
  });

  it("drops a trailing slash and any path", () => {
    expect(pickSiteUrl(["https://myfire.works/"])).toBe("https://myfire.works");
    expect(pickSiteUrl(["https://myfire.works/planner"])).toBe(
      "https://myfire.works",
    );
  });

  it("keeps a non-default port and the www subdomain", () => {
    expect(pickSiteUrl(["https://www.myfire.works"])).toBe(
      "https://www.myfire.works",
    );
    expect(pickSiteUrl(["http://localhost:3000"])).toBe(LOCALHOST);
  });

  // The regression this file exists for. Pasting the whole `KEY=value` line into
  // the Vercel dashboard's value box produced a URL that parsed cleanly and sent
  // every canonical, sitemap entry and OG image on the live site to a hostname
  // that does not exist.
  it("rejects a whole KEY=value line pasted into the value box", () => {
    expect(pickSiteUrl(["NEXT_PUBLIC_SITE_URL=https://myfire.works"])).toBe(
      LOCALHOST,
    );
  });

  it("falls through a bad value to the next candidate", () => {
    expect(
      pickSiteUrl(["NEXT_PUBLIC_SITE_URL=https://myfire.works", "myfire.works"]),
    ).toBe("https://myfire.works");
  });

  it("prefers an explicit value over the platform fallback", () => {
    expect(pickSiteUrl(["https://myfire.works", "onfire-nu.vercel.app"])).toBe(
      "https://myfire.works",
    );
  });

  it("skips empty, blank and absent candidates", () => {
    expect(pickSiteUrl([undefined, "", "   ", "myfire.works"])).toBe(
      "https://myfire.works",
    );
    expect(pickSiteUrl([])).toBe(LOCALHOST);
    expect(pickSiteUrl([undefined])).toBe(LOCALHOST);
  });

  it("rejects hostnames that could never resolve", () => {
    for (const bad of [
      "https://has spaces.works",
      "https://under_score.works",
      "https://=weird",
      "not a url at all",
      "https://",
      "javascript:alert(1)",
      "ftp://myfire.works",
    ]) {
      expect(pickSiteUrl([bad]), bad).toBe(LOCALHOST);
    }
  });

  it("rejects a dotless hostname that isn't localhost", () => {
    expect(pickSiteUrl(["https://myfire"])).toBe(LOCALHOST);
  });
});
