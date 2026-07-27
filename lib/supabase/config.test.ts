import { describe, expect, it } from "vitest";
import { resolveSupabaseUrl } from "./config";

const PROJECT = "https://your-project-id.supabase.co";

describe("resolveSupabaseUrl", () => {
  it("takes a well-formed project URL as-is", () => {
    expect(resolveSupabaseUrl(PROJECT)).toEqual({
      origin: PROJECT,
      reason: null,
    });
  });

  it("tolerates a missing protocol and a trailing slash", () => {
    expect(resolveSupabaseUrl("your-project-id.supabase.co").origin).toBe(
      PROJECT,
    );
    expect(resolveSupabaseUrl(`${PROJECT}/`).origin).toBe(PROJECT);
  });

  it("accepts a Supabase custom domain", () => {
    expect(resolveSupabaseUrl("https://api.myfire.works").origin).toBe(
      "https://api.myfire.works",
    );
  });

  it("accepts the local Supabase CLI stack", () => {
    expect(resolveSupabaseUrl("http://localhost:54321").origin).toBe(
      "http://localhost:54321",
    );
  });

  // No Supabase at all is a supported build, not a misconfiguration: the app
  // degrades to local-only plans and must not shout about it.
  it("reports no reason when the variable is simply unset", () => {
    for (const absent of [undefined, "", "   "]) {
      expect(resolveSupabaseUrl(absent)).toEqual({ origin: null, reason: null });
    }
  });

  // The regression this file exists for. The variable held the app's own
  // deployment URL, so `signUp()` POSTed to `<the app>/auth/v1/signup` and the
  // browser blocked the preflight with "No 'Access-Control-Allow-Origin'".
  it("rejects the app's own Vercel deployment URL", () => {
    const { origin, reason } = resolveSupabaseUrl(
      "https://onfire-nu.vercel.app",
    );
    expect(origin).toBeNull();
    expect(reason).toMatch(/points at this app/);
  });

  it("rejects any preview deployment of the app", () => {
    expect(
      resolveSupabaseUrl("https://onfire-git-branch-team.vercel.app").origin,
    ).toBeNull();
  });

  it("rejects the app's configured site URL", () => {
    const appUrls = ["https://www.myfire.works"];
    expect(resolveSupabaseUrl("https://www.myfire.works", appUrls).origin).toBe(
      null,
    );
    // A different host on the same site is still Supabase's to serve.
    expect(resolveSupabaseUrl("https://db.myfire.works", appUrls).origin).toBe(
      "https://db.myfire.works",
    );
  });

  it("ignores unusable app URLs when deciding", () => {
    expect(
      resolveSupabaseUrl(PROJECT, [undefined, "", "not a url at all"]).origin,
    ).toBe(PROJECT);
  });

  it("rejects a whole KEY=value line pasted into the value box", () => {
    const { origin, reason } = resolveSupabaseUrl(
      `NEXT_PUBLIC_SUPABASE_URL=${PROJECT}`,
    );
    expect(origin).toBeNull();
    expect(reason).toMatch(/not a usable URL/);
  });

  it("rejects hostnames that could never resolve", () => {
    for (const bad of [
      "https://has spaces.supabase.co",
      "https://under_score.supabase.co",
      "not a url at all",
      "https://",
      "javascript:alert(1)",
    ]) {
      expect(resolveSupabaseUrl(bad).origin, bad).toBeNull();
    }
  });
});
