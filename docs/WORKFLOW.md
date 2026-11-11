# Skills and AI workflow used to build this replica

Built with **Claude Code** (agentic CLI) as the main driver. AI wrote the code; my job was to
direct the work, define how "correct" gets measured, and refuse to accept any claim that
nothing had checked.

## Pipeline
1. **Spec from the source, not from screenshots.** The agent read the live DOM, the compiled
   CSS and the JS chunks of predicting.top (prettified) to extract exact behaviour: filter
   rules, sort semantics, number formats, colour thresholds, layer order and API shapes.
   Screenshots alone would have missed things like `$-42.50` or the opacity classes that
   compile to nothing.
2. **Same stack as the reference** (Vite + React + Tailwind 3 tokens + TanStack Query +
   wouter + recharts), so the same classes produce the same pixels.
3. **Pure logic first** (`src/lib/*`: format, leaderboard, history, links, submit), kept
   separate from the UI so it can be unit-tested.
4. **One data path for dev and prod:** `server/proxy.ts` is used by both the Vite middleware
   and the Vercel function, so evals against localhost test the same code that ships.
5. **Evals before "done":** visual diff with a negative control, functional parity,
   ground-truth data checks and unit tests. No step was called finished until its eval passed.
   See `docs/EVALS.md`.
6. **Bug log as a by-product:** every failure was triaged as one of: code wrong, test wrong,
   or harness wrong. See `docs/BUG_LOG.md`.

## Tools
- Claude Code: agent, file edits, shell, and a built-in browser for live inspection.
- Rules file: `CLAUDE.md` (verification rules the agent must follow in this repo).
- Playwright 1.64 + pixelmatch: visual and functional parity against the live site.
- Vitest: unit tests. ESLint + `tsc -b`: static gates.
- Vercel: hosting plus a serverless function for `/api/*`.

## Rules I hold the agent to (also in CLAUDE.md)
- No PASS/FAIL claim without the command output that shows it.
- A 100% score gets a negative control before it is believed.
- When a test fails, check the reference before changing the code *or* the test.
- Intentional differences are listed and never presented as parity.
