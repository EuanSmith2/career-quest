#!/bin/sh
# Build the three look playgrounds into dist/<look>/. LINKS is a JSON map of look id -> artifact URL.
set -e
cd "$(dirname "$0")"
LINKS=${LINKS:-'{"original":"https://claude.ai/artifact/5tRyCrdsTvdQmcxXJZRP93","glasses":"https://claude.ai/artifact/W5KHfizMvMnP3ejLRYFLJx","eagle":"https://claude.ai/artifact/7shL5LXbgVczwj3pRDMRVD","both":"https://claude.ai/artifact/JkanG9zMM1QJCy7xdqKXr5"}'}
SP=${TMPDIR:-/tmp}
npx esbuild export-rig.tsx --bundle --platform=node --jsx=automatic --format=cjs --outfile="$SP/byte-export.cjs" --log-level=warning
for L in glasses eagle both; do
  D=dist/$L; mkdir -p "$D"
  npx esbuild main.tsx --bundle --minify --jsx=automatic --format=iife --define:process.env.NODE_ENV='"production"' \
    --define:__LOOK__="\"$L\"" --define:__LINKS__="$LINKS" --outfile="$D/app.js" --log-level=warning
  node "$SP/byte-export.cjs" "$L" "$D/svg"
  cp ../Byte.tsx "$D/Byte.tsx"; cp byte.css "$D/byte.css"
  python3 page.py "$L" "$D"
done
