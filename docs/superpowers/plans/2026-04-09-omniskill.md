# Omniskill Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build the first working Omniskill CLI that imports Claude Code skills into a canonical catalog, installs them for multiple CLIs, and exposes the catalog through MCP.

**Architecture:** A TypeScript CLI with a small canonical skill manifest, a Claude importer, target-specific renderers/installers, and a thin MCP server. Keep the Phase 1 slice narrow and filesystem-driven; avoid prompt transpilation and registry complexity.

**Tech Stack:** Node.js 24, TypeScript, npm, `yaml`, `@modelcontextprotocol/sdk`, `zod`, Node built-in test runner

---

## Chunk 1: Repo Scaffold

### Task 1: Create package metadata and compiler config

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `.gitignore`

- [ ] **Step 1: Write the failing scaffold expectation**

Define the expected package shape:

- package name `omniskill`
- executable bin `omniskill`
- build output in `dist/`
- scripts for `build`, `dev`, `test`, and `check`

- [ ] **Step 2: Create package metadata**

Write `package.json` with exact dependencies and scripts.

- [ ] **Step 3: Create compiler config**

Write `tsconfig.json` for strict TypeScript with `src/` input and `dist/` output.

- [ ] **Step 4: Create ignore rules**

Ignore `dist`, `node_modules`, and temporary files.

## Chunk 2: Core Model and Tests

### Task 2: Add canonical types and filesystem helpers

**Files:**
- Create: `src/core/types.ts`
- Create: `src/core/frontmatter.ts`
- Create: `src/core/fs.ts`
- Create: `src/core/paths.ts`
- Test: `tests/core/frontmatter.test.ts`
- Test: `tests/core/paths.test.ts`

- [ ] **Step 1: Write failing tests for frontmatter parsing**

Cover valid `name` and `description`, missing fields, and content body extraction.

- [ ] **Step 2: Write failing tests for target path resolution**

Cover default install roots for `claude-code`, `codex`, `openclaw`, `opencode`, and `pi`.

- [ ] **Step 3: Implement minimal frontmatter parser wrapper**

Use `yaml` to parse frontmatter and validate required fields.

- [ ] **Step 4: Implement path and filesystem helpers**

Add path normalization, home expansion, safe directory creation, and link-mode selection.

- [ ] **Step 5: Run the targeted tests**

Run: `npm test -- --test-name-pattern frontmatter`
Run: `npm test -- --test-name-pattern path`

## Chunk 3: Claude Importer

### Task 3: Implement Claude skill import

**Files:**
- Create: `src/importers/claude.ts`
- Test: `tests/importers/claude.test.ts`

- [ ] **Step 1: Write failing importer tests**

Cover:
- discovery of `*/SKILL.md`
- copying nested files
- manifest generation
- skipping invalid skill folders

- [ ] **Step 2: Implement discovery and import**

Add directory scanning, frontmatter parsing, and canonical directory copy.

- [ ] **Step 3: Generate `skill.json`**

Write a normalized manifest for each imported skill.

- [ ] **Step 4: Run importer tests**

Run: `npm test -- --test-name-pattern claude`

## Chunk 4: Renderers and Installers

### Task 4: Implement target render/install logic

**Files:**
- Create: `src/targets.ts`
- Create: `src/renderers/install.ts`
- Create: `src/renderers/render.ts`
- Test: `tests/renderers/install.test.ts`
- Test: `tests/renderers/render.test.ts`

- [ ] **Step 1: Write failing tests for install modes**

Cover `copy` and `link` mode, plus per-target default roots.

- [ ] **Step 2: Implement renderer metadata**

Define supported targets and their default roots.

- [ ] **Step 3: Implement install/write behavior**

Support selected skill install into target roots.

- [ ] **Step 4: Implement render command behavior**

Support rendering into arbitrary output directories.

- [ ] **Step 5: Run renderer tests**

Run: `npm test -- --test-name-pattern install`
Run: `npm test -- --test-name-pattern render`

## Chunk 5: CLI Surface

### Task 5: Implement Omniskill CLI commands

**Files:**
- Create: `src/cli.ts`
- Create: `src/commands/import-claude.ts`
- Create: `src/commands/install.ts`
- Create: `src/commands/render.ts`
- Create: `src/commands/list.ts`
- Create: `src/commands/doctor.ts`
- Test: `tests/cli/list.test.ts`

- [ ] **Step 1: Write a failing command smoke test**

Cover at least one command path, such as listing an empty catalog.

- [ ] **Step 2: Implement shared argument parsing**

Keep parsing minimal and explicit; avoid pulling in a CLI framework unless needed.

- [ ] **Step 3: Implement `import claude`**

Accept a source root and optional output root.

- [ ] **Step 4: Implement `install`, `render`, `list`, and `doctor`**

Return clear human-readable output and non-zero exit codes on failure.

- [ ] **Step 5: Run command smoke tests**

Run: `npm test -- --test-name-pattern cli`

## Chunk 6: MCP Server

### Task 6: Implement `serve-mcp`

**Files:**
- Create: `src/mcp/server.ts`
- Test: `tests/mcp/server.test.ts`

- [ ] **Step 1: Write the failing MCP smoke test**

Cover catalog loading and tool registration.

- [ ] **Step 2: Implement MCP server bootstrap**

Use the official MCP SDK over stdio.

- [ ] **Step 3: Add catalog tools**

Implement tools for:
- list skills
- read skill manifest
- install skills
- doctor target

- [ ] **Step 4: Run MCP smoke tests**

Run: `npm test -- --test-name-pattern mcp`

## Chunk 7: Verification and Docs

### Task 7: Verify the repo works end to end

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Write the README**

Document the Omniskill concept, supported targets, and a quick-start flow.

- [ ] **Step 2: Install dependencies**

Run: `npm install`

- [ ] **Step 3: Run full verification**

Run: `npm run check`
Run: `npm test`
Run: `node dist/cli.js list --skills-dir ./skills`

- [ ] **Step 4: Document any remaining gaps**

Call out unsupported transforms or target-specific caveats.
