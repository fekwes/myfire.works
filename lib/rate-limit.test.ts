import { describe, expect, it } from "vitest";
import { checkInOrder, clientIp, createRateLimiter } from "./rate-limit";

describe("createRateLimiter", () => {
  it("allows up to max requests in a window, then blocks", () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 3, now: () => 0 });
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("a")).toMatchObject({ allowed: true, remaining: 0 });
    const blocked = rl.check("a");
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("resets once the window elapses", () => {
    let t = 0;
    const rl = createRateLimiter({ windowMs: 1000, max: 1, now: () => t });
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);
    t = 1000; // window elapsed
    expect(rl.check("a").allowed).toBe(true);
  });

  it("tracks keys independently", () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 1, now: () => 0 });
    expect(rl.check("a").allowed).toBe(true);
    expect(rl.check("b").allowed).toBe(true);
    expect(rl.check("a").allowed).toBe(false);
  });

  it("reports remaining allowance", () => {
    const rl = createRateLimiter({ windowMs: 1000, max: 5, now: () => 0 });
    expect(rl.check("a").remaining).toBe(4);
    expect(rl.check("a").remaining).toBe(3);
  });
});

describe("checkInOrder", () => {
  it("allows when every limiter allows", () => {
    const a = createRateLimiter({ windowMs: 1000, max: 2, now: () => 0 });
    const b = createRateLimiter({ windowMs: 1000, max: 2, now: () => 0 });
    expect(
      checkInOrder([() => a.check("ip"), () => b.check("global")]).allowed,
    ).toBe(true);
  });

  it("reports the first limiter that blocks", () => {
    const narrow = createRateLimiter({ windowMs: 1000, max: 1, now: () => 0 });
    const wide = createRateLimiter({ windowMs: 5000, max: 100, now: () => 0 });
    checkInOrder([() => narrow.check("ip"), () => wide.check("global")]);
    const second = checkInOrder([
      () => narrow.check("ip"),
      () => wide.check("global"),
    ]);
    expect(second.allowed).toBe(false);
    // The narrow window's reset, not the wide one's.
    expect(second.retryAfterMs).toBe(1000);
  });

  /**
   * The reason this helper exists. `check()` consumes from its window, so
   * evaluating every limiter on every request let an already-blocked caller
   * keep spending the global daily budget — one flooding IP could exhaust the
   * global cap and take the endpoint down for everyone else, which is the
   * outcome the global cap is there to prevent.
   */
  it("does not spend a later limiter's budget once one has blocked", () => {
    const perIp = createRateLimiter({ windowMs: 1000, max: 1, now: () => 0 });
    const global = createRateLimiter({ windowMs: 1000, max: 3, now: () => 0 });
    const attempt = () =>
      checkInOrder([() => perIp.check("flooder"), () => global.check("global")]);

    attempt(); // allowed, spends 1 of the global 3
    for (let i = 0; i < 50; i++) attempt(); // all blocked by perIp

    // A different caller must still get through: the global budget has 2 left.
    expect(
      checkInOrder([() => perIp.check("someone-else"), () => global.check("global")])
        .allowed,
    ).toBe(true);
  });

  it("allows an empty list rather than blocking everything", () => {
    expect(checkInOrder([]).allowed).toBe(true);
  });
});

describe("clientIp", () => {
  const req = (headers: Record<string, string>) => new Request("https://x.test", { headers });

  it("takes the left-most x-forwarded-for entry", () => {
    expect(clientIp(req({ "x-forwarded-for": "1.2.3.4, 5.6.7.8" }))).toBe("1.2.3.4");
  });

  it("falls back to x-real-ip", () => {
    expect(clientIp(req({ "x-real-ip": "9.9.9.9" }))).toBe("9.9.9.9");
  });

  it("does not return an empty key for a malformed header", () => {
    // An empty key would bucket every such request together under "".
    expect(clientIp(req({ "x-forwarded-for": " , 5.6.7.8" }))).toBe("unknown");
  });

  it("falls back to a known placeholder with no headers", () => {
    expect(clientIp(req({}))).toBe("unknown");
  });
});
