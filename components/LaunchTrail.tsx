"use client";

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
} from "react";

// The trail only exists from `lg` up, where there is room for it to arc across
// the page without crossing the copy. Below that the card's own sparkline
// carries the whole gesture on its own.

/**
 * The full-page launch trail. A firework is lit at the foot of the page and
 * arcs all the way up to the hero's plan preview, where the card's own
 * sparkline picks the arc up and carries it to the burst. Scrolling down walks
 * the flow in reverse — burst, climb, ignition.
 *
 * The path is *measured*, not hand-drawn: a static curve cannot stay joined to
 * the card, because the card's position depends on page height, breakpoint and
 * how much copy sits above it. This reads both anchors and re-derives the curve
 * on resize, so the join holds wherever the layout puts them.
 *
 * Anchors (set by the landing page):
 *   [data-launch-from] — the ignition point at the foot of the page
 *   [data-launch-to]   — the preview card; the trail aims at its left edge, at
 *                        the height where [data-launch-join] (the sparkline)
 *                        begins, then disappears behind it.
 */
export function LaunchTrail() {
  const wrapRef = useRef<HTMLDivElement>(null);
  const [path, setPath] = useState<string | null>(null);

  const measure = useCallback(() => {
    const wrap = wrapRef.current;
    const from = document.querySelector("[data-launch-from]");
    const card = document.querySelector("[data-launch-to]");
    const join = document.querySelector("[data-launch-join]");
    if (!wrap || !from || !card || !join) return setPath(null);

    const w = wrap.getBoundingClientRect();
    const f = from.getBoundingClientRect();
    const c = card.getBoundingClientRect();
    const j = join.getBoundingClientRect();

    // Local coordinates, in CSS pixels relative to the wrapper.
    const x0 = f.x + f.width / 2 - w.x;
    const y0 = f.y + f.height / 2 - w.y;
    // Aim a little *past* the card's left edge so the tip is safely hidden
    // behind it, at the height the sparkline starts.
    const x1 = c.x - w.x + 28;
    const y1 = j.bottom - w.y;

    const dx = x1 - x0;
    const dy = y1 - y0; // negative — the trail climbs

    // A single cubic with a long, lazy launch and a flattening arrival, so it
    // reads as one continuous rise rather than a diagonal line.
    const d = [
      `M${x0.toFixed(1)},${y0.toFixed(1)}`,
      `C${(x0 + dx * 0.08).toFixed(1)},${(y0 + dy * 0.42).toFixed(1)}`,
      `${(x0 + dx * 0.52).toFixed(1)},${(y0 + dy * 0.92).toFixed(1)}`,
      `${x1.toFixed(1)},${y1.toFixed(1)}`,
    ].join(" ");
    setPath(d);
  }, []);

  useEffect(() => {
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    ro.observe(document.body);
    window.addEventListener("resize", measure);
    // Fonts land after first paint and move the card; re-measure once they do.
    document.fonts?.ready.then(measure).catch(() => {});
    return () => {
      ro.disconnect();
      window.removeEventListener("resize", measure);
    };
  }, [measure]);

  return (
    <div
      ref={wrapRef}
      aria-hidden
      className="pointer-events-none absolute inset-0 z-0 hidden lg:block"
    >
      {path && (
        <svg
          className="absolute inset-0 h-full w-full overflow-visible"
          fill="none"
        >
          <defs>
            <linearGradient
              id="launch-trail-stroke"
              x1="0"
              y1="1"
              x2="1"
              y2="0"
            >
              <stop offset="0%" stopColor="var(--primary)" stopOpacity={0.55} />
              <stop offset="38%" stopColor="var(--accent)" stopOpacity={0.4} />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity={0.75} />
            </linearGradient>
          </defs>
          <path
            className="hero-trail"
            d={path}
            stroke="url(#launch-trail-stroke)"
            strokeWidth={2.5}
            strokeLinecap="round"
            pathLength={1}
          />
        </svg>
      )}
    </div>
  );
}

const REDUCED_MOTION = "(prefers-reduced-motion: reduce)";

/**
 * Subscribes to the reduced-motion preference. `useSyncExternalStore` rather
 * than an effect so there's no setState-in-effect cascade, and so the server
 * snapshot is the conservative one — assume reduced, render the inert marker,
 * and upgrade on hydration only if motion is actually welcome. Same shape as
 * `useMounted` in ThemeToggle.
 */
function useReducedMotion() {
  return useSyncExternalStore(
    (onChange) => {
      const mq = window.matchMedia(REDUCED_MOTION);
      mq.addEventListener("change", onChange);
      return () => mq.removeEventListener("change", onChange);
    },
    () => window.matchMedia(REDUCED_MOTION).matches,
    () => true,
  );
}

/** Every element that makes up the three-beat launch, in beat order. */
const BEATS = ".hero-trail, .hero-chart-draw, .hero-chart-fill, .spark-pop";

/**
 * Restart the launch. Clearing `animation` and forcing a reflow before putting
 * it back re-triggers the CSS animations from zero, so every beat replays with
 * its original delay — which is what keeps them in sequence.
 */
function replayLaunch() {
  document.querySelectorAll<HTMLElement | SVGElement>(BEATS).forEach((el) => {
    el.style.animation = "none";
    el.getBoundingClientRect(); // force reflow (SVG has no offsetWidth)
    el.style.animation = "";
  });
}

/**
 * The ignition — where someone sets the thing off, and the origin the trail is
 * measured from. It's a real button: the trail is the page's one celebratory
 * gesture, and being able to set it off again is the whole idea. Under
 * `prefers-reduced-motion` there is no animation to replay, so it degrades to a
 * plain marker with no interactive affordance.
 */
export function LaunchPad() {
  const canReplay = !useReducedMotion();

  const ember = (
    <span
      data-launch-from
      aria-hidden
      className="relative inline-block size-3 shrink-0"
    >
      <span className="absolute inset-0 rounded-full bg-brand/25 blur-[3px]" />
      <span className="absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand" />
    </span>
  );

  if (!canReplay) return ember;

  return (
    <button
      type="button"
      onClick={replayLaunch}
      className="group inline-flex items-center gap-2 rounded-full text-muted-foreground transition-colors hover:text-foreground"
    >
      <span className="transition-transform duration-[var(--dur-fast)] group-hover:scale-125">
        {ember}
      </span>
      Light it again
    </button>
  );
}
