/**
 * Bisection over a monotonic pass/fail predicate.
 *
 * Three solvers — the FIRE number, Coast FIRE and the what-if levers — all ask
 * the same question: "what is the smallest input for which the plan still
 * works?" `simulateFire` is monotonic in each of those inputs (more money, or
 * more contribution, never makes a plan fail that already passed), so binary
 * search finds the boundary.
 *
 * They each carried their own copy of this loop with its own iteration count.
 * One copy means one place to reason about precision.
 */

/** Smallest amount in `[0, hi]` where `passes` holds, to within `tolerance`. */
export function smallestPassing(
  passes: (amount: number) => boolean,
  options: {
    /** First upper-bound guess; doubled until it passes. */
    initialHi: number;
    /** Give up doubling past this — the plan is unreachable. */
    maxHi: number;
    /** Stop once the bracket is narrower than this. Money, so £1. */
    tolerance?: number;
  },
): number | null {
  if (passes(0)) return 0;
  
  const tolerance = options.tolerance ?? 1;

  let lo = 0;
  let hi = options.initialHi;
  while (!passes(hi)) {
    hi *= 2;
    if (hi > options.maxHi) return null;
  }

  // Each step halves the bracket, so the loop is bounded by log2(hi/tolerance)
  // — about 21 steps for a £2M range at £1. The cap is a backstop against a
  // predicate that isn't actually monotonic, not the normal exit.
  for (let i = 0; i < 64 && hi - lo > tolerance; i++) {
    const mid = (lo + hi) / 2;
    if (passes(mid)) hi = mid;
    else lo = mid;
  }
  return hi;
}
