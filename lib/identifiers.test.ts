import { describe, expect, it } from "vitest";
import { PLAN_STORAGE_KEY } from "./plan-storage";
import { PROFILES_TABLE } from "./profiles";

/**
 * These identifiers are load-bearing, not cosmetic.
 *
 * The product was renamed OnFIRE → Fireworks, but every one of these names is
 * a key into data that already exists: plans in people's browsers, rows in the
 * live Supabase table. "Finishing" the rename by tidying them to `fireworks:*`
 * would not migrate anything — it would silently orphan every saved plan and
 * profile, and the app would look, to the person affected, like it had thrown
 * their data away.
 *
 * (Retired keys: `onfire:flag:confidence-run` and `onfire:flag:withdrawals-viewed`,
 * plus the event `onfire:flags`, were removed when the setup guide was retargeted.
 * They are left in browsers and never read again.)
 *
 * If a rename is ever genuinely wanted it needs a migration: read the old key,
 * write the new one, keep the fallback for a release or two. Until then this
 * test exists to make an accidental rename fail loudly here, in CI, instead of
 * quietly in production.
 */
describe("persistent identifiers must not be renamed", () => {
  it("keeps the plan's localStorage key", () => {
    expect(PLAN_STORAGE_KEY).toBe("onfire:plan");
  });

  it("keeps the Supabase table name", () => {
    expect(PROFILES_TABLE).toBe("portfolios");
  });
});
