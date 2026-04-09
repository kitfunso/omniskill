import test from "node:test";
import assert from "node:assert/strict";
import { homedir } from "node:os";
import path from "node:path";

import { getDefaultTargetRoot, normalizeTargetName } from "../../src/core/paths.js";

test("normalizeTargetName accepts supported targets", () => {
  assert.equal(normalizeTargetName("claude-code"), "claude-code");
  assert.equal(normalizeTargetName("codex"), "codex");
  assert.equal(normalizeTargetName("openclaw"), "openclaw");
  assert.equal(normalizeTargetName("opencode"), "opencode");
  assert.equal(normalizeTargetName("pi"), "pi");
});

test("getDefaultTargetRoot resolves well-known skill roots", () => {
  const home = homedir();

  assert.equal(getDefaultTargetRoot("claude-code"), path.join(home, ".claude", "skills"));
  assert.equal(getDefaultTargetRoot("codex"), path.join(home, ".codex", "skills"));
  assert.equal(getDefaultTargetRoot("openclaw"), path.join(home, ".openclaw", "skills"));
  assert.equal(getDefaultTargetRoot("opencode"), path.join(home, ".config", "opencode", "skills"));
  assert.equal(getDefaultTargetRoot("pi"), path.join(home, ".pi", "agent", "skills"));
});

test("normalizeTargetName rejects unknown targets", () => {
  assert.throws(() => normalizeTargetName("cursor"), /unsupported target/i);
});
