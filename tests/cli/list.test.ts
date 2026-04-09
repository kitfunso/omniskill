import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";

import { runCli } from "../../src/cli.js";

async function writeCatalogSkill(root: string, skillName: string): Promise<void> {
  const skillDir = path.join(root, "skills", skillName);
  await mkdir(skillDir, { recursive: true });
  await writeFile(
    path.join(skillDir, "SKILL.md"),
    `---
name: ${skillName}
description: ${skillName} description
---

Body
`,
    "utf8"
  );
  await writeFile(
    path.join(skillDir, "skill.json"),
    JSON.stringify({ name: skillName, description: `${skillName} description` }, null, 2),
    "utf8"
  );
}

test("runCli lists skills from the catalog", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "omniskill-cli-"));

  try {
    await writeCatalogSkill(root, "demo-skill");

    const result = await runCli(["list", "--skills-dir", root]);

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /demo-skill/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("runCli doctor reports a target root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "omniskill-cli-"));
  const targetRoot = path.join(root, "target");

  try {
    await mkdir(targetRoot, { recursive: true });

    const result = await runCli([
      "doctor",
      "--target",
      "codex",
      "--skills-dir",
      root,
      "--target-root",
      targetRoot
    ]);

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /codex/i);
    assert.match(result.stdout, /target/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
