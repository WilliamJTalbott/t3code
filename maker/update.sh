#!/usr/bin/env bash
# Rebase the patch branches onto the latest stable release and build the app.
# Usage: maker/update.sh [--force]   (--force rebuilds even when up to date)
# Prints "up-to-date", or the path of the built DMG on its last line.
# Never installs: run maker/install.sh <dmg> for that, as the very last step.
set -euo pipefail

# The checkout changes under us; run from a copy.
if [[ -z "${MAKER_COPY:-}" ]]; then
  copy="$(mktemp -t maker-update).sh"
  cp "$0" "$copy"
  MAKER_COPY=1 MAKER_REPO="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)" exec bash "$copy" "$@"
fi
cd "$MAKER_REPO"

force=false
[[ "${1:-}" == "--force" ]] && force=true
app="/Applications/T3 Code (Beta).app"
stable='^v[0-9]+\.[0-9]+\.[0-9]+$'

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "error: uncommitted changes in $MAKER_REPO; commit or stash them first" >&2
  exit 1
fi
start_branch="$(git branch --show-current)"

git fetch --quiet upstream --tags
git fetch --quiet origin
latest="$(git tag -l 'v*' | grep -E "$stable" | sort -V | tail -1)"
installed="$(defaults read "$app/Contents/Info" CFBundleShortVersionString 2>/dev/null || echo none)"
# The own build is ad-hoc signed; an official build (Team ID) means it was replaced.
own=false
codesign -dv "$app" 2>&1 | grep -q '^Signature=adhoc' && own=true
echo "latest stable: $latest; installed: $installed (own build: $own)"
if [[ "v$installed" == "$latest" ]] && $own && ! $force; then
  echo "up-to-date"
  exit 0
fi

branches=()
while read -r line; do
  [[ -z "$line" || "$line" == \#* ]] && continue
  branches+=("$line")
done < <(git show chore/maker:maker/patches)
branches+=(chore/maker)

# Rebase each patch branch from the stable tag it sits on to the latest.
for branch in "${branches[@]}"; do
  base="$(git describe --tags --abbrev=0 --match 'v[0-9]*' --exclude '*-*' "$branch")"
  if [[ "$base" == "$latest" ]]; then
    echo "$branch: already on $latest"
    continue
  fi
  echo "$branch: $base -> $latest"
  if ! git rebase --quiet --onto "$latest" "$base" "$branch"; then
    git rebase --abort
    git checkout --quiet "$start_branch"
    echo "error: $branch no longer applies on $latest; fix it by hand" >&2
    exit 2
  fi
done

# maker = latest + every patch, in order.
git checkout --quiet -B maker "$latest"
for branch in "${branches[@]}"; do
  if ! git cherry-pick "$latest..$branch" >/dev/null; then
    git cherry-pick --abort
    git checkout --quiet "$start_branch"
    echo "error: $branch conflicts with an earlier patch on $latest" >&2
    exit 2
  fi
done
git push --quiet --force-with-lease origin "${branches[@]}" maker

pnpm install --frozen-lockfile --silent
out="$MAKER_REPO/release/maker"
rm -rf "$out"
T3CODE_DESKTOP_OUTPUT_DIR="$out" T3CODE_DESKTOP_VERSION="${latest#v}" \
  node scripts/build-desktop-artifact.ts --platform mac --target dmg --arch arm64
git checkout --quiet "$start_branch"
dmg="$(ls "$out"/*.dmg | head -1)"
echo "built: ${latest} + ${branches[*]}"
echo "$dmg"
