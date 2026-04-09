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

test("runCli install supports --skip-existing", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "omniskill-cli-install-"));
  const targetRoot = path.join(root, "target");

  try {
    await writeCatalogSkill(root, "demo-skill");
    await mkdir(path.join(targetRoot, "demo-skill"), { recursive: true });
    await writeFile(path.join(targetRoot, "demo-skill", "KEEP.txt"), "existing", "utf8");

    const result = await runCli([
      "install",
      "--target",
      "codex",
      "--skills-dir",
      root,
      "--target-root",
      targetRoot,
      "--skip-existing"
    ]);

    assert.equal(result.exitCode, 0);
    assert.match(result.stdout, /Installed:\s+0/);
    assert.match(result.stdout, /Skipped:\s+1/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("runCli install rejects combining --skip-existing and --prefix", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "omniskill-cli-install-"));

  try {
    await writeCatalogSkill(root, "demo-skill");

    const result = await runCli([
      "install",
      "--target",
      "codex",
      "--skills-dir",
      root,
      "--skip-existing",
      "--prefix",
      "omniskill-"
    ]);

    assert.equal(result.exitCode, 1);
    assert.match(result.stderr, /skip-existing/i);
    assert.match(result.stderr, /prefix/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
