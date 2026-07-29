# Fireworks design system — "Night & Ember"

> **Status: Current.** The design system in force. See [`README.md`](./README.md)
> for the documentation index.

The visual language and the primitives that implement it. The goal is a product
that reads as **precise, trustworthy and made with care** — which is what both
the UK FIRE audience (analytical, evidence-driven, allergic to marketing fluff)
and a recruiter looking at a portfolio piece actually reward. It is deliberately
_not_ the generic emerald/purple-gradient "AI SaaS" look.

## The idea

**Fireworks** leans into a double meaning: **FIRE** (financial independence,
retire early) × **fireworks** (the celebratory moment it "goes off"), on the
domain **myfire.works** (it _works_). The unifying gesture is the
**launch trail → burst**: a firework's rising trail is the exact shape of a
compounding net-worth curve, and the burst at the top is the moment you reach
financial independence. The logo, the hero, and every growth line in the app
share that arc, so the identity and the data-viz speak one language.

The signature warmth is **reserved**: ember/gold marks the moment a plan
succeeds. Everywhere else the palette stays quiet and precise. That restraint
is what keeps "celebratory" from tipping into "gimmicky".

## Principles

1. **Lead with the number.** Every screen answers its main question first (the
   verdict, the FIRE number), then progressively discloses detail. (Fintech
   "one number, then depth" pattern.)
2. **Intentional hierarchy, not uniformity.** Identical padding / radius / card
   heights everywhere is the #1 "AI-made" tell. Vary padding, weight and
   elevation _by role_ — a north-star card is `lg`, a stat tile is `sm`.
3. **Purposeful motion.** Shared easing/duration tokens; hover and press states
   that mean something; one considered reveal, not a fade on everything. The one
   celebratory "burst" beat is reserved for reaching FI. All of it behind
   `prefers-reduced-motion`.
4. **Plain, confident, UK voice.** Say the true thing simply. The "not advice"
   honesty is a trust feature, not fine print.
5. **Accessible by construction.** Menus follow the WAI-ARIA pattern; everything
   interactive has a visible focus ring.

## Logo & wordmark

The backdrop's spark drift (`.app-backdrop::after`) is composed **per theme, not
gated to one**. Light specks on the night ground read as sparks immediately;
anything darker than cream reads as dust, so the light drift is fewer, larger,
warmer and softer — embers hanging in a bright sky rather than stars.

- **Mark — "Trajectory Burst"** (`components/Logo.tsx`, `app/icon.svg`): an ember
  launch trail (a real growth curve) rising into a gold burst, on a night-indigo
  tile. Self-contained so it reads in both themes and down to favicon size.
- **Wordmark**: `Fire·works` — the interpunct is the spark, set in `--primary`.
  Header lockup uses the mark + wordmark; `fire.works` is the marketing/OG
  variant, plain `Fireworks` the tight-space fallback.
- **OG image** (`app/opengraph-image.tsx`): Night & Ember, mark + wordmark, the
  headline "Know your number. Know when. Know it'll hold."

## Tokens (`app/globals.css`)

- **Colour** (semantic, theme-aware): `--background`, `--foreground`, `--surface`,
  `--surface-muted`, `--border`, `--primary` (burnt/incandescent ember — the
  signature), `--brand` (bright ember/gold fill — the "burst"), `--accent`
  (periwinkle violet — the counter-spark), `--muted-foreground`, `--success`,
  `--danger`, and a `--data-1/2/3` chart ramp (ember · violet · teal). Exposed to
  Tailwind via `@theme inline` as `bg-surface`, `text-muted-foreground`, etc.
  Dark (a deep-indigo night sky) is the **served** default — `ThemeProvider` in
  `app/layout.tsx` uses `defaultTheme="dark" enableSystem={false}`, so a visitor
  with no stored preference gets dark whatever their OS says. Light is a warm
  paper, reached through the header toggle and remembered from then on.
  `enableSystem` is off on purpose: `ThemeToggle` only ever sets `light` or
  `dark`, so a reachable `system` state would be one no control can produce.

## Theme support tiers

