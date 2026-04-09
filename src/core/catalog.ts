import path from "node:path";
import { readdir, readFile } from "node:fs/promises";

import { parseSkillFrontmatter } from "./frontmatter.js";

export interface CatalogSkill {
  name: string;
  description: string;
  directoryPath: string;
  skillFilePath: string;
  manifestPath: string;
}

async function readCatalogSkill(directoryPath: string): Promise<CatalogSkill> {
  const manifestPath = path.join(directoryPath, "skill.json");
  const skillFilePath = path.join(directoryPath, "SKILL.md");

  try {
    const manifest = JSON.parse(await readFile(manifestPath, "utf8")) as {
      name?: string;
      description?: string;
    };

    if (typeof manifest.name === "string" && typeof manifest.description === "string") {
      return {
        name: manifest.name,
        description: manifest.description,
        directoryPath,
        skillFilePath,
        manifestPath
      };
    }
  } catch {
    // Fall back to SKILL.md parsing below.
  }

  const parsed = parseSkillFrontmatter(await readFile(skillFilePath, "utf8"));
  return {
    name: parsed.frontmatter.name,
    description: parsed.frontmatter.description,
    directoryPath,
    skillFilePath,
    manifestPath
  };
}

export async function listCatalogSkills(catalogDir: string): Promise<CatalogSkill[]> {
  const skillsRoot = path.join(catalogDir, "skills");
  let entries;
  try {
    entries = await readdir(skillsRoot, { withFileTypes: true });
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") {
      return [];
    }
    throw error;
  }
  const skills = await Promise.all(
    entries
      .filter((entry) => entry.isDirectory())
      .map((entry) => readCatalogSkill(path.join(skillsRoot, entry.name)))
  );

  return skills.sort((left, right) => left.name.localeCompare(right.name));
}

export async function getCatalogSkillByName(
  catalogDir: string,
  skillName: string
): Promise<CatalogSkill | undefined> {
  const skills = await listCatalogSkills(catalogDir);
  return skills.find((skill) => skill.name === skillName);
}
