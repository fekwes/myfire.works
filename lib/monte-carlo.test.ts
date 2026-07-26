import { describe, expect, it } from "vitest";
import { allocationToReturns, runMonteCarlo } from "./monte-carlo";
import type { FireInputs } from "./fire-engine";

describe("allocationToReturns", () => {
  it("maps the endpoints to equity and bond assumptions", () => {
    expect(allocationToReturns(1)).toEqual({ mean: 0.07, vol: 0.16 });
    expect(allocationToReturns(0)).toEqual({ mean: 0.025, vol: 0.06 });
  });

  it("interpolates linearly in between", () => {
    const mid = allocationToReturns(0.5);
    expect(mid.mean).toBeCloseTo((0.07 + 0.025) / 2, 6);
    expect(mid.vol).toBeCloseTo((0.16 + 0.06) / 2, 6);
  });

  it("clamps out-of-range fractions", () => {
    expect(allocationToReturns(2)).toEqual(allocationToReturns(1));
    expect(allocationToReturns(-1)).toEqual(allocationToReturns(0));
  });
});

describe("runMonteCarlo", () => {
  const wellFunded: FireInputs = {
    currentAge: 60,
    retirementAge: 60,
    targetAnnualIncome: 20000,
    isaBalance: 800000,
    isaMonthlyContribution: 0,
    sippBalance: 200000,
    sippMonthlyContribution: 0,
  };

  const underFunded: FireInputs = {
    currentAge: 60,
    retirementAge: 60,
    targetAnnualIncome: 45000,
    isaBalance: 150000,
    isaMonthlyContribution: 0,
    sippBalance: 100000,
    sippMonthlyContribution: 0,
  };

  it("is deterministic for a given seed", () => {
    const a = runMonteCarlo(wellFunded, { sims: 300, seed: 42 });
    const b = runMonteCarlo(wellFunded, { sims: 300, seed: 42 });
    expect(a.strategies[0].successRate).toBe(b.strategies[0].successRate);
  });

  it("returns success rates in [0, 1] for every strategy", () => {
    const r = runMonteCarlo(wellFunded, { sims: 300, seed: 1 });
    expect(r.strategies).toHaveLength(3);
    for (const s of r.strategies) {
      expect(s.successRate).toBeGreaterThanOrEqual(0);
      expect(s.successRate).toBeLessThanOrEqual(1);
      expect(s.percentiles.length).toBeGreaterThan(0);
    }
  });

  it("finds a well-funded plan far more likely to succeed than an under-funded one", () => {
    const good = runMonteCarlo(wellFunded, { sims: 500, seed: 7 });
    const bad = runMonteCarlo(underFunded, { sims: 500, seed: 7 });
    const flatGood = good.strategies.find((s) => s.key === "flat")!;
    const flatBad = bad.strategies.find((s) => s.key === "flat")!;
    expect(flatGood.successRate).toBeGreaterThan(flatBad.successRate);
    expect(flatGood.successRate).toBeGreaterThan(0.8);
  });

  it("guardrails (which only cut spending) never do worse than flat", () => {
    const r = runMonteCarlo(underFunded, { sims: 500, seed: 3 });
    const flat = r.strategies.find((s) => s.key === "flat")!;
    const guard10 = r.strategies.find((s) => s.key === "guard10")!;
    expect(guard10.successRate).toBeGreaterThanOrEqual(flat.successRate);
  });

  /**
   * Common random numbers: all three strategies must be scored on the *same*
   * market paths, or part of any gap between them is just which returns each
   * happened to be dealt.
   *
   * Guardrails only ever spend less than flat does — spending is cut when the
   * pot is stretched and capped at the target when it recovers — so on
   * identical paths a guardrail strategy cannot fail where flat survived, and
   * a wider band cannot do worse than a narrower one. That makes the ordering
   * below a fact about the model, not a statistical tendency.
   *
   * It regressed exactly once, when the strategies shared one generator and
   * consumed it in turn: at seed 99999 the app reported ±10% guardrails as
   * *worse* than ±5%, the opposite of the truth.
   */
  it("scores every strategy on the same market paths", () => {
    for (const seed of [1, 42, 99999, 314159]) {
      for (const sims of [50, 500]) {
        const r = runMonteCarlo(underFunded, { sims, seed });
        const rate = (key: string) =>
          r.strategies.find((s) => s.key === key)!.successRate;
        const where = `seed ${seed}, ${sims} sims`;
        expect(rate("guard5"), where).toBeGreaterThanOrEqual(rate("flat"));
        expect(rate("guard10"), where).toBeGreaterThanOrEqual(rate("guard5"));
      }
    }
  });

  /**
   * A direct check that the paths really are shared, at the one point where
   * the strategies provably cannot differ.
   *
   * In the top decile of first-year outcomes the pot is comfortable, so the
   * guardrail's *upward* branch applies — and it caps spending at the target,
   * which is what flat spends anyway. Same drawn return, same withdrawal, so
   * `p90` at the first age must match to the pound. (`p10` legitimately
   * differs: down there the guardrail cuts spending, which is the whole idea.)
   */
  it("gives every strategy the same first-year top decile", () => {
    const r = runMonteCarlo(underFunded, { sims: 500, seed: 42 });
    const [first, ...rest] = r.strategies.map((s) => s.percentiles[0]);
    for (const band of rest) {
      expect(band.p90).toBe(first.p90);
    }
  });

  it("percentile bands are ordered p10 <= p50 <= p90", () => {
    const r = runMonteCarlo(wellFunded, { sims: 400, seed: 9 });
    for (const s of r.strategies) {
      for (const band of s.percentiles) {
        expect(band.p10).toBeLessThanOrEqual(band.p50);
        expect(band.p50).toBeLessThanOrEqual(band.p90);
      }
    }
  });
});
