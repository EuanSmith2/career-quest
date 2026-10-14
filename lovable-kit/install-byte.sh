#!/usr/bin/env bash
# Install (or update) the Byte mascot in a Lovable project via its GitHub repo.
#
#   ./install-byte.sh https://github.com/<you>/<lovable-project>.git
#   ./install-byte.sh ~/path/to/local/clone            # an existing clone works too
#   NO_PUSH=1 ./install-byte.sh <...>                   # commit locally, don't push
#
# It copies mascot/Byte.tsx to src/components/Byte.tsx, adds Byte's two CSS variables to
# src/index.css, makes sure framer-motion is a dependency, commits and pushes. Lovable picks the
# commit up through its GitHub sync. Safe to re-run: it overwrites Byte.tsx and skips what's there.
set -euo pipefail

KIT="$(cd "$(dirname "$0")" && pwd)"
SRC="$KIT/../mascot/Byte.tsx"
TARGET="${1:?usage: install-byte.sh <lovable repo url or local clone>}"

if [ -d "$TARGET/.git" ]; then
  REPO="$(cd "$TARGET" && pwd)"
  [ -z "$(git -C "$REPO" status --porcelain)" ] || { echo "$REPO has uncommitted changes. Commit or stash them first." >&2; exit 1; }
  git -C "$REPO" pull --quiet --ff-only || { echo "Couldn't fast-forward $REPO. Sort out the branch first." >&2; exit 1; }
else
  REPO="$(mktemp -d)/app"
  git clone --quiet "$TARGET" "$REPO"
fi

[ -f "$REPO/package.json" ] || { echo "No package.json in $REPO: is this the Lovable project?" >&2; exit 1; }

mkdir -p "$REPO/src/components"
cp "$SRC" "$REPO/src/components/Byte.tsx"

CSS="$REPO/src/index.css"
touch "$CSS"
if ! grep -q -- "--byte-shadow" "$CSS"; then
  cat >> "$CSS" <<'CSSEOF'

/* Byte mascot: floor shadow + dark-mode backdrop (lovable-kit/install-byte.sh) */
:root { --byte-shadow: #dfe1ee; --byte-backdrop: transparent; }
.dark { --byte-shadow: #0d1518; --byte-backdrop: #263840; }
CSSEOF
fi

if ! (cd "$REPO" && node -e "process.exit((require('./package.json').dependencies||{})['framer-motion']?0:1)"); then
  (cd "$REPO" && npm pkg set dependencies.framer-motion="^11.18.2")
fi

cd "$REPO"
git add src/components/Byte.tsx src/index.css package.json
if git diff --cached --quiet; then
  echo "Byte is already up to date in $REPO"
  exit 0
fi
git commit --quiet -m "Add Byte mascot component" -- src/components/Byte.tsx src/index.css package.json
if [ "${NO_PUSH:-}" = "1" ]; then
  echo "Committed in $REPO (not pushed)"
else
  git push --quiet origin "HEAD:$(git rev-parse --abbrev-ref HEAD)"
  echo "Pushed Byte to $(git remote get-url origin). Lovable will sync it in a few seconds."
fi
