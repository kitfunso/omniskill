import { installSkills } from "./install.js";
import type { SupportedTarget } from "../core/types.js";

export interface RenderSkillsOptions {
  catalogDir: string;
  target: Exclude<SupportedTarget, "mcp">;
  outputDir: string;
  skillNames?: string[];
}

export interface RenderSkillsResult {
  rendered: Array<{
    name: string;
    target: Exclude<SupportedTarget, "mcp">;
    outputPath: string;
  }>;
}

export async function renderSkills(
  options: RenderSkillsOptions
): Promise<RenderSkillsResult> {
  const result = await installSkills({
    catalogDir: options.catalogDir,
    target: options.target,
    targetRoot: options.outputDir,
    mode: "copy",
    skillNames: options.skillNames
  });

  return {
    rendered: result.installed.map((entry) => ({
      name: entry.name,
      target: entry.target,
      outputPath: entry.destinationPath
    }))
  };
}
