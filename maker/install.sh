#!/usr/bin/env bash
# Install a built app over T3: quit T3, swap the app, relaunch.
# Usage: maker/install.sh <dmg|AppImage> [delay-seconds, default 30]
# Runs detached, so it survives T3 quitting. Run it last and finish your
# reply before the delay ends; T3 restarts and the thread resumes.
set -euo pipefail
case "$(uname -s)" in
  Darwin) exec "$(dirname "$0")/install-mac.sh" "$@" ;;
  Linux) exec "$(dirname "$0")/install-linux.sh" "$@" ;;
  *) echo "error: unsupported OS $(uname -s)" >&2; exit 1 ;;
esac
