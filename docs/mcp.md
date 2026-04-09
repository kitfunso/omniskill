# MCP Support

Omniskill can expose the canonical skill catalog through an MCP server.

## Start the server

```bash
npx tsx src/cli.ts serve-mcp --skills-dir .
```

The server uses stdio transport in Phase 1.

## Available tools

- `omniskill_list_skills`
- `omniskill_read_skill`
- `omniskill_install_skills`
- `omniskill_doctor_target`

## Intended use

This MCP server is a complement to native skill installs, not a replacement for them.

Use it when:

- a client prefers tool-based discovery over direct filesystem scanning
- you want to inspect or install the catalog remotely through an MCP client

Use native installs when:

- the target CLI already supports on-disk `SKILL.md` folders
- you want direct local skill loading without a live Omniskill process
