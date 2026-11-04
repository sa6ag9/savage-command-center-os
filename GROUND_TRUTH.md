# savage-command-center-os — Ground Truth

**Last verified:** 2026-11-02 (live canonical master and review-only PR #28; no deployed-runtime validation)
**Canonical branch:** master @ f4a12a1b141a27b83df857c95fc5dfa09f6ccd8f

## What this repo is

The implemented operator/UI donor for Savage Command Center — a
personal command-center PWA (self-use). Distinct from
**Savage-Command-Center**, the specification/document donor. This
repo also carries a `main` branch; the default/canonical branch is
`master`.

## Verified current state

- **Head (master):** `f4a12a1b141a27b83df857c95fc5dfa09f6ccd8f`. PR #26 was merged earlier at `e30a0625db`.
- **Tests (master GitHub Actions #41406083656, raw job #125148301192):** **59/59 pass, 0 fail, 0 skip**. Prior audit Lane D measured 55/55 with dependencies installed. No compile step; `node --check` gates.
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

## Open review-only draft (NOT merged or deployed)

- **#28** on `gpt/write-auth-boundary-20261102` proposes independent server-only bearer authorization for `POST /api/decisions` and `PUT /api/organism-status`. This fixes a source-confirmed unauthenticated mutation risk, but the fix is NOT on canonical `master`. Exact PR CI and its raw logs must be inspected separately; local loopback tests are not external Supabase acceptance. Protected server-side `COMMAND_CENTER_WRITE_TOKEN`, Supabase RLS, and deployed-runtime verification remain mandatory. See `docs/WRITE_AUTH_BOUNDARY.md`.

## Known defects / honest gaps

- Self-use only today: 1 product ON (personal command-center PWA).
  The audit's named route to a sellable console (wire the UI to the
  real connection testers — done in part by #26 — move credentials
  server-side, auth the API handlers) is days–weeks of work and is
  not finished.
- Deployed-runtime behaviour of either branch is not verified in
  this pass.
- On canonical master, `POST /api/decisions` and `PUT /api/organism-status` still lack bearer authentication; draft #28 proposes the fail-closed fix. The separately mounted `/api/social` router still has unauthenticated mutation routes and needs a distinct authorization/session repair.

## Where it is going

No direction ruled by Savage for this repo.

## Estate rule

Update this file after any significant repo change. No claims without verification.
