# savage-command-center-os — Ground Truth

**Last verified:** 2026-11-03 (Tonight Sprint merge train — Tights first-hand local verification: diff read in full, suite run on exact PR head + baseline control, post-merge tree proof; no deployed-runtime validation)
**Canonical branch:** master @ 5f9050e0b5955afd985a32d76b2600b3e4b00fd2

## What this repo is

The implemented operator/UI donor for Savage Command Center — a
personal command-center PWA (self-use). Distinct from
**Savage-Command-Center**, the specification/document donor. This
repo also carries a `main` branch; the default/canonical branch is
`master`.

## Verified current state

- **Head (master):** `5f9050e0b5955afd985a32d76b2600b3e4b00fd2` — squash merge of PR #28. Tree = 80 blobs. PR #26 was merged earlier at `e30a0625db`.
- **Tests (Tights local run, 2026-11-03, dependencies installed):** **PR #28 head: 66/66 pass, 0 fail, 0 skip; baseline control on `f4a12a1b`: 59/59 pass.** Prior: master GitHub Actions #41406083656 measured 59/59. No compile step; `node --check` gates.
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

## Merged in the 2026-11-03 Tonight Sprint train

- **#28** — squash-merged into `master` at `5f9050e0b5955afd985a32d76b2600b3e4b00fd2` (tree proof: PR paths blob-identical post-merge, 77 → 80 blobs, no other path changed). Independent server-only bearer authorization now required for `POST /api/decisions` and `PUT /api/organism-status` on canonical `master`, closing the source-confirmed unauthenticated mutation risk. Local loopback tests are not external Supabase acceptance: protected server-side `COMMAND_CENTER_WRITE_TOKEN` provisioning, Supabase RLS, and deployed-runtime verification remain mandatory before deployment. See `docs/WRITE_AUTH_BOUNDARY.md`.

## Known defects / honest gaps

- Self-use only today: 1 product ON (personal command-center PWA).
  The audit's named route to a sellable console (wire the UI to the
  real connection testers — done in part by #26 — move credentials
  server-side, auth the API handlers) is days–weeks of work and is
  not finished.
- Deployed-runtime behaviour of either branch is not verified in
  this pass.
- The separately mounted `/api/social` router still has unauthenticated mutation routes on master and needs its distinct authorization/session repair (draft #30, under verification in this train).

## Where it is going

No direction ruled by Savage for this repo.

## Estate rule

Update this file after any significant repo change. No claims without verification.
