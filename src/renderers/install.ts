import path from "node:path";
import { cp, lstat, mkdir, readdir, realpath, symlink } from "node:fs/promises";

import type { SupportedTarget } from "../core/types.js";

export type InstallMode = "copy" | "link";

class TargetSkillExistsError extends Error {
  destinationPath: string;

  constructor(destinationPath: string) {
    super(`Target skill path already exists: ${destinationPath}`);
    this.name = "TargetSkillExistsError";
    this.destinationPath = destinationPath;
  }
}

export interface InstallSkillsOptions {
  catalogDir: string;
  target: Exclude<SupportedTarget, "mcp">;
  targetRoot: string;
  mode: InstallMode;
  skillNames?: string[];
  skipExisting?: boolean;
  prefix?: string;
}

export interface InstallSkillsResult {
  installed: Array<{
    name: string;
    sourceName: string;
    target: Exclude<SupportedTarget, "mcp">;
    destinationPath: string;
    mode: InstallMode;
  }>;
  skipped: Array<{
    name: string;
    destinationPath: string;
    reason: string;
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

    throw new TargetSkillExistsError(destinationPath);
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
  if (options.skipExisting && options.prefix) {
    throw new Error("Cannot combine --skip-existing and --prefix collision policies.");
  }

  const skillNames = options.skillNames ?? (await listCatalogSkillNames(options.catalogDir));
  const installed: InstallSkillsResult["installed"] = [];
  const skipped: InstallSkillsResult["skipped"] = [];

  await mkdir(options.targetRoot, { recursive: true });

  for (const skillName of skillNames) {
    const sourcePath = path.join(options.catalogDir, "skills", skillName);
    let destinationName = skillName;
    let destinationPath = path.join(options.targetRoot, destinationName);

    try {
      await installSkillDirectory(sourcePath, destinationPath, options.mode);
    } catch (error) {
      if (!(error instanceof TargetSkillExistsError)) {
        throw error;
      }

      if (options.skipExisting) {
        skipped.push({
          name: skillName,
          destinationPath,
          reason: error.message
        });
        continue;
      }

      if (!options.prefix) {
        throw error;
      }

      destinationName = `${options.prefix}${skillName}`;
      destinationPath = path.join(options.targetRoot, destinationName);
      await installSkillDirectory(sourcePath, destinationPath, options.mode);
    }

    installed.push({
      name: destinationName,
      sourceName: skillName,
      target: options.target,
      destinationPath,
      mode: options.mode
    });
  }

  return { installed, skipped };
}
