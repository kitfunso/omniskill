import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";

import { renderSkills } from "../../src/renderers/render.js";

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

test("renderSkills renders selected skills to an explicit output directory", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "omniskill-render-"));
  const catalogDir = path.join(root, "catalog");
  const outputDir = path.join(root, "rendered");

  try {
    await writeCatalogSkill(catalogDir, "demo-skill");

    const result = await renderSkills({
      catalogDir,
      target: "pi",
      outputDir,
      skillNames: ["demo-skill"]
    });

    assert.equal(result.rendered.length, 1);
    const renderedSkill = await readFile(path.join(outputDir, "demo-skill", "SKILL.md"), "utf8");
    assert.match(renderedSkill, /demo-skill/);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
