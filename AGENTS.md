<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Working in this repo

## Spec-driven development with OpenSpec — this is the default workflow

This project uses **[OpenSpec](https://github.com/Fission-AI/OpenSpec)**. Specs
are the source of truth for intended behaviour; code is how it is met. Treat the
loop below as the normal way work happens here, not an optional extra.

**For any change beyond a trivial fix:**

1. **Propose before building.** `/opsx:propose "<what you want>"` — this writes a
   change under `openspec/changes/<name>/` with a proposal, a design and tasks,
   plus delta specs describing how the capability's behaviour changes. Show the
   proposal and get agreement before writing code.
2. **Implement against it.** `/opsx:apply` works the tasks in order.
3. **Archive when done.** `/opsx:archive` folds the delta specs into
   `openspec/specs/` and retires the change.

Step 3 is the point of the whole thing. This repo's documentation rotted badly
once — three different test counts across three files, a doc that still said
"designed, not yet built" for a shipped feature, and a handoff that contradicted
itself on whether account deletion existed. That happened because nothing said
*when* a document was supposed to change. Archiving a change is that moment.
Skipping it puts the specs straight back on the road to being confidently wrong.

**A trivial fix** — a typo, a one-line bug, a dependency bump — does not need a
change proposal. If it alters what the app *does*, it does.

**Specs are current-state, not history.** `openspec/specs/<capability>/spec.md`
describes how the app behaves *now*. Never write "we used to…" into a spec; that
belongs in the change that made it so, and after that in git.

`openspec/specs/fire-engine/spec.md` is the baseline, derived from behaviour
already pinned by tests. Other capabilities are not specced yet — add them as
changes touch them, rather than in one speculative sweep, because a wrong spec
is worse than a missing one.

Useful commands: `openspec list`, `openspec list --specs`, `openspec show <spec>`,
`openspec validate --specs`, `openspec view`.

## Documentation

**[`docs/README.md`](docs/README.md) is the index.** It says which document is
authoritative and carries a Status line (Current / Design / Archive) for each.
`docs/HANDOFF-FIREWORKS.md` is the source of truth for project state; where any
other document disagrees, it wins.

Rules that keep it honest:

- A doc marked **Current** must be updated in the same commit that changes the
  behaviour it describes.
- Never update a doc marked **Archive**. Fix the current one instead.
- Prefer describing the shape of things over quoting counts. Test counts and
  bundle sizes are the first facts to rot.
- `docs/ARCHITECTURE.md` and `app/methodology/page.tsx` explain the same engine
  to different audiences. An engine change lands in both.

## Quality gate

Green on **every** commit, no exceptions:

```bash
npm test && npx tsc --noEmit && npx eslint . && npm run build
```

CI runs the same four (it uses `npm run lint`).

## Conventions

- **One logical change = one commit.**
- **Verify in the browser, both themes, at mobile width** before saying
  something works. This codebase has a documented history of bugs that were
  invisible until measured — see §8 of the handoff.
- **Verify UK tax figures against real 2026/27 guidance.** Never invent numbers.
- **Never rename the identifiers in §3 of the handoff.** They are keys into data
  that already exists; `lib/identifiers.test.ts` fails CI if you try.
- **Never commit secrets.**
