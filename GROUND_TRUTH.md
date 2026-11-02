# savage-command-center-os — Ground Truth

**Last verified:** 2026-11-01 (live API state; audit evidence 2026-10-29; merge-train evidence 2026-11-01)
**Canonical branch:** master @ e30a0625db

## What this repo is

The implemented operator/UI donor for Savage Command Center — a
personal command-center PWA (self-use). Distinct from
**Savage-Command-Center**, the specification/document donor. This
repo also carries a `main` branch; the default/canonical branch is
`master`.

## Verified current state

- **Head (master):** `e30a0625db` — the merge of PR #26. Tree = 77 blobs.
- **Tests (audit-run, Lane D, at its frozen head):** **55/55 pass
  with dependencies installed** (22/25 without — the missing `ws`
  module). No compile step; `node --check` gates.
- **Security posture changed on master by PR #26** (Phase 2 Prompt
  6, diff read in full by the train): simulated connections ended,
  cached plaintext credentials removed from localStorage, CORS
  allowlist replacing `*`, fail-closed credential testers, no
  upstream error leakage. Those were exactly the audit's three
  findings against the pre-fix code (simulated connect, plaintext
  localStorage credentials, unauthenticated wildcard-CORS write
  proxies).

## Correction to the prior version of this file

The 2026-09-17 version's detailed state section described the
**working branch** `feature/savage-social-control-plane` — the
social control plane, its OAuth flows, its auto-seeded first-wave
briefs — as this repo's current state. Those claims describe that
branch, were not verified on `master` by the audit or this pass,
and are **not carried as current state**. Its cited slate
verification also pointed at a `savagnic/` path; the savagnic org
shows 0 repositories to the estate's token, so that citation is
unverifiable from here.

## Merged in the 2026-11-01 train

- **#26** — into `master` (Prompt 6, above). Tree 75 → 77.
- **#24** — into the `main` branch (Android opt-in Shizuku shell
  bridge for Termux + remote-guard watchdog + handoff doc; opt-in
  only, CI green, diff read in full). Main branch tree 42 → 48.

## Parked PRs

None — no open PRs on either branch.

## Known defects / honest gaps

- Self-use only today: 1 product ON (personal command-center PWA).
  The audit's named route to a sellable console (wire the UI to the
  real connection testers — done in part by #26 — move credentials
  server-side, auth the API handlers) is days–weeks of work and is
  not finished.
- Deployed-runtime behaviour of either branch is not verified in
  this pass.

## Where it is going

No direction ruled by Savage for this repo.

## Estate rule

Update this file after any significant repo change. No claims without verification.
