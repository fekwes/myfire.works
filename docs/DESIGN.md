# OnFIRE design system — "Ink & Lime"

The visual language and the primitives that implement it. The goal is a product
that reads as **precise, trustworthy and made with care** — which is what both
the UK FIRE audience (analytical, evidence-driven, allergic to marketing fluff)
and a recruiter looking at a portfolio piece actually reward. It is deliberately
_not_ the generic emerald/purple-gradient "AI SaaS" look.

## Principles

1. **Lead with the number.** Every screen answers its main question first (the
   verdict, the FIRE number), then progressively discloses detail. (Fintech
   "one number, then depth" pattern.)
2. **Intentional hierarchy, not uniformity.** Identical padding / radius / card
   heights everywhere is the #1 "AI-made" tell. Vary padding, weight and
   elevation _by role_ — a north-star card is `lg`, a stat tile is `sm`.
3. **Purposeful motion.** Shared easing/duration tokens; hover and press states
   that mean something; one considered reveal, not a fade on everything. All of
   it behind `prefers-reduced-motion`.
4. **Plain, confident, UK voice.** Say the true thing simply. The "not advice"
   honesty is a trust feature, not fine print.
5. **Accessible by construction.** Menus follow the WAI-ARIA pattern; everything
   interactive has a visible focus ring.

## Tokens (`app/globals.css`)

- **Colour** (semantic, theme-aware): `--background`, `--foreground`, `--surface`,
  `--surface-muted`, `--border`, `--primary` (deep/electric lime), `--brand`
  (bright lime fill), `--accent` (blue), `--muted-foreground`, `--success`,
  `--danger`, and a `--data-1/2/3` chart ramp. Exposed to Tailwind via
  `@theme inline` as `bg-surface`, `text-muted-foreground`, etc.
- **Type**: Bricolage Grotesque (`font-display`) for headings, Geist
  (`font-sans`) for body, Geist Mono (`font-mono`) for micro-labels.
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

## Voice

Sharp, plain-spoken, UK, evidence-first. Prefer "Know your number, then quit on
your terms" over "Plan your UK FIRE journey." Microcopy is calm and specific;
empty/disabled states explain _why_. Never salesy.

## Accessibility checklist (per screen)

- Interactive elements are real buttons/links with visible `:focus-visible` rings.
- Menus use the `Menu` primitive (keyboard + ARIA come for free).
- Toggles use `aria-pressed`; progress uses `aria-valuenow`.
- Motion respects `prefers-reduced-motion`.
- Check lime-on-ink and `--danger` text contrast in both themes.
