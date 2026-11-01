# Optional Shizuku bridge for Termux (Android)

**Status:** prepared and shell-syntax checked; NOT installed or verified on phone. No source changes to Savage Router or Console.

This addition uses the official Shizuku app's own exported `rish` and `rish_shizuku.dex` files; no curl-to-shell installer, rooting, account tokens, or automatic privileged actions.

1. Start installed Shizuku from its app via Android Wireless debugging, and pair it there if required. Re-start after reboot (Android restriction).
2. Open Shizuku -> **Use Shizuku in terminal apps** -> **Export files**. Export both files to `/storage/emulated/0/Download/Shizuku`.
3. In Termux run `bash install-exported-rish.sh /storage/emulated/0/Download/Shizuku`.
4. Test after permission/startup: `~/.local/bin/savage-rish -c 'id'`. Expected ADB **shell** user (UID 2000), not root.

The installer places read-only DEX inside Termux private storage for Android 14+, checks the official exported script's structure, preserves existing versions, and creates the **opt-in** `savage-rish` command. It never enables wireless debugging, grants permissions, runs Shizuku, or changes Android settings.

**Security:** Do not expose `rish` to the Console's unauthenticated task endpoints or remotely accessible scripts. Keep Router/Console on loopback; no command executions without deliberate operator request.

Sources: https://shizuku.rikka.app/guide/setup/ and https://github.com/RikkaApps/Shizuku/blob/master/manager/src/main/assets/rish
