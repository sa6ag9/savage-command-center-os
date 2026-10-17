#!/data/data/com.termux/files/usr/bin/bash
# Read-only Android Shizuku integration status.
set -u
printf 'Android SDK: '
getprop ro.build.version.sdk 2>/dev/null || true
printf 'Android ABI: '
getprop ro.product.cpu.abi 2>/dev/null || true
printf 'Shizuku package: '
if /system/bin/pm path moe.shizuku.privileged.api 2>/dev/null | grep -q '^package:'; then
  echo 'installed'
else
  echo 'unknown (Termux package visibility may be restricted)'
fi
printf 'Private Shizuku export: '
if [[ -f "$HOME/.local/share/savage-shizuku/rish" && -f "$HOME/.local/share/savage-shizuku/rish_shizuku.dex" ]]; then
  echo present
else
  echo absent
fi
printf 'Opt-in launcher: '
if [[ -x "$HOME/.local/bin/savage-rish" ]]; then echo installed; else echo absent; fi
echo 'Service permission/startup status requires an explicit rish test after Shizuku is started.'
