import { describe, expect, it } from "vitest";
import { createRateLimiter } from "./rate-limit";

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
