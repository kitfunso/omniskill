import { parseDocument } from "yaml";

import type { ParsedSkillFrontmatter, SkillFrontmatter } from "./types.js";

function parseFrontmatterBlock(source: string): { raw: string; body: string } {
  const normalized = source.replace(/\r\n/g, "\n");
  if (!normalized.startsWith("---\n")) {
    throw new Error("Skill file is missing YAML frontmatter.");
  }

  const closingMarker = "\n---\n";
  const endIndex = normalized.indexOf(closingMarker, 4);
  if (endIndex === -1) {
    throw new Error("Skill file has an unterminated YAML frontmatter block.");
  }

  return {
    raw: normalized.slice(4, endIndex),
    body: normalized.slice(endIndex + closingMarker.length).trimStart()
  };
}

function validateFrontmatter(value: unknown): SkillFrontmatter {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new Error("Skill frontmatter must be a YAML object.");
  }

  const frontmatter = value as Record<string, unknown>;
  if (typeof frontmatter.name !== "string" || frontmatter.name.trim() === "") {
    throw new Error("Skill frontmatter requires a non-empty name.");
  }

  if (
    typeof frontmatter.description !== "string" ||
    frontmatter.description.trim() === ""
  ) {
    throw new Error("Skill frontmatter requires a non-empty description.");
  }

  return frontmatter as SkillFrontmatter;
}

export function parseSkillFrontmatter(source: string): ParsedSkillFrontmatter {
  const { raw, body } = parseFrontmatterBlock(source);
  const document = parseDocument(raw);

  if (document.errors.length > 0) {
    throw new Error(`Invalid YAML frontmatter: ${document.errors[0]?.message ?? "unknown error"}`);
  }

  return {
    frontmatter: validateFrontmatter(document.toJS()),
    body
  };
}
