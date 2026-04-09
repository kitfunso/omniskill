# Omniskill

Omniskill is a package-first skill bridge for coding agents.

It lets you:

- import existing Claude Code skills into one canonical catalog
- render or install that catalog for Codex, OpenClaw, OpenCode, Pi, and Claude Code
- prefer links over copies so one repo can back multiple CLIs
- expose the same catalog through MCP

## Documentation

- [Getting started](./docs/getting-started.md)
- [Target support](./docs/targets.md)
- [MCP support](./docs/mcp.md)
- [Design spec](./docs/superpowers/specs/2026-04-09-omniskill-design.md)
- [Implementation plan](./docs/superpowers/plans/2026-04-09-omniskill.md)
- [Contributing](./CONTRIBUTING.md)

## Why this exists

Most agent CLIs can consume `SKILL.md`-style skills, but they disagree on discovery paths and packaging. Omniskill keeps one source of truth in a repo-local `skills/` tree and handles the target-specific install roots for you.

This repo currently contains an imported Claude-sourced catalog under `skills/`.

## Supported targets

- `claude-code`
- `codex`
- `openclaw`
- `opencode`
- `pi`
- `mcp` via `serve-mcp`

## Quick start

Import your current Claude skill catalog:

```bash
npm install
npx tsx src/cli.ts import claude C:\Users\skf_s\.claude\skills --output-dir .
```

List imported skills:

```bash
npx tsx src/cli.ts list --skills-dir .
```

Install them into another CLI using links:

```bash
npx tsx src/cli.ts install --target codex --skills-dir .
npx tsx src/cli.ts install --target openclaw --skills-dir .
npx tsx src/cli.ts install --target pi --skills-dir .
```

Merge into a target that already has some skills:

```bash
npx tsx src/cli.ts install --target codex --skills-dir . --skip-existing
npx tsx src/cli.ts install --target codex --skills-dir . --prefix omniskill-
```

Render a copy to an explicit output directory:

```bash
npx tsx src/cli.ts render --target opencode --skills-dir . --output-dir .\out\opencode-skills
```

Run the MCP server over stdio:

```bash
npx tsx src/cli.ts serve-mcp --skills-dir .
```

## Commands

### `import claude`

```bash
omniskill import claude <source-dir> [--output-dir <catalog-dir>]
```

Copies Claude skills into `skills/<name>/` and writes `skill.json`.

### `list`

```bash
omniskill list [--skills-dir <catalog-dir>]
```

Lists the skills in the canonical catalog.

### `install`

```bash
omniskill install --target <target> [--skills-dir <catalog-dir>] [--target-root <dir>] [--mode copy|link] [--skip-existing | --prefix <value>]
```

Installs catalog skills into a target root.

Notes:

- default mode is `link`
- `--skip-existing` leaves colliding target skills untouched and installs the rest
- `--prefix omniskill-` renames only colliding installs, for example `demo-skill` becomes `omniskill-demo-skill`
- `--skip-existing` and `--prefix` are mutually exclusive
- on Windows, link mode uses directory junctions

### `render`

```bash
omniskill render --target <target> --output-dir <dir> [--skills-dir <catalog-dir>]
```

Writes a copy of selected skills to an explicit directory.

### `doctor`

```bash
omniskill doctor --target <target> [--target-root <dir>]
```

Prints a quick target-root status check.

### `serve-mcp`

```bash
omniskill serve-mcp [--skills-dir <catalog-dir>]
```

Starts an MCP server that exposes:

- `omniskill_list_skills`
- `omniskill_read_skill`
- `omniskill_install_skills`
- `omniskill_doctor_target`

## Repo layout

```text
skills/<name>/SKILL.md
skills/<name>/skill.json
skills/<name>/scripts/
skills/<name>/references/
skills/<name>/assets/
```

## Current limits

- Phase 1 imports from Claude-style skill folders only
- target renderers preserve `SKILL.md` rather than rewriting prompt content
