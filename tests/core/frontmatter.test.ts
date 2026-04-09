import test from "node:test";
import assert from "node:assert/strict";

import { parseSkillFrontmatter } from "../../src/core/frontmatter.js";

test("parseSkillFrontmatter extracts required fields and body", () => {
  const source = `---
name: demo-skill
description: Demo description
license: MIT
---

## What I do

- Help with demos
`;

  const result = parseSkillFrontmatter(source);

  assert.equal(result.frontmatter.name, "demo-skill");
  assert.equal(result.frontmatter.description, "Demo description");
  assert.equal(result.frontmatter.license, "MIT");
  assert.match(result.body, /What I do/);
});

test("parseSkillFrontmatter rejects missing required fields", () => {
  const source = `---
name: demo-skill
---

Body
`;

  assert.throws(() => parseSkillFrontmatter(source), /description/i);
});

test("parseSkillFrontmatter rejects missing frontmatter block", () => {
  assert.throws(() => parseSkillFrontmatter("## No frontmatter"), /frontmatter/i);
});
