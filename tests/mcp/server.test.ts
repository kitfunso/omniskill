import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises";

import { createOmniskillMcpServer } from "../../src/mcp/server.js";

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

test("createOmniskillMcpServer exposes the expected tool catalog", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "omniskill-mcp-"));

  try {
    await writeCatalogSkill(root, "demo-skill");

    const server = await createOmniskillMcpServer({ catalogDir: root });

    assert.deepEqual(server.toolNames, [
      "omniskill_list_skills",
      "omniskill_read_skill",
      "omniskill_install_skills",
      "omniskill_doctor_target"
    ]);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
