# Local Money Engine job bridge — proof and scope

Status: code **deployed and independently exercised on the HMD N159V Termux phone**, 2026-10-17. This is a LOCAL CLI action, **not** a Savage Router provider endpoint, HTTP service, remote execution socket, or always-running agent. It must be deliberately invoked via an already authorized command channel (e.g. Desktop Commander Remote).

## Owner and invariant

Code lives on phone at `~/.local/bin/savage-agent-job` and in this branch at `android/maintenance/savage-agent-job.py`. Does not alter the standalone `sa6ag9/savage-router` provider cascade. Money Engine code/data/results remain owned by that helper at `~/savage-money-engine`; this adapter writes only beneath `~/.local/state/savage-agent-jobs/<job-id>/`. No arbitrary shell, command strings, path inputs, model-initiated commands or outbound ports.

## Allowed command and usage

One allowlisted job, `money.compile_queue.v1`, which runs the pre-existing `compile_money_queue.py` with fixed inputs and `--out` set to the job's private output path. 45-second timeout. The CLI accepts only `run` and `status` with a bounded job ID.

```bash
python3 ~/.local/bin/savage-agent-job run --job-id integration-20261017-01
python3 ~/.local/bin/savage-agent-job status --job-id integration-20261017-01
```

A repeated `run` on an existing job ID returns the already-sealed result without rerunning. A missing job fails explicitly. Run output contains SHA-256 hashes, fixed output paths, exit code, bounded stdout and status. It does **not** expose sensitive source CSV rows or file contents to the shared agents channel.

This job adapter is NOT yet a network API, a model tool, or proof of secure multi-tenant authorization. The caller must already have user-approved command-level access to the phone, and ACLs on the device are only as strong as the local Termux UID.

## Evidence: live Android check

- Source executable SHA-256: `a144e41a18399b7fae9ff202c2cd5660e8b560fe89b874eae1271a01748cdb1c`.
- Python 3.14.6 compiled script with `python3 -m py_compile`.
- First run job ID `integration-20261017-01`: `status=succeeded`, `exit_code=0`. Fixed source compilation emitted 10 audit rows and 12 mechanism rows. `earned_money_usd=0`, `successful_claims_observed=0`, no claimed current collectibility.
- Three output file hashes: audit summary `851d32dc04ee34d736a82fc3d715f268591259d7fa40cdfdad266588704d924d`, audit CSV `38e7922e0db3442df074d89c07f3bed07a18dac19af809d75bf8b22e3bbb9b4e`, mechanisms CSV `97b00cb2c394924d28209c377cfee6ed7655b8a3620f50cafd09055e63b5dccf`. These hashes happened to match the Money Engine's preexisting results because output is deterministic on the same input; original result paths were not overwritten, confirmed by pre/post digest comparison.
- Rerun with same job ID returned the same original `started_at_unix` (idempotency).
- Unrecognized/missing job status explicitly failed with status=error.
- Source/input SHA-256 is recorded and checked for midrun change on success.
- This was not a concurrent client load test, adversarial symlink attack test, Shizuku/ADB test, or independently verified user identity/access-control test. No external provider inference or paid compute involved.

## Next

1. Money Engine helper creates/verifies PRIVATE `sa6ag9/savage-money-engine` repository and commits reviewed non-sensitive source/tests; keep original phone data safely intact.
2. Money Engine helper acknowledges the handoff `savages-assistants/handoffs/SAVAGE-ROUTER-TO-CHATGPT-MONEY-ENGINE-20261017.md`.
3. Router helper strengthens fixed job status/schema/error validation and optionally provides an authenticated, deny-by-default transport only after a separate review. No arbitrary shell capability.
4. CI runs static checks and expected-error cases, **not** actual historical CSV dataset processing; do not conflate CI passing with live phone evidence.

Do not publish private claimant details, keys, phone SSH material or source datasets in the shared repository.
