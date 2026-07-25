# Fireworks design system — "Night & Ember"

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
  Dark (a deep-indigo night sky) is the default theme; light is a warm paper.
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

**Also part of the system** (defined near their first use, reused widely):
`Field` + `NumberInput` (`components/FireForm.tsx`), `StatTile` + `Segmented`
(`components/FireDashboard.tsx`), `Chip` + `ProgressBar` + `useCountUp`
(`components/quiz/QuizPrimitives.tsx`).

## Data-viz

Charts are part of the brand, not an afterthought. The launch-trail arc is the
house style for growth lines: an ember path with a warm, "arriving" endpoint, a
soft gradient area fill, and a faint grid. Ember (`--data-1`) is your path;
violet (`--data-2`) and teal (`--data-3`) carry comparisons and guardrails.
Semantic colour (`--success` green / `--danger` rose) is kept separate from the
ember accent. Build the full system with the **dataviz skill**.

## Voice

Sharp, plain-spoken, UK, evidence-first. Prefer "Know your number, know when,
know it'll hold" over "Plan your UK FIRE journey." Microcopy is calm and
specific; empty/disabled states explain _why_. Spend warmth in exactly one
place — the moment a plan succeeds ("You're financially independent"). Never
salesy.

## Accessibility checklist (per screen)

- Interactive elements are real buttons/links with visible `:focus-visible` rings.
- Menus use the `Menu` primitive (keyboard + ARIA come for free).
- Toggles use `aria-pressed`; progress uses `aria-valuenow`.
- Motion respects `prefers-reduced-motion`.
- Check ember-on-night and `--danger` text contrast in both themes.
