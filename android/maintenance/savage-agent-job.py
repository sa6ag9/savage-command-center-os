#!/data/data/com.termux/files/usr/bin/python3
"""Fixed-command, local-only Money Engine job adapter; NEVER a remote shell API."""
import argparse
import csv
import fcntl
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import time

SRC = Path.home() / "savage-money-engine"
STATE = Path.home() / ".local/state/savage-agent-jobs"
SOURCE_FILES = ("compile_money_queue.py",
                "data/verified_public_business_checks.csv",
                "data/cross_mechanism_pilot_12.csv")
OUTPUT_FILES = ("audit_summary.json", "ten_case_status_audit.csv",
                "twelve_mechanism_research.csv")
SCHEMA = "savage.local.job.v1"


def digest(path):
    value = hashlib.sha256()
    with path.open("rb") as fd:
        for chunk in iter(lambda: fd.read(65536), b""):
            value.update(chunk)
    return value.hexdigest()


def snapshot(paths):
    return {str(rel): digest(path) for rel, path in paths.items()}


def get_manifest(job):
    target = STATE / job / "manifest.json"
    if not target.is_file() or target.is_symlink():
        raise ValueError("job not found or interrupted before manifest was sealed")
    return json.loads(target.read_text())


def run(job):
    STATE.mkdir(parents=True, exist_ok=True, mode=0o700)
    with (STATE / ".lock").open("a+") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        root = STATE / job
        if root.exists():
            return get_manifest(job)  # completed jobs are never repeated
        inputs = {rel: SRC / rel for rel in SOURCE_FILES}
        for rel, path in inputs.items():
            if not path.is_file() or path.is_symlink():
                raise ValueError("required input missing or symlinked: " + rel)
        before = snapshot(inputs)
        root.mkdir(mode=0o700)
        output = root / "output"
        output.mkdir(mode=0o700)
        start = time.time()
        code = None
        error = None
        status = "failed"
        log = ""
        truncated = False
        try:
            proc = subprocess.run(
                [sys.executable, str(inputs["compile_money_queue.py"]),
                 "--out", str(output)],
                cwd=str(SRC),
                env={"PATH": os.environ.get("PATH", ""), "HOME": str(Path.home()),
                     "LANG": "C.UTF-8", "PYTHONDONTWRITEBYTECODE": "1"},
                timeout=45, stdin=subprocess.DEVNULL,
                capture_output=True, text=True, check=False,
            )
            code = proc.returncode
            truncated = len(proc.stdout) > 1000 or len(proc.stderr) > 1000
            log = proc.stdout[:1000] if code == 0 else ""
            if code != 0:
                error = "compiler_nonzero_exit"
            else:
                if snapshot(inputs) != before:
                    raise ValueError("source inputs changed during job")
                files = {rel: output / rel for rel in OUTPUT_FILES}
                for rel, path in files.items():
                    if not path.is_file() or path.is_symlink():
                        raise ValueError("missing output " + rel)
                summary = json.loads(files["audit_summary.json"].read_text())
                with files["ten_case_status_audit.csv"].open(newline="") as fd:
                    audit_rows = list(csv.DictReader(fd))
                with files["twelve_mechanism_research.csv"].open(newline="") as fd:
                    mechanism_rows = list(csv.DictReader(fd))
                if (len(audit_rows) != 10 or len(mechanism_rows) != 12
                    or summary.get("earned_money_usd") != 0
                    or summary.get("successful_claims_observed") != 0
                    or any(str(r.get("actual_revenue_usd")) not in ("0", "0.0", "0.00")
                           for r in audit_rows)
                    or any(str(r.get("actual_income_usd")) not in ("0", "0.0", "0.00")
                           for r in mechanism_rows)):
                    raise ValueError("expected count and zero-revenue controls failed")
                status = "succeeded"
        except subprocess.TimeoutExpired:
            error = "timeout_45s"
        except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
            error = "validation_" + type(exc).__name__
        out_hashes = {}
        out_paths = {}
        for rel in OUTPUT_FILES:
            path = output / rel
            if path.is_file() and not path.is_symlink():
                out_hashes[rel] = digest(path)
                out_paths[rel] = str(path)
        sealed = {
            "schema_version": SCHEMA, "job_id": job, "agent_id": "money-engine",
            "project": "savage-money-engine", "job_type": "money.compile_queue.v1",
            "status": status, "started_at_unix": start,
            "finished_at_unix": time.time(), "exit_code": code,
            "input_sha256": before, "output_sha256": out_hashes,
            "output_paths": out_paths, "bounded_stdout": log,
            "logs_truncated": truncated, "error": error,
            "working_directory": str(SRC), "network_port_opened": False
        }
        target = root / "manifest.json"
        temp = root / "manifest.tmp"
        temp.write_text(json.dumps(sealed, sort_keys=True, indent=2) + "\n")
        temp.chmod(0o600)
        temp.replace(target)
        return sealed


def main():
    os.umask(0o077)
    ap = argparse.ArgumentParser(description="Local allowlisted Money Engine compiler")
    ap.add_argument("action", choices=("run", "status"))
    ap.add_argument("--job-id", required=True)
    args = ap.parse_args()
    if not re.fullmatch(r"[A-Za-z0-9][A-Za-z0-9_.-]{0,63}", args.job_id):
        ap.error("invalid job id")
    try:
        result = run(args.job_id) if args.action == "run" else get_manifest(args.job_id)
    except (ValueError, OSError) as exc:
        print(json.dumps({"status": "error", "job_id": args.job_id,
                          "error": str(exc)[:200]}))
        return 2
    print(json.dumps(result, sort_keys=True))
    return 0 if result["status"] == "succeeded" else 3


if __name__ == "__main__":
    raise SystemExit(main())