# Getting Started

## What Omniskill does

Omniskill keeps one canonical `skills/` catalog and installs that catalog into multiple agent CLIs.

Phase 1 supports:

- Claude Code import
- Codex install
- OpenClaw install
- OpenCode install
- Pi install
- MCP catalog serving

## Bootstrap from Claude Code

```bash
npm install
npx tsx src/cli.ts import claude ~/.claude/skills --output-dir .
```

On Windows:

```powershell
npm install
npx tsx src/cli.ts import claude $HOME\.claude\skills --output-dir .
```

## Inspect the catalog

```bash
npx tsx src/cli.ts list --skills-dir .
```

## Install into a target

```bash
npx tsx src/cli.ts install --target codex --skills-dir .
```

If the target already contains a skill with the same name, Omniskill stops instead of overwriting it.

## Run as MCP

```bash
npx tsx src/cli.ts serve-mcp --skills-dir .
```
