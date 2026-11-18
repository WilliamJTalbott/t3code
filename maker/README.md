# Maker fork

Local patches on top of the latest stable T3 Code release. Never sent upstream.

- `maker/patches`: the patch branches, in order. `chore/maker` (this folder
  and `mise.toml`) is always last and only adds files.
- `maker/update.sh`: on the Mac, rebases each patch branch onto the latest
  stable tag, rebuilds `maker`, pushes to `origin`, builds an arm64 DMG into
  `release/maker/`. Stops with exit 2 if a patch no longer applies. On Linux
  it only builds `origin/maker` as an x64 AppImage, and prints `waiting`
  (exit 3) until the Mac has moved `maker` to the latest tag.
- `maker/install.sh <dmg|AppImage>`: quits T3, swaps the app, relaunches,
  detached so it survives T3 quitting (launchd on the Mac, a systemd user unit
  on Linux). On Linux the app lives in `~/.local/opt/t3code-maker`, with
  `~/.local/bin/t3code` and a desktop entry; no sudo.
- `maker/public.env`: the T3 Connect client settings (Clerk key, relay URL)
  that upstream's release CI injects; without them the app can't sign in.
- Linux toolchain: `mise.local.toml` (untracked) pins node, pnpm and rust.
- Run daily by the `t3-fork-update` (Mac) and `t3-fork-update-pc` schedules
  (dotfiles `schedules/`).
- Auto-update is off via the managed policy file:
  `/Library/Application Support/T3Code/policy.json` on the Mac,
  `/etc/t3code/policy.json` on Linux.
