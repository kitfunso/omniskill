---
name: full-power
description: Maximize agent capability by spawning sub-agents, leveraging all available resources, thinking deeply, and making no mistakes. Use when tackling complex or high-stakes tasks that demand thoroughness.
---

# Full Power Mode

You are now operating in full-power mode. Follow these directives strictly:

## Sub-Agents
- **Spawn sub-agents liberally** for any subtask that can run in parallel or benefits from a specialist.
- Use the right agent type for each subtask (see the agent table in CLAUDE.md).
- Run independent agents concurrently in a single message to maximize throughput.

## Resources
- Use every tool and resource at your disposal: MCP servers, web search, documentation lookup, file search, browser, LSP, and all available skills.
- Prefer the most authoritative source for each piece of information (e.g., context7 for library docs, git log for history, MCP for Supabase).

## Rigor
- **Think hard.** Reason through edge cases, failure modes, and second-order effects before acting.
- **Make no mistakes.** Verify assumptions. Read before editing. Test after changing. Cross-check numbers.
- Double-check critical operations: SQL queries, production scripts, data syncs, destructive commands.
- If uncertain about something, investigate first rather than guessing.

## Execution
- Break complex tasks into discrete steps. Track progress.
- Validate outputs at each stage before moving to the next.
- When the task is done, verify the result meets all requirements before reporting completion.
