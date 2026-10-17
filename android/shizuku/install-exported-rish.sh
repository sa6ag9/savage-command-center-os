#!/data/data/com.termux/files/usr/bin/bash
# Optional Shizuku-exported rish bridge. No root, package installs or remote binds.
set -euo pipefail
umask 077
if [[ "${PREFIX:-}" != */com.termux/files/usr ]]; then
  echo "ERROR: Run within official Android Termux" >&2
  exit 2
fi
src="${1:-}"
if [[ -z "$src" ]]; then
  for d in /storage/emulated/0/Download/Shizuku /storage/emulated/0/Documents/Shizuku /storage/emulated/0/Shizuku; do
    if [[ -f "$d/rish" && -f "$d/rish_shizuku.dex" ]]; then src="$d"; break; fi
  done
fi
if [[ -z "$src" || ! -f "$src/rish" || ! -f "$src/rish_shizuku.dex" ]]; then
  echo "No official Shizuku export found. In Shizuku -> Use Shizuku in terminal apps -> Export files." >&2
  echo "Export rish and rish_shizuku.dex together to Download/Shizuku, then rerun." >&2
  exit 3
fi
if ! grep -q 'rikka.shizuku.shell.ShizukuShellLoader' "$src/rish" || \
   ! grep -q 'rish_shizuku.dex' "$src/rish" || \
   ! grep -q '/system/bin/app_process' "$src/rish"; then
  echo "ERROR: rish export fails official script-shape check" >&2
  exit 4
fi
if [[ ! -s "$src/rish_shizuku.dex" ]]; then
  echo "ERROR: Empty DEX" >&2
  exit 5
fi
base="$HOME/.local/share"
private="$base/savage-shizuku"
mkdir -p "$base" "$HOME/.local/bin"
if [[ -d "$private" ]]; then
  if ! cmp -s "$src/rish" "$private/rish" || ! cmp -s "$src/rish_shizuku.dex" "$private/rish_shizuku.dex"; then
    echo "Existing bridge differs; refusing to overwrite" >&2
    exit 6
  fi
  echo "Identical bridge already present."
else
  stage="$(mktemp -d "$base/.shizuku-stage.XXXXXXXX")"
  trap 'rm -rf "$stage"' EXIT
  install -m 500 "$src/rish" "$stage/rish"
  install -m 400 "$src/rish_shizuku.dex" "$stage/rish_shizuku.dex"
  mv "$stage" "$private"
  trap - EXIT
fi
wrapper="$HOME/.local/bin/savage-rish"
if [[ ! -e "$wrapper" ]]; then
  cat > "$wrapper" <<'WRAPPER'
#!/data/data/com.termux/files/usr/bin/bash
set -euo pipefail
export RISH_APPLICATION_ID=com.termux
exec "$HOME/.local/share/savage-shizuku/rish" "$@"
WRAPPER
  chmod 700 "$wrapper"
fi
echo "Bridge prepared. NO privileged operation performed."
echo "After Shizuku is running and authorized, test: $wrapper -c id"
echo "Expected Android shell user, not root."
