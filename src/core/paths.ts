import { homedir } from "node:os";
import path from "node:path";

import { SUPPORTED_TARGETS, type SupportedTarget } from "./types.js";

const DEFAULT_TARGET_ROOTS: Record<Exclude<SupportedTarget, "mcp">, string> = {
  "claude-code": path.join(homedir(), ".claude", "skills"),
  codex: path.join(homedir(), ".codex", "skills"),
  openclaw: path.join(homedir(), ".openclaw", "skills"),
  opencode: path.join(homedir(), ".config", "opencode", "skills"),
  pi: path.join(homedir(), ".pi", "agent", "skills")
};

export function normalizeTargetName(target: string): SupportedTarget {
  if ((SUPPORTED_TARGETS as readonly string[]).includes(target)) {
    return target as SupportedTarget;
  }

  throw new Error(
    `Unsupported target "${target}". Supported targets: ${SUPPORTED_TARGETS.join(", ")}`
  );
}

export function getDefaultTargetRoot(target: Exclude<SupportedTarget, "mcp">): string {
  return DEFAULT_TARGET_ROOTS[target];
}
