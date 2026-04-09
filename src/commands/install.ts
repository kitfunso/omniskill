import { getDefaultTargetRoot, normalizeTargetName } from "../core/paths.js";
import { installSkills, type InstallMode } from "../renderers/install.js";

export async function runInstallCommand(options: {
  catalogDir: string;
  target: string;
  targetRoot?: string;
  mode?: InstallMode;
  skillNames?: string[];
}): Promise<string> {
  const target = normalizeTargetName(options.target);
  if (target === "mcp") {
    throw new Error("Use serve-mcp for the mcp target.");
  }

  const targetRoot = options.targetRoot ?? getDefaultTargetRoot(target);
  const result = await installSkills({
    catalogDir: options.catalogDir,
    target,
    targetRoot,
    mode: options.mode ?? "link",
    skillNames: options.skillNames
  });

  return [
    `Target: ${target}`,
    `Installed: ${result.installed.length}`,
    `Mode: ${options.mode ?? "link"}`,
    `Target root: ${targetRoot}`
  ].join("\n");
}
