#!/usr/bin/env bash
# Install a built DMG over "T3 Code (Beta)": quit T3, swap the app, relaunch.
# Usage: maker/install.sh <dmg> [delay-seconds, default 30]
# Swaps the app in the foreground, then restarts T3 from a detached launchd job
# so the restart survives T3 quitting. Run it last and finish your reply before
# the delay ends; T3 restarts and the thread resumes.
set -euo pipefail
dmg="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
delay="${2:-30}"
[[ -f "$dmg" ]] || { echo "error: no DMG at $dmg" >&2; exit 1; }
tree="$(cat "$(dirname "$dmg")/MAKER_TREE" 2>/dev/null || echo none)"

label="ws.maker.t3-install"
log="$HOME/Library/Logs/maker-t3-install.log"
job="$HOME/Library/Caches/maker-t3-install.sh"
app="/Applications/T3 Code (Beta).app"
exec > >(tee -a "$log") 2>&1
echo "=== $(date) installing $dmg"

# Swap the app here, in the caller: macOS App Management lets the terminal or
# agent that runs this write to /Applications, but not a detached launchd job.
# A running app keeps working after its bundle is moved aside.
mount="$(mktemp -d)"
hdiutil attach -quiet -nobrowse -readonly -mountpoint "$mount" "$dmg" || { echo "could not mount $dmg"; exit 1; }
new="$(ls -d "$mount"/*.app | head -1)"
rm -rf "$app.new" "$app.old"
if ! ditto "$new" "$app.new"; then
  rm -rf "$app.new"; hdiutil detach -quiet "$mount" || true
  echo "install failed: could not copy the new app; nothing changed"; exit 1
fi
hdiutil detach -quiet "$mount" || true
mv "$app" "$app.old"
if ! mv "$app.new" "$app"; then
  mv "$app.old" "$app"; echo "install failed: could not move the new app in; nothing changed"; exit 1
fi
/System/Library/Frameworks/CoreServices.framework/Frameworks/LaunchServices.framework/Support/lsregister -f "$app" || true
mkdir -p "$HOME/.local/state/t3code-maker" && echo "$tree" > "$HOME/.local/state/t3code-maker/tree"
echo "swapped in $(defaults read "$app/Contents/Info" CFBundleShortVersionString); old app kept at $app.old until the next install"

# Detached restart only: quit the old process, open the new app.
cat > "$job" <<'JOB'
#!/bin/bash
set -u
delay="$1"; label="$2"; log="$3"
exec >>"$log" 2>&1
app="/Applications/T3 Code (Beta).app"
sleep "$delay"
osascript -e 'tell application "T3 Code (Beta)" to quit' || true
for _ in $(seq 60); do pgrep -f "/T3 Code \(Beta\)\.app[^/]*/Contents/MacOS/" >/dev/null || break; sleep 1; done
pkill -f "/T3 Code \(Beta\)\.app[^/]*/Contents/MacOS/" || true
open "$app"
echo "=== $(date) restarted: $(defaults read "$app/Contents/Info" CFBundleShortVersionString)"
launchctl remove "$label"
JOB
launchctl remove "$label" 2>/dev/null || true
launchctl submit -l "$label" -- /bin/bash "$job" "$delay" "$label" "$log"
echo "T3 will quit and restart on the new build in ${delay}s (log: $log)"
