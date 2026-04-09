# Contributing

## Scope

Omniskill is a package-first skill bridge. Contributions should improve one of these areas:

- canonical skill import and normalization
- target render/install behavior
- MCP catalog exposure
- documentation and verification

## Development

Install dependencies:

```bash
npm install
```

Run the full verification suite:

```bash
npm run check
```

Useful commands:

```bash
npm run build
npm test
npx tsx src/cli.ts list --skills-dir .
```

## Project rules

- Do not overwrite an existing target skill directory silently.
- Prefer additive target support over target-specific prompt rewriting.
- Keep the canonical manifest small and preserve `SKILL.md` as the source instructions.
- Add tests for import, install, and CLI behavior before broadening the feature.

## Pull requests

PRs should include:

- the target behavior being changed
- the verification command output used to confirm it
- any compatibility notes for Claude Code, Codex, OpenClaw, OpenCode, Pi, or MCP
