#!/data/data/com.termux/files/usr/bin/bash
# Savage phone: recover Desktop Commander only after its remote runner exits.
# No Shizuku escalation, updates, provider keys or extra background AI.
set -uo pipefail
umask 077
state="$HOME/.local/state/savage-remote"
mkdir -p "$state"
exec 9>"$state/guard.lock"
if ! flock -n 9; then
  echo "A Savage Remote guard is already running."
  exit 0
fi
printf '%s\n' "$$" > "$state/guard.pid"
trap 'rm -f "$state/guard.pid"' EXIT
log="$state/guard.log"
while :; do
  if [ -f "$state/stop" ]; then
    printf '%s supervisor stopped by operator flag\n' "$(date -Is)" >> "$log"
    exit 0
  fi
  if pgrep -f 'node .*/node_modules/\.bin/desktop-commander remote' >/dev/null 2>&1; then
    sleep 45
    continue
  fi
  runner=""
  for candidate in "$HOME"/.npm/_npx/*/node_modules/.bin/desktop-commander; do
    if [ -f "$candidate" ]; then runner="$candidate"; break; fi
  done
  if [ -z "$runner" ]; then
    printf '%s no cached remote executable found; no download attempted\n' "$(date -Is)" >> "$log"
    sleep 120
    continue
  fi
  if [ -f "$log" ] && [ "$(stat -c %s "$log")" -gt 131072 ]; then
    tail -c 65536 "$log" > "$state/guard.log.tmp" && mv "$state/guard.log.tmp" "$log"
  fi
  printf '%s remote absent: launching cached Desktop Commander\n' "$(date -Is)" >> "$log"
  node "$runner" remote >> "$log" 2>&1
  code="$?"
  printf '%s remote exited (code %s); retrying in 30 seconds\n' "$(date -Is)" "$code" >> "$log"
  sleep 30
done