The two themes are not peers, and saying so is what keeps the cost honest.

- **Showcase — dark.** What a first-time visitor sees, and where the identity is
  spent. Browser-verify it on **every** change that touches UI.
- **Supported — light.** Must stay complete and accessible: every semantic token
  resolves to a light value, and text meets WCAG AA. Browser-verify it when
  **tokens change** (any diff to the `:root` / `.dark` blocks in
  `app/globals.css`) or when **page layout or responsive behaviour changes** —
  and before a release. Not required for copy or logic changes.
- **Print is its own consumer.** `@media print` overrides *both* `:root` and
  `.dark`, so it does not depend on light being the active theme — but it does
  depend on the light values. Review the print block in any change that touches
  light tokens.

The triggers are mechanical on purpose, so "did this need a light pass?" has an
answer you can check rather than argue about.
- **Type**: Bricolage Grotesque (`font-display`) for headings, Geist
  (`font-sans`) for body, Geist Mono (`font-mono`) for micro-labels **and every
  money figure** (use `.tabular` so columns of pounds align).
- **Motion**: `--ease-out`, `--ease-spring`, `--dur-fast` (150ms), `--dur-base`
  (250ms).
- **Elevation**: `--shadow-sm/md/lg` (softer + deeper on dark). Used via
  `shadow-[var(--shadow-md)]`, sparingly.

## Primitives (`components/ui/`)

- **`Button` / `ButtonLink`** — `variant`: `primary | secondary | ghost |
  danger`; `size`: `sm | md`. Includes focus ring + `active:scale` press.
  `buttonClasses()` is exported for the rare case you need the classes on a raw
  `<a>` (e.g. a hard-reload link in the error boundary). Replaces the ~20 hand-
  copied `bg-foreground … text-background` button strings.
- **`Card`** — `padding`: `none | sm | md | lg`; `elevation`: `flat | raised`.
  Vary these by context to create hierarchy. Replaces the repeated
  `rounded-2xl border border-border bg-surface` pattern.
- **`Menu`** — accessible dropdown (WAI-ARIA menu): `role="menu"`/`menuitem`,
  roving focus, Arrow/Home/End/Escape keys, focus returned to the trigger on
  close, click-outside dismissal. Item-based API (`{ label, icon, onSelect,
  href, tone }[]`). Replaces the hand-rolled dropdowns in `AuthButton` and
  `PlanActions`.
- **`Collapsible`** — WAI-ARIA disclosure with an optional `summary` shown
  while collapsed, so a closed section still says what's inside ("not
  included", "using defaults"). It reads the URL hash through
  `useSyncExternalStore` and opens when it is the link target — the planner's
  checklist deep-links into `/finances#…`, and progressive disclosure must
  never swallow a deep link.

**Also part of the system** (defined near their first use, reused widely):
`Field` + `NumberInput` (`components/FireForm.tsx`), `StatTile` + `Segmented`
(`components/FireDashboard.tsx`), `Chip` + `ProgressBar` + `useCountUp`
(`components/quiz/QuizPrimitives.tsx`).

## The landing gesture — one firework, three beats

The launch trail is not decoration beside the product; it *is* the product's
shape. On the landing page it runs as one continuous line:

1. **Ignition** (`LaunchPad`, `components/LaunchTrail.tsx`) — a lit ember at the
   foot of the page, in the differentiators section. It's a real button: this is
   the page's one celebratory gesture, and being able to set it off again is the
   point. Under `prefers-reduced-motion` it degrades to an inert marker.
2. **The climb** (`LaunchTrail`) — an arc from that ember up to the hero's
   preview card. The path is **measured, not hand-drawn**: it reads the ignition
   point and the card on mount and on resize, and re-derives the curve. A static
   path cannot stay joined, because the card's position depends on page height,
   breakpoint and how much copy sits above it. It aims 28px *behind* the card's
   left edge, at the height the sparkline starts, so the join is hidden.
3. **The carry and the burst** (`LandingHeroPreview`) — the card's own sparkline,
   real engine output, picks the arc up and carries it to the top right, where
   the burst goes off. The burst lives *in the chart*, not floating above it, so
   the FI moment lands on the number rather than near it.

