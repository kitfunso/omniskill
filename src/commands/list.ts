import { listCatalogSkills } from "../core/catalog.js";

export async function runListCommand(skillsDir: string): Promise<string> {
  const skills = await listCatalogSkills(skillsDir);
  if (skills.length === 0) {
    return "No skills found.";
  }

  return skills.map((skill) => `${skill.name}: ${skill.description}`).join("\n");
}
