import { normalizeTargetName } from "../core/paths.js";
import { renderSkills } from "../renderers/render.js";

export async function runRenderCommand(options: {
  catalogDir: string;
  target: string;
  outputDir: string;
  skillNames?: string[];
}): Promise<string> {
  const target = normalizeTargetName(options.target);
  if (target === "mcp") {
    throw new Error("Use serve-mcp for the mcp target.");
  }

  const result = await renderSkills({
    catalogDir: options.catalogDir,
    target,
    outputDir: options.outputDir,
    skillNames: options.skillNames
  });

  return [
    `Target: ${target}`,
    `Rendered: ${result.rendered.length}`,
    `Output: ${options.outputDir}`
  ].join("\n");
}
