#!/usr/bin/env bash
# Install (or update) the sound effects in a Lovable project via its GitHub repo.
#
#   ./install-sounds.sh https://github.com/<you>/<lovable-project>.git
#   ./install-sounds.sh ~/path/to/local/clone
#   NO_PUSH=1 ./install-sounds.sh <...>
#
# Copies sounds/sounds.ts to src/lib/sounds.ts, commits and pushes. No dependencies, no audio
# files. Then send lovable-kit/prompt-3S-sounds.md so Lovable wires the calls in. Safe to re-run.
set -euo pipefail

KIT="$(cd "$(dirname "$0")" && pwd)"
SRC="$KIT/../sounds/sounds.ts"
TARGET="${1:?usage: install-sounds.sh <lovable repo url or local clone>}"

if [ -d "$TARGET/.git" ]; then
  REPO="$(cd "$TARGET" && pwd)"
  [ -z "$(git -C "$REPO" status --porcelain)" ] || { echo "$REPO has uncommitted changes. Commit or stash them first." >&2; exit 1; }
  git -C "$REPO" pull --quiet --ff-only || { echo "Couldn't fast-forward $REPO. Sort out the branch first." >&2; exit 1; }
else
  REPO="$(mktemp -d)/app"
  git clone --quiet "$TARGET" "$REPO"
fi

[ -f "$REPO/package.json" ] || { echo "No package.json in $REPO: is this the Lovable project?" >&2; exit 1; }

mkdir -p "$REPO/src/lib"
cp "$SRC" "$REPO/src/lib/sounds.ts"

cd "$REPO"
git add src/lib/sounds.ts
if git diff --cached --quiet; then
  echo "Sounds are already up to date in $REPO"
  exit 0
fi
git commit --quiet -m "Add synthesised sound effects" -- src/lib/sounds.ts
if [ "${NO_PUSH:-}" = "1" ]; then
  echo "Committed in $REPO (not pushed)"
else
  git push --quiet origin "HEAD:$(git rev-parse --abbrev-ref HEAD)"
  echo "Pushed sounds to $(git remote get-url origin). Now send lovable-kit/prompt-3S-sounds.md."
fi
