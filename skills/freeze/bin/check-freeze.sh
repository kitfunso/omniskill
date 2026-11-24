#!/usr/bin/env bash
set -euo pipefail

INPUT=$(cat)

STATE_DIR="${CLAUDE_PLUGIN_DATA:-$HOME/.gstack}"
FREEZE_FILE="$STATE_DIR/freeze-dir.txt"

if [ ! -f "$FREEZE_FILE" ]; then
  echo '{}'
  exit 0
fi

FREEZE_DIR=$(tr -d '[:space:]' < "$FREEZE_FILE")

if [ -z "$FREEZE_DIR" ]; then
  echo '{}'
  exit 0
fi

FILE_PATH=$(printf '%s' "$INPUT" | grep -o '"file_path"[[:space:]]*:[[:space:]]*"[^"]*"' | head -1 | sed 's/.*:[[:space:]]*"//;s/"$//' || true)

if [ -z "$FILE_PATH" ]; then
  FILE_PATH=$(printf '%s' "$INPUT" | python3 -c 'import sys,json; print(json.loads(sys.stdin.read()).get("tool_input",{}).get("file_path",""))' 2>/dev/null || true)
fi

if [ -z "$FILE_PATH" ]; then
  echo '{}'
  exit 0
fi

case "$FILE_PATH" in
  /*) ;; # already absolute
  *)
    FILE_PATH="$(pwd)/$FILE_PATH"
    ;;
esac

FILE_PATH=$(printf '%s' "$FILE_PATH" | sed 's|/\+|/|g;s|/$||')

case "$FILE_PATH" in
  "${FREEZE_DIR}"*)
    echo '{}'
    ;;
  *)
    mkdir -p ~/.gstack/analytics 2>/dev/null || true
    echo '{"event":"hook_fire","skill":"freeze","pattern":"boundary_deny","ts":"'$(date -u +%Y-%m-%dT%H:%M:%SZ)'","repo":"'$(basename "$(git rev-parse --show-toplevel 2>/dev/null)" 2>/dev/null || echo "unknown")'"}' >> ~/.gstack/analytics/skill-usage.jsonl 2>/dev/null || true

    printf '{"permissionDecision":"deny","message":"[freeze] Blocked: %s is outside the freeze boundary (%s). Only edits within the frozen directory are allowed."}\n' "$FILE_PATH" "$FREEZE_DIR"
    ;;
esac
