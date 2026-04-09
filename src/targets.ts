import type { SupportedTarget } from "./core/types.js";

export const INSTALLABLE_TARGETS: Exclude<SupportedTarget, "mcp">[] = [
  "claude-code",
  "codex",
  "openclaw",
  "opencode",
  "pi"
];
