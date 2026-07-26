export interface RateLimitResult {
  allowed: boolean;
  /** Requests left in the current window (0 when blocked). */
  remaining: number;
  /** Milliseconds until the window resets (only meaningful when blocked). */
  retryAfterMs: number;
}

export interface RateLimiter {
  check(key: string): RateLimitResult;
}

/**
 * A tiny fixed-window rate limiter with an in-memory store. Deterministic and
 * time-injectable so it can be unit-tested. This is per-process memory — fine
 * for a single serverless instance; for multi-instance production swap the
 * store for Upstash/Vercel KV behind the same interface.
 */
/**
 * Apply limiters in order, stopping at the first that blocks.
 *
 * The short-circuit is the point. `check()` *consumes* from its window, so
 * evaluating every limiter on every request means an already-blocked caller
 * still spends a token from the global daily budget — and a flood from one IP
 * then exhausts the global cap and takes the endpoint down for everybody,
 * which is the exact outcome a global cap exists to prevent. Narrowest limit
 * first, global backstop last.
 */
export function checkInOrder(
  checks: readonly (() => RateLimitResult)[],
): RateLimitResult {
  let last: RateLimitResult = { allowed: true, remaining: 0, retryAfterMs: 0 };
  for (const check of checks) {
    last = check();
    if (!last.allowed) return last;
  }
  return last;
}

/** Best-effort client IP from proxy headers (Vercel and most hosts set these). */
export function clientIp(request: Request): string {
  const fwd = request.headers.get("x-forwarded-for");
  if (fwd) {
    // Left-most entry is the original client; the rest are proxies.
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return request.headers.get("x-real-ip") ?? "unknown";
}

export function createRateLimiter(opts: {
  windowMs: number;
  max: number;
  now?: () => number;
}): RateLimiter {
  const { windowMs, max } = opts;
  const now = opts.now ?? (() => Date.now());
  const hits = new Map<string, { count: number; start: number }>();

  const prune = (t: number) => {
    // Keep the map from growing unbounded on a long-lived instance.
    if (hits.size < 5000) return;
    for (const [k, v] of hits) {
      if (t - v.start >= windowMs) hits.delete(k);
    }
  };

  return {
    check(key: string): RateLimitResult {
      const t = now();
      const entry = hits.get(key);

      if (!entry || t - entry.start >= windowMs) {
        prune(t);
        hits.set(key, { count: 1, start: t });
        return { allowed: true, remaining: max - 1, retryAfterMs: 0 };
      }

      if (entry.count >= max) {
        return {
          allowed: false,
          remaining: 0,
          retryAfterMs: windowMs - (t - entry.start),
        };
      }

      entry.count += 1;
      return { allowed: true, remaining: max - entry.count, retryAfterMs: 0 };
    },
  };
}
