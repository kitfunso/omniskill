import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { lstat, mkdtemp, readFile, realpath, rm, writeFile, mkdir } from "node:fs/promises";

import { installSkills } from "../../src/renderers/install.js";

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

test("installSkills copies selected skills into a target root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "omniskill-install-"));
  const catalogDir = path.join(root, "catalog");
  const targetRoot = path.join(root, "target");

  try {
    await writeCatalogSkill(catalogDir, "demo-skill");

    const result = await installSkills({
      catalogDir,
      target: "codex",
      targetRoot,
      mode: "copy",
      skillNames: ["demo-skill"]
    });

    assert.equal(result.installed.length, 1);
    const installedSkillFile = path.join(targetRoot, "demo-skill", "SKILL.md");
    const skillContents = await readFile(installedSkillFile, "utf8");
    assert.match(skillContents, /demo-skill/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("installSkills links selected skills into a target root", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "omniskill-install-"));
  const catalogDir = path.join(root, "catalog");
  const targetRoot = path.join(root, "target");

  try {
    await writeCatalogSkill(catalogDir, "demo-skill");

    const result = await installSkills({
      catalogDir,
      target: "openclaw",
      targetRoot,
      mode: "link",
      skillNames: ["demo-skill"]
    });

    assert.equal(result.installed.length, 1);
    const installedSkillDir = path.join(targetRoot, "demo-skill");
    const stats = await lstat(installedSkillDir);
    assert.equal(stats.isSymbolicLink(), true);
    assert.equal(await realpath(installedSkillDir), await realpath(path.join(catalogDir, "skills", "demo-skill")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("installSkills refuses to overwrite an existing target skill directory", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "omniskill-install-"));
  const catalogDir = path.join(root, "catalog");
  const targetRoot = path.join(root, "target");

  try {
    await writeCatalogSkill(catalogDir, "demo-skill");
    await mkdir(path.join(targetRoot, "demo-skill"), { recursive: true });
    await writeFile(path.join(targetRoot, "demo-skill", "KEEP.txt"), "existing", "utf8");

    await assert.rejects(
      () =>
        installSkills({
          catalogDir,
          target: "codex",
          targetRoot,
          mode: "copy",
          skillNames: ["demo-skill"]
        }),
      /already exists/i
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
