import { access } from "node:fs/promises";

import { normalizeTargetName } from "../core/paths.js";

export async function runDoctorCommand(
  target: string,
  targetRoot: string
): Promise<string> {
  const normalizedTarget = normalizeTargetName(target);
  let exists = false;

  try {
    await access(targetRoot);
    exists = true;
  } catch {
    exists = false;
  }

  return [
    `Target: ${normalizedTarget}`,
    `Target root: ${targetRoot}`,
    `Exists: ${exists ? "yes" : "no"}`
  ].join("\n");
}
