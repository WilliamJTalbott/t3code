#!/usr/bin/env bash
# Install a built DMG over "T3 Code (Beta)": quit T3, swap the app, relaunch.
# Usage: maker/install.sh <dmg> [delay-seconds, default 30]
# Runs detached under launchd, so it survives T3 quitting. Run it last and
# finish your reply before the delay ends; T3 restarts and the thread resumes.
set -euo pipefail
dmg="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
delay="${2:-30}"
[[ -f "$dmg" ]] || { echo "error: no DMG at $dmg" >&2; exit 1; }

label="ws.maker.t3-install"
log="$HOME/Library/Logs/maker-t3-install.log"
job="$HOME/Library/Caches/maker-t3-install.sh"
cat > "$job" <<'JOB'
#!/bin/bash
set -u
dmg="$1"; delay="$2"; label="$3"; log="$4"
exec >>"$log" 2>&1
app="/Applications/T3 Code (Beta).app"
echo "=== $(date) installing $dmg"
sleep "$delay"
osascript -e 'tell application "T3 Code (Beta)" to quit' || true
for _ in $(seq 60); do pgrep -f "$app/Contents/MacOS/" >/dev/null || break; sleep 1; done
pkill -f "$app/Contents/MacOS/" || true
mount="$(mktemp -d)"
if hdiutil attach -quiet -nobrowse -readonly -mountpoint "$mount" "$dmg"; then
  new="$(ls -d "$mount"/*.app | head -1)"
  rm -rf "$app.old"
  mv "$app" "$app.old" && ditto "$new" "$app" && rm -rf "$app.old" || {
    echo "install failed; restoring the previous app"
    rm -rf "$app"; mv "$app.old" "$app"
  }
  hdiutil detach -quiet "$mount" || true
else
  echo "could not mount $dmg"
fi
open "$app"
echo "=== $(date) done: $(defaults read "$app/Contents/Info" CFBundleShortVersionString)"
launchctl remove "$label"
JOB
launchctl remove "$label" 2>/dev/null || true
launchctl submit -l "$label" -- /bin/bash "$job" "$dmg" "$delay" "$label" "$log"
echo "T3 will quit and restart with the new build in ${delay}s (log: $log)"
