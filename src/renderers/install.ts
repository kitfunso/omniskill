import path from "node:path";
import { cp, lstat, mkdir, readdir, realpath, symlink } from "node:fs/promises";

import type { SupportedTarget } from "../core/types.js";

export type InstallMode = "copy" | "link";

export interface InstallSkillsOptions {
  catalogDir: string;
  target: Exclude<SupportedTarget, "mcp">;
  targetRoot: string;
  mode: InstallMode;
  skillNames?: string[];
}

export interface InstallSkillsResult {
  installed: Array<{
    name: string;
    target: Exclude<SupportedTarget, "mcp">;
    destinationPath: string;
    mode: InstallMode;
  }>;
}

async function listCatalogSkillNames(catalogDir: string): Promise<string[]> {
  const skillsRoot = path.join(catalogDir, "skills");
  const entries = await readdir(skillsRoot, { withFileTypes: true });
  return entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name);
}

async function installSkillDirectory(
  sourcePath: string,
  destinationPath: string,
  mode: InstallMode
): Promise<void> {
  try {
    const destinationStats = await lstat(destinationPath);
    if (destinationStats.isSymbolicLink()) {
      const [currentTarget, sourceTarget] = await Promise.all([
        realpath(destinationPath),
        realpath(sourcePath)
      ]);
      if (currentTarget === sourceTarget) {
        return;
      }
    }

    throw new Error(`Target skill path already exists: ${destinationPath}`);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code !== "ENOENT") {
      throw error;
    }
  }

  if (mode === "copy") {
    await cp(sourcePath, destinationPath, { recursive: true, force: true });
    return;
  }

  const linkType = process.platform === "win32" ? "junction" : "dir";
  await symlink(sourcePath, destinationPath, linkType);
}

export async function installSkills(
  options: InstallSkillsOptions
): Promise<InstallSkillsResult> {
  const skillNames = options.skillNames ?? (await listCatalogSkillNames(options.catalogDir));
  const installed: InstallSkillsResult["installed"] = [];

  await mkdir(options.targetRoot, { recursive: true });

  for (const skillName of skillNames) {
    const sourcePath = path.join(options.catalogDir, "skills", skillName);
    const destinationPath = path.join(options.targetRoot, skillName);

    await installSkillDirectory(sourcePath, destinationPath, options.mode);
    installed.push({
      name: skillName,
      target: options.target,
      destinationPath,
      mode: options.mode
    });
  }

  return { installed };
}
