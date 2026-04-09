# Omniskill Design

**Date:** 2026-04-09

## Goal

Build `omniskill`, a package-first repository and CLI that turns Claude Code skills into a shared, canonical skill catalog and installs or renders them for other agent CLIs including Codex, OpenClaw, OpenCode, Pi Coding Agent, and MCP clients.

## Problem

Claude Code skills already exist and are useful, but they are trapped inside Claude-specific locations, conventions, and tooling assumptions. Several target CLIs already understand `SKILL.md`-style skills, but they differ in discovery paths, optional metadata, install mechanics, and runtime integration. Copying skill folders manually is error-prone and creates drift. A runtime-only MCP solution would also be insufficient because many CLIs want native on-disk skills.

## Decision

Use a package-first architecture with a canonical Omniskill catalog and target-specific renderers.

The source of truth will be a repo-local `skills/` tree. Omniskill will:

1. Import existing Claude Code skills into the canonical tree.
2. Normalize metadata into a small machine-readable manifest per skill.
3. Render or install skills into target-native directories.
4. Prefer shared links over copies when possible so one catalog can back multiple CLIs.
5. Expose the same catalog through an Omniskill MCP server for clients that prefer tools over direct file discovery.

## Scope

### Phase 1

- Create a new `omniskill` repo with a Node/TypeScript CLI.
- Support importing from Claude Code skill directories.
- Support native install/render targets for:
  - `claude-code`
  - `codex`
  - `openclaw`
  - `opencode`
  - `pi`
- Support an Omniskill MCP server via `serve-mcp`.
- Support `install`, `render`, `import`, `doctor`, and `list` commands.
- Support per-target default install paths.
- Support `copy` and `link` install modes, with `link` using Windows junctions for directories.

### Deferred

- Remote registries and publishing flows.
- Rich compatibility transforms beyond simple metadata normalization.
- Skill dependency graphs.
- Skill signing and trust policies.
- Automatic import from non-Claude ecosystems.
- Deep target-specific prompt rewriting.

## Architecture

### Canonical Repository Layout

```text
omniskill/
  docs/
    superpowers/
      specs/
      plans/
  skills/
    <skill-name>/
      SKILL.md
      skill.json
      scripts/
      references/
      assets/
      agents/
  src/
    cli.ts
    core/
    importers/
    renderers/
    targets/
    mcp/
  tests/
```

### Canonical Skill Model

Each skill is stored as a directory containing:

- `SKILL.md`: canonical human-readable instructions.
- `skill.json`: Omniskill manifest with normalized metadata.
- optional supporting files copied from the imported source.

`skill.json` will capture:

- `name`
- `description`
- `source`
- `sourceFormat`
- `canonicalPath`
- `frontmatter`
- `compatibility`
- `targets`
- `artifacts`

The manifest stays intentionally small. Omniskill should preserve the source `SKILL.md` whenever possible instead of trying to compile the prose itself.

### Import Model

The first importer targets Claude Code skills:

- discover `*/SKILL.md` under a source root
- parse frontmatter
- copy the full skill directory into `skills/<name>/`
- generate or refresh `skill.json`
- preserve extra files such as scripts, references, assets, licenses, and agent metadata

This importer is also useful for OpenCode and Codex compatible skill directories because they already use the same `SKILL.md` convention.

### Renderer Model

Renderers convert the canonical catalog into target-native filesystem output.

For Phase 1, most renderers can preserve the canonical skill folder structure and only vary in:

- default destination path
- allowed metadata fields
- compatibility annotations
- install mode behavior

Target defaults:

- `claude-code` -> `~/.claude/skills`
- `codex` -> `~/.codex/skills`
- `openclaw` -> `~/.openclaw/skills`
- `opencode` -> `~/.config/opencode/skills`
- `pi` -> `~/.pi/agent/skills`

Renderers should prefer pass-through output. Omniskill is a skill distribution layer, not a prompt transpiler.

### Install Model

`install` is a convenience layer over rendering into a target’s default path.

Modes:

- `link`: preferred for sharing one canonical catalog across many CLIs
- `copy`: fallback when links are undesirable or unsupported

On Windows, directory links should use junctions to avoid privilege friction.

### MCP Model

The Omniskill MCP server exposes the canonical catalog through tools. In Phase 1 it should support:

- listing skills
- reading skill metadata
- reading rendered target metadata
- installing selected skills into a target
- running doctor checks for a target

The MCP server does not replace native filesystem installs. It complements them.

## Data Flow

### Import

1. User points Omniskill at a Claude skill root.
2. Omniskill discovers skill folders containing `SKILL.md`.
3. Omniskill parses frontmatter and inventories files.
4. Omniskill copies the skill into the canonical repo tree.
5. Omniskill writes `skill.json`.

### Install

1. User selects a target.
2. Omniskill resolves the target install root.
3. Omniskill validates skill names and manifests.
4. Omniskill links or copies each selected skill into the target root.
5. Omniskill reports the installed paths and any compatibility warnings.

### MCP

1. User launches `omniskill serve-mcp`.
2. The server loads the local canonical catalog.
3. MCP clients call Omniskill tools to list, inspect, and install skills.

## Error Handling

- Fail fast on invalid or missing `SKILL.md`.
- Reject malformed frontmatter for required fields.
- Warn but continue when optional metadata is missing.
- Refuse to install skills whose effective destination escapes the intended target root.
- Refuse to overwrite non-skill files unless `--force` is explicitly set.
- Report unsupported targets with the list of known targets.

## Testing

Phase 1 should include automated tests for:

- frontmatter parsing
- Claude importer discovery
- manifest generation
- target path resolution
- copy install mode
- link install mode path handling
- doctor checks

The MCP server should have at least smoke coverage around tool registration and catalog loading.

## Source Notes

This design is grounded in:

- local Claude Code and Codex skill layouts on this machine
- OpenClaw local docs showing `~/.openclaw/skills` and workspace skill loading
- OpenCode docs confirming it loads Claude-compatible `SKILL.md` skills directly
- Pi Coding Agent docs confirming support for skills, extensions, and Pi Packages
- MCP specification docs for tool exposure
