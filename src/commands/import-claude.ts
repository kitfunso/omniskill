import { importClaudeSkills } from "../importers/claude.js";

export async function runImportClaudeCommand(
  sourceDir: string,
  outputDir: string
): Promise<string> {
  const result = await importClaudeSkills({ sourceDir, outputDir });
  return [
    `Imported: ${result.imported.length}`,
    `Skipped: ${result.skipped.length}`
  ].join("\n");
}
