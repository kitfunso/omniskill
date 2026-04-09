import test from "node:test";
import assert from "node:assert/strict";
import os from "node:os";
import path from "node:path";
import { mkdir, mkdtemp, readFile, rm, writeFile } from "node:fs/promises";

import { importClaudeSkills } from "../../src/importers/claude.js";

async function writeSkillFile(filePath: string, content: string): Promise<void> {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

test("importClaudeSkills imports valid skills and preserves nested files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "omniskill-claude-import-"));
  const sourceDir = path.join(root, "source");
  const outputDir = path.join(root, "catalog");

  try {
    await writeSkillFile(
      path.join(sourceDir, "demo-skill", "SKILL.md"),
      `---
name: demo-skill
description: Demo skill
---

Body
`
    );
    await writeSkillFile(
      path.join(sourceDir, "demo-skill", "references", "notes.md"),
      "Nested file"
    );
    await writeSkillFile(
      path.join(sourceDir, "demo-skill", ".git", "config"),
      "[core]"
    );
    await writeSkillFile(
      path.join(sourceDir, "demo-skill", "node_modules", "pkg", "index.js"),
      "module.exports = true;"
    );

    const result = await importClaudeSkills({ sourceDir, outputDir });

    assert.equal(result.imported.length, 1);
    assert.equal(result.skipped.length, 0);

    const manifestPath = path.join(outputDir, "skills", "demo-skill", "skill.json");
    const manifest = JSON.parse(await readFile(manifestPath, "utf8"));
    assert.equal(manifest.name, "demo-skill");
    assert.equal(manifest.sourceFormat, "claude-code");

    const copiedNestedFile = await readFile(
      path.join(outputDir, "skills", "demo-skill", "references", "notes.md"),
      "utf8"
    );
    assert.equal(copiedNestedFile, "Nested file");

    await assert.rejects(
      readFile(path.join(outputDir, "skills", "demo-skill", ".git", "config"), "utf8")
    );
    await assert.rejects(
      readFile(
        path.join(
          outputDir,
          "skills",
          "demo-skill",
          "node_modules",
          "pkg",
          "index.js"
        ),
        "utf8"
      )
    );
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});

test("importClaudeSkills skips invalid skill folders", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "omniskill-claude-import-"));
  const sourceDir = path.join(root, "source");
  const outputDir = path.join(root, "catalog");

  try {
    await writeSkillFile(
      path.join(sourceDir, "broken-skill", "SKILL.md"),
      `---
name: broken-skill
---

Broken
`
    );

    const result = await importClaudeSkills({ sourceDir, outputDir });

    assert.equal(result.imported.length, 0);
    assert.equal(result.skipped.length, 1);
    assert.equal(result.skipped[0]?.name, "broken-skill");
    assert.match(result.skipped[0]?.reason ?? "", /description/i);
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
