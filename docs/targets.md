# Target Support

## Philosophy

Omniskill does not try to transpile the meaning of a skill. It keeps `SKILL.md` as the source instructions and only adapts what each target needs around filesystem layout and install location.

## Current targets

### Claude Code

- default root: `~/.claude/skills`
- install model: native `SKILL.md` directories

### Codex

- default root: `~/.codex/skills`
- install model: native `SKILL.md` directories
- note: current installs fail on name collisions rather than replacing existing skills

### OpenClaw

- default root: `~/.openclaw/skills`
- install model: native `SKILL.md` directories

### OpenCode

- default root: `~/.config/opencode/skills`
- install model: native `SKILL.md` directories
- OpenCode also recognizes Claude-compatible skill trees directly

### Pi

- default root: `~/.pi/agent/skills`
- install model: native skill folders and package-friendly layout

### MCP

- runtime target only
- exposed through `serve-mcp`

## Install modes

### `link`

- preferred for local sharing
- lets one canonical catalog back several CLIs
- uses directory junctions on Windows

### `copy`

- useful for packaging or isolated output
- writes a standalone target tree

## Collision policy

Omniskill currently refuses to overwrite an existing target skill directory. This keeps target environments safe while the merge strategy is still explicit and simple.
