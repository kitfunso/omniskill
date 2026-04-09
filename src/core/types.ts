export const SUPPORTED_TARGETS = [
  "claude-code",
  "codex",
  "openclaw",
  "opencode",
  "pi",
  "mcp"
] as const;

export type SupportedTarget = (typeof SUPPORTED_TARGETS)[number];

export interface SkillFrontmatter {
  name: string;
  description: string;
  license?: string;
  compatibility?: string;
  metadata?: Record<string, string>;
  [key: string]: unknown;
}

export interface ParsedSkillFrontmatter {
  frontmatter: SkillFrontmatter;
  body: string;
}
