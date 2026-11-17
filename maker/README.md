# Maker fork

Local patches on top of the latest stable T3 Code release. Never sent upstream.

- `maker/patches`: the patch branches, in order. `chore/maker` (this folder
  and `mise.toml`) is always last and only adds files.
- `maker/update.sh`: rebases each patch branch onto the latest stable tag,
  rebuilds `maker`, pushes to `origin`, builds an arm64 DMG into
  `release/maker/`. Stops with exit 2 if a patch no longer applies.
- `maker/install.sh <dmg>`: quits T3, swaps the app, relaunches, detached
  under launchd so it survives T3 quitting.
- Run daily by the `t3-fork-update` schedule (dotfiles `schedules/`).
- Auto-update is off via `/Library/Application Support/T3Code/policy.json`.
