import path from "node:path";
import { cp, mkdir, readdir, readFile, writeFile } from "node:fs/promises";

import { parseSkillFrontmatter } from "../core/frontmatter.js";

const IMPORT_IGNORE_NAMES = new Set([".git", "node_modules"]);

export interface ClaudeImportOptions {
  sourceDir: string;
  outputDir: string;
}

export interface ImportedSkill {
  name: string;
  sourcePath: string;
  destinationPath: string;
}

export interface SkippedSkill {
  name: string;
  sourcePath: string;
  reason: string;
}

export interface ClaudeImportResult {
  imported: ImportedSkill[];
  skipped: SkippedSkill[];
}

function shouldImportPath(sourcePath: string): boolean {
  return !sourcePath
    .split(path.sep)
    .some((segment) => IMPORT_IGNORE_NAMES.has(segment));
}

async function discoverSkillDirectories(sourceDir: string): Promise<string[]> {
  const entries = await readdir(sourceDir, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(sourceDir, entry.name));
}

export async function importClaudeSkills(
  options: ClaudeImportOptions
): Promise<ClaudeImportResult> {
  const imported: ImportedSkill[] = [];
  const skipped: SkippedSkill[] = [];
  const canonicalSkillsRoot = path.join(options.outputDir, "skills");

  await mkdir(canonicalSkillsRoot, { recursive: true });

  for (const skillDir of await discoverSkillDirectories(options.sourceDir)) {
    const skillFilePath = path.join(skillDir, "SKILL.md");
    const folderName = path.basename(skillDir);

    try {
      const source = await readFile(skillFilePath, "utf8");
      const parsed = parseSkillFrontmatter(source);
      const skillName = parsed.frontmatter.name;
      const destinationPath = path.join(canonicalSkillsRoot, skillName);

      await cp(skillDir, destinationPath, {
        recursive: true,
        force: true,
        filter: async (sourcePath) => shouldImportPath(sourcePath)
      });
      await writeFile(
        path.join(destinationPath, "skill.json"),
        JSON.stringify(
          {
            name: skillName,
            description: parsed.frontmatter.description,
            source: skillDir,
            sourceFormat: "claude-code",
            canonicalPath: destinationPath,
            frontmatter: parsed.frontmatter
          },
          null,
          2
        ),
        "utf8"
      );

      imported.push({
        name: skillName,
        sourcePath: skillDir,
        destinationPath
      });
    } catch (error) {
      skipped.push({
        name: folderName,
        sourcePath: skillDir,
        reason: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return { imported, skipped };
}
