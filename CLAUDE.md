# predicting-replica: agent rules

Interview-assignment replica of https://predicting.top. Not affiliated. Keep it that way:
the disclosure badge, `noindex`, and the data credit must never be removed.

## Verification rules
- Never report PASS/FAIL, "works" or "matches" without showing the command output that proves it.
- After any UI change run `npm run eval:visual` and `npm run eval:parity` against the dev server
  (`REPLICA_URL=http://localhost:5179`). Gates: visual ≥ 97% per case, parity 100% identical,
  and the negative control must FAIL.
- A perfect score is a hypothesis. Look at the screenshots or the diff before believing it.
- When a test disagrees with the code, read the reference behaviour (live site / compiled
  bundle) before editing either. Parity beats "nicer".
- Add every caught defect to `docs/BUG_LOG.md`: what was wrong, what caught it, the fix.

## Code rules
- Pure logic lives in `src/lib/*` and gets a unit test. Components stay thin.
- `server/proxy.ts` is the only data path (dev + prod). New upstream routes go in the
  allow-list with an explicit cache policy and a unit test.
- Do not change CSS layer order in `src/index.css` or the colour setup in
  `tailwind.config.js` without re-running the visual eval (see BUG-02, BUG-03).
- No analytics, no affiliate or referral params, no forwarding of form submissions.
