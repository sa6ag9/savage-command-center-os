# Android workstation — verified device handoff (2026-10-17)

**Device:** HMD N159V, Android 14, arm64-v8a. **Control path:** Desktop Commander Remote through an existing Termux session (the registered device is named localhost). No device-wide root granted.

## Completed on the actual device

- With explicit owner authorization, deleted only two exact FydeOS PC installation images in `/storage/emulated/0/Download`, each 2,548,445,216 bytes; checked file size and ZIP signature before `rm`, then verified both absent. `df -h` changed from 7.4G free (86% used) to 12G free (77% used), rounded system units. Earlier in the session 3.2G free (94% used) was observed, and other user cleanup preceded this deletion.
- `/proc/meminfo` on device: MemTotal 2,721,024 kB (~2.6 GiB), MemAvailable 612,148 kB (~598 MiB), SwapTotal 3,145,724 kB (~3.0 GiB), SwapFree 1,981,744 kB at observation. A single snapshot is **not** proof of keyboard crashes, but this is a resource-constrained device.
- Identified `com.google.android.inputmethod.latin` (Gboard) among installed keyboard packages. Ordinary Termux `settings get secure default_input_method` failed with Android user-permission denial, so **active keyboard and crashes are not verified**. Do not disable Gboard or accessibility packages.
- Identified original, duplicate Shizuku app terminal exports: `Downloads/6/rish` and `rish_shizuku.dex` (matching hashes in `Downloads/6/Savdownloads`). Copied only exported bytes to `$HOME/.local/share/savage-shizuku`; permissions: rish=500, dex=400. Added `$HOME/.local/bin/savage-rish` (700). Shell launcher syntax test passed. `savage-rish -c id` failed with Shizuku request timeout, **no shell UID=2000 proof**. App must be started/authorized through its UI and tested again. No privileged Android changes performed.
- SSH binaries installed; Termux port 8022 was **not confirmed listening**; existing `~/.ssh/authorized_keys` present. No SSH listening port was opened or externally exposed.
- Wrote and started `$HOME/.local/bin/savage-remote-guard`: a 45-second low-RAM Bash watchdog that holds a file lock, observes the current cached Desktop Commander runner, and only launches it when absent; no npm update/download, no model invocation. First observation: watchdog PID 9270, ~3–4 MB RSS, one existing remote runner. Guard start/idle tested; deliberate crash/restart **not** tested because it risks losing the live command channel. Stop with `touch ~/.local/state/savage-remote/stop` (checks at next 45-second cycle); remove stop flag to allow a newly started supervisor. If the entire Termux app is killed, the guard cannot recover itself. Termux:Boot was not confirmed installed.

## Preserved invariants / blockers

- Standalone Savage Router remains unchanged, with no Muse dependency and no new provider secrets. Savage Agent Console unchanged. No system packages disabled, no Android accessibility or animation settings modified.
- Shizuku service currently unavailable to `rish`; user interaction with official Shizuku app may be required to start via Wireless debugging and grant Termux access. Do not attempt root or unrelated privileged commands.
- Gboard vanishing/keyboard latency still needs reliable Android-shell-level `dumpsys input_method`, memory-pressure and crash/ANR evidence after Shizuku works. Avoid fabricating root cause.
- Offload heavy web/IDE/model compute to a VM in future; phone should serve as voice-first terminal and control-plane device.

**CI:** dedicated opt-in Shizuku scripts and the lightweight remote guard are stored under `android/` in this PR; GitHub Actions must pass at the new head commit before merging. Device evidence is from live Remote Desktop Commander outputs in the conversation, not benchmark claims.
