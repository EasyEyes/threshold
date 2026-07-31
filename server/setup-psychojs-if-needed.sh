#!/bin/sh
# Run setup:psychojs only if the psychojs submodule SHA changed since last setup.
# Skips a redundant npm ci + patch-package in CI, where update:submodules is a no-op.
set -e
cd "$(dirname "$0")/.."
sha=$(git -C psychojs rev-parse HEAD 2>/dev/null) || sha=""
marker=.psychojs-setup-sha
if [ -n "$sha" ] && [ -f "$marker" ] && [ "$(cat "$marker")" = "$sha" ] && [ -d psychojs/node_modules ]; then
  echo "psychojs unchanged ($sha); skipping setup"
  exit 0
fi
npm run setup:psychojs
[ -n "$sha" ] && echo "$sha" > "$marker"