The three beats hand over in time (`0.25s → 1.7s → 2.5s` in `globals.css`) so the
eye reads one unbroken line rather than three things animating near each other.
The trail only exists from `lg` up, where there's room for the arc to cross the
page without fighting the copy; below that the card's sparkline carries the whole
gesture alone.

**Don't put the burst back in a `slice`-scaled background SVG.** It lived there
once and was clipped into a visible rectangle: with `preserveAspectRatio="slice"`
the visible window is `containerHeight / (containerWidth / viewBoxWidth)` user
units tall, which was 509 against a composition spanning 570, so the bloom lost
its transparent outer stop to the crop.

## Data-viz

Charts are part of the brand, not an afterthought. The launch-trail arc is the
house style for growth lines: an ember path with a warm, "arriving" endpoint, a
soft gradient area fill, and a faint grid.

**The ramp is validated, not eyeballed.** `--data-1/2/3` are the *mark* colours
and are deliberately a step apart from the UI accents (which are tuned for text
on their ground). Both modes pass all six checks of the dataviz validator —
lightness band, chroma floor, CVD separation, normal-vision floor and contrast
against `--chart-surface`:

| | ember (`--data-1`) | violet (`--data-2`) | teal (`--data-3`) |
|---|---|---|---|
| light | `#c2560a` | `#5b4bd6` | `#0e9bb0` |
| dark | `#d1731f` | `#6f5cd8` | `#2596ad` |

Re-run `scripts/validate_palette.js` from the **dataviz skill** before changing
any of them.

Rules that hold everywhere:

- **Hue is bound to the entity, never to draw order.** ISA is always ember,
  SIPP violet, GIA teal — so hiding an empty GIA never repaints the others.
  The account dots in `FireForm` use the same binding; keep them in step.
- **Status colour is reserved** (`--success` / `--danger`) for state, never for
  "series 4", and never carries meaning alone — name the states in a key.
- **Marks**: 2px strokes, 4px bar ends, 8px active dots with a 2px
  `--chart-surface` ring, recessive dashed grid, neutral milestone annotations.
- **A legend is always present for ≥2 series**; a single series is named by the
  caption instead. Text wears text tokens — never the series colour.
- Every time-series chart ships a dashed crosshair + tooltip.

## Voice

Sharp, plain-spoken, UK, evidence-first. Prefer "Know your number, know when,
know it'll hold" over "Plan your UK FIRE journey." Microcopy is calm and
specific; empty/disabled states explain _why_. Spend warmth in exactly one
place — the moment a plan succeeds ("You're financially independent"). Never
salesy.

## Layout & responsiveness

- The page body never scrolls horizontally. Check the narrow end (320/375px)
  with a plan in `localStorage` — the header's nav only appears once a plan
  exists, so an empty first visit hides whole classes of overflow.
- Header nav is inline from `sm` up and becomes a scrollable tab row beneath
  the bar below that (`Nav` / `MobileNav`).
- Long forms get a section rail (`FinancesNav`): sticky beside the content on
  `lg`, scrollable chips above it below.

## Print

The plan is a document people save as PDF. `@media print` forces the light
palette and drops the header/footer; anything that can't be operated on paper
carries `.no-print` — the setup checklist, chart tab switcher, money-frame
toggle, edit links and the empty AI-tips prompt. Generated content (tips,
charts, figures) prints.

## Accessibility checklist (per screen)

- Interactive elements are real buttons/links with visible `:focus-visible` rings.
- Menus use the `Menu` primitive (keyboard + ARIA come for free).
- **Icon-only buttons carry an `aria-label`** naming what they act on, and the
  icon itself is `aria-hidden` — a page full of unlabelled info buttons all
  announce as "button".
- A control that changes its own label (Share → "Link copied") also announces
  through a live region; the swap alone isn't reliably read out.
- Toggles use `aria-pressed`; progress uses `aria-valuenow`.
- Motion respects `prefers-reduced-motion`.
- Check ember-on-night and `--danger` text contrast in both themes.
