#!/usr/bin/env bash
# Rebase the patch branches onto the latest stable release and build the app.
# Usage: maker/update.sh [--force]   (--force rebuilds even when up to date)
# Prints "up-to-date", "waiting", or the path of the built app (DMG on the
# Mac, AppImage on Linux) on its last line.
# The Mac owns the rebase and pushes `maker`; Linux only builds origin/maker,
# and prints "waiting" (exit 3) until the Mac has moved it to the latest tag.
# Never installs: run maker/install.sh <dmg> for that, as the very last step.
set -euo pipefail

# The checkout changes under us; run from a copy.
if [[ -z "${MAKER_COPY:-}" ]]; then
  copy="$(mktemp "${TMPDIR:-/tmp}/maker-update.XXXXXX")"
  cp "$0" "$copy"
  MAKER_COPY=1 MAKER_REPO="$(git -C "$(dirname "$0")" rev-parse --show-toplevel)" exec bash "$copy" "$@"
fi
cd "$MAKER_REPO"
# T3 Connect settings the official release CI injects (maker/public.env).
public_env="$(git show chore/maker:maker/public.env)"
set -a; eval "$(grep -E '^[A-Z0-9_]+=' <<<"$public_env")"; set +a
# The build calls vp (Vite+); use the repo's own copy when none is installed.
export PATH="$MAKER_REPO/node_modules/.bin:$PATH"
os="$(uname -s)"

force=false
[[ "${1:-}" == "--force" ]] && force=true
stable='^v[0-9]+\.[0-9]+\.[0-9]+$'

if [[ -n "$(git status --porcelain --untracked-files=no)" ]]; then
  echo "error: uncommitted changes in $MAKER_REPO; commit or stash them first" >&2
  exit 1
fi
start_branch="$(git branch --show-current)"

git fetch --quiet upstream --tags
git fetch --quiet origin
latest="$(git tag -l 'v*' | grep -E "$stable" | sort -V | tail -1)"
own=false
if [[ "$os" == Darwin ]]; then
  app="/Applications/T3 Code (Beta).app"
  installed="$(defaults read "$app/Contents/Info" CFBundleShortVersionString 2>/dev/null || echo none)"
  # The own build is ad-hoc signed; an official build (Team ID) means it was replaced.
  codesign -dv "$app" 2>&1 | grep -q '^Signature=adhoc' && own=true
else
  # The own build lives in the home folder (maker/install-linux.sh).
  marker="$HOME/.local/opt/t3code-maker/MAKER_VERSION"
  installed="$(cat "$marker" 2>/dev/null || echo none)"
  [[ -f "$marker" ]] && own=true
fi
echo "latest stable: $latest; installed: $installed (own build: $own)"
if [[ "v$installed" == "$latest" ]] && $own && ! $force; then
  echo "up-to-date"
  exit 0
fi

if [[ "$os" != Darwin ]]; then
  base="$(git describe --tags --abbrev=0 --match 'v[0-9]*' --exclude '*-*' origin/maker)"
  if [[ "$base" != "$latest" ]]; then
    echo "origin/maker is on $base; the Mac has not rebased onto $latest yet"
    echo "waiting"
    exit 3
  fi
  git checkout --quiet -B maker origin/maker
  pnpm install --frozen-lockfile --silent
  out="$MAKER_REPO/release/maker"
  rm -rf "$out"
  # Upstream caps glibc at its CI's version so releases run on older distros.
  # This build only runs on this machine, so raise the cap to the host's glibc
  # for the build, uncommitted, and put the file back afterwards.
  glibc="$(ldd --version | head -1 | grep -oE '[0-9]+\.[0-9]+$')"
  sed -i "s/^const GLIBC_BUILD_CEILING = \".*\";/const GLIBC_BUILD_CEILING = \"$glibc\";/" scripts/linux-glibc.ts
  trap 'git checkout --quiet -- scripts/linux-glibc.ts' EXIT
  T3CODE_DESKTOP_OUTPUT_DIR="$out" T3CODE_DESKTOP_VERSION="${latest#v}" \
    node scripts/build-desktop-artifact.ts --platform linux --target AppImage --arch x64
  git checkout --quiet -- scripts/linux-glibc.ts
  git checkout --quiet "$start_branch"
  img="$(ls "$out"/*.AppImage | head -1)"
  echo "built: ${latest} + origin/maker"
  echo "$img"
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
