#!/usr/bin/env bash
# Linux half of maker/install.sh: unpack an AppImage into
# ~/.local/opt/t3code-maker, quit T3, swap it in, relaunch. No sudo.
# Runs detached as a transient systemd user unit, so it survives T3 quitting.
set -euo pipefail
img="$(cd "$(dirname "$1")" && pwd)/$(basename "$1")"
delay="${2:-30}"
[[ -f "$img" ]] || { echo "error: no AppImage at $img" >&2; exit 1; }
tree="$(cat "$(dirname "$img")/MAKER_TREE" 2>/dev/null || echo none)"

unit="maker-t3-install"
log="$HOME/.cache/maker/t3-install.log"
job="$HOME/.cache/maker/t3-install.sh"
mkdir -p "$(dirname "$job")"
cat > "$job" <<'JOB'
#!/bin/bash
set -u
img="$1"; delay="$2"; log="$3"; tree="$4"
exec >>"$log" 2>&1
app="$HOME/.local/opt/t3code-maker"
echo "=== $(date) installing $img"
sleep "$delay"

# Unpack first, so a bad image never takes the running app down.
mkdir -p "$HOME/.local/opt"
stage="$(mktemp -d "$HOME/.local/opt/.t3code-maker.XXXX")"
chmod +x "$img"
if ! (cd "$stage" && "$img" --appimage-extract >/dev/null); then
  echo "could not unpack $img"; rm -rf "$stage"; exit 1
fi
version="$(basename "$img" | grep -oE '[0-9]+\.[0-9]+\.[0-9]+' | head -1)"
echo "$version" > "$stage/squashfs-root/MAKER_VERSION"

# Quit T3 (the own build or the AUR one), then swap.
pkill -TERM -f -e '(t3code-maker|t3code-bin)/t3code' || true
for _ in $(seq 60); do pgrep -f '(t3code-maker|t3code-bin)/t3code' >/dev/null || break; sleep 1; done
pkill -KILL -f '(t3code-maker|t3code-bin)/t3code' || true
rm -rf "$app.old"
[[ -d "$app" ]] && mv "$app" "$app.old"
if mv "$stage/squashfs-root" "$app"; then
  rm -rf "$app.old" "$stage"
  mkdir -p "$HOME/.local/state/t3code-maker" && echo "$tree" > "$HOME/.local/state/t3code-maker/tree"
else
  echo "install failed; restoring the previous app"
  rm -rf "$app"; [[ -d "$app.old" ]] && mv "$app.old" "$app"; rm -rf "$stage"
fi

# Launcher, desktop entry and icons, all in the home folder.
mkdir -p "$HOME/.local/bin" "$HOME/.local/share/applications"
printf '#!/bin/sh\nexec "%s/AppRun" "$@"\n' "$app" > "$HOME/.local/bin/t3code"
chmod +x "$HOME/.local/bin/t3code"
cat > "$HOME/.local/share/applications/t3code.desktop" <<DESKTOP
[Desktop Entry]
Name=T3 Code
Comment=Desktop control surface for local coding agents
Exec=$HOME/.local/bin/t3code %U
Terminal=false
Type=Application
Icon=t3code
StartupWMClass=t3code
Categories=Development;
MimeType=x-scheme-handler/t3code;
DESKTOP
# Start at login. The PC logs in automatically, so this keeps T3 always on;
# the background service can't share ~/.t3 with the app, so it stays off.
mkdir -p "$HOME/.config/autostart"
cp "$HOME/.local/share/applications/t3code.desktop" "$HOME/.config/autostart/t3code.desktop"
if [[ -d "$app/usr/share/icons" ]]; then
  cp -r "$app/usr/share/icons/." "$HOME/.local/share/icons/"
fi
update-desktop-database -q "$HOME/.local/share/applications" 2>/dev/null || true

# Its own unit, so it outlives this job and gets the graphical session's env.
systemctl --user reset-failed app-t3code-maker 2>/dev/null || true
systemd-run --user --quiet --collect --unit app-t3code-maker --slice app-graphical.slice -- "$HOME/.local/bin/t3code"
echo "=== $(date) done: $(cat "$app/MAKER_VERSION")"
JOB
systemctl --user reset-failed "$unit" 2>/dev/null || true
systemd-run --user --quiet --unit "$unit" --collect -- /bin/bash "$job" "$img" "$delay" "$log" "$tree"
echo "T3 will quit and restart with the new build in ${delay}s (log: $log)"
