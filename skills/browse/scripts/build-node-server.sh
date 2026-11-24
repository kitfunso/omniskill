#!/usr/bin/env bash

set -e

GSTACK_DIR="$(cd "$(dirname "$0")/../.." && pwd)"
SRC_DIR="$GSTACK_DIR/browse/src"
DIST_DIR="$GSTACK_DIR/browse/dist"

echo "Building Node-compatible server bundle..."

bun build "$SRC_DIR/server.ts" \
  --target=node \
  --outfile "$DIST_DIR/server-node.mjs" \
  --external playwright \
  --external playwright-core \
  --external diff \
  --external "bun:sqlite"

perl -pi -e 's/import\.meta\.dir/__browseNodeSrcDir/g' "$DIST_DIR/server-node.mjs"
perl -pi -e 's|import { Database } from "bun:sqlite";|const Database = null; // bun:sqlite stubbed on Node|g' "$DIST_DIR/server-node.mjs"

{
  head -1 "$DIST_DIR/server-node.mjs"
  echo '// ── Windows Node.js compatibility (auto-generated) ──'
  echo 'import { fileURLToPath as _ftp } from "node:url";'
  echo 'import { dirname as _dn } from "node:path";'
  echo 'const __browseNodeSrcDir = _dn(_dn(_ftp(import.meta.url))) + "/src";'
  echo '{ const _r = createRequire(import.meta.url); _r("./bun-polyfill.cjs"); }'
  echo '// ── end compatibility ──'
  tail -n +2 "$DIST_DIR/server-node.mjs"
} > "$DIST_DIR/server-node.tmp.mjs"

mv "$DIST_DIR/server-node.tmp.mjs" "$DIST_DIR/server-node.mjs"

cp "$SRC_DIR/bun-polyfill.cjs" "$DIST_DIR/bun-polyfill.cjs"

echo "Node server bundle ready: $DIST_DIR/server-node.mjs"
