#!/usr/bin/env node
import { pathToFileURL } from "node:url";

import { getDefaultTargetRoot } from "./core/paths.js";
import { runDoctorCommand } from "./commands/doctor.js";
import { runImportClaudeCommand } from "./commands/import-claude.js";
import { runInstallCommand } from "./commands/install.js";
import { runListCommand } from "./commands/list.js";
import { runRenderCommand } from "./commands/render.js";
import { createOmniskillMcpServer } from "./mcp/server.js";

export interface CliResult {
  exitCode: number;
  stdout: string;
  stderr: string;
}

function readOption(args: string[], name: string): string | undefined {
  const index = args.indexOf(name);
  if (index === -1) {
    return undefined;
  }

  return args[index + 1];
}

function readValuesAfter(args: string[], startIndex: number): string[] {
  const values: string[] = [];
  for (let index = startIndex; index < args.length; index += 1) {
    const value = args[index];
    if (!value || value.startsWith("--")) {
      break;
    }
    values.push(value);
  }
  return values;
}

function hasFlag(args: string[], name: string): boolean {
  return args.includes(name);
}

export async function runCli(args: string[]): Promise<CliResult> {
  try {
    const [command, subcommand] = args;

    if (command === "list") {
      const skillsDir = readOption(args, "--skills-dir") ?? process.cwd();
      return {
        exitCode: 0,
        stdout: await runListCommand(skillsDir),
        stderr: ""
      };
    }

    if (command === "doctor") {
      const target = readOption(args, "--target");
      if (!target) {
        throw new Error("doctor requires --target");
      }
      const targetRoot =
        readOption(args, "--target-root") ??
        (target === "mcp" ? process.cwd() : getDefaultTargetRoot(target as never));
      return {
        exitCode: 0,
        stdout: await runDoctorCommand(target, targetRoot),
        stderr: ""
      };
    }

    if (command === "import" && subcommand === "claude") {
      const sourceDir = args[2];
      if (!sourceDir) {
        throw new Error("import claude requires a source directory");
      }
      const outputDir = readOption(args, "--output-dir") ?? process.cwd();
      return {
        exitCode: 0,
        stdout: await runImportClaudeCommand(sourceDir, outputDir),
        stderr: ""
      };
    }

    if (command === "install") {
      const target = readOption(args, "--target");
      if (!target) {
        throw new Error("install requires --target");
      }
      const targetRoot = readOption(args, "--target-root");
      const mode = readOption(args, "--mode") as "copy" | "link" | undefined;
      const prefix = readOption(args, "--prefix");
      const skillNames = readValuesAfter(args, args.indexOf("--skills") + 1);
      return {
        exitCode: 0,
        stdout: await runInstallCommand({
          catalogDir: readOption(args, "--skills-dir") ?? process.cwd(),
          target,
          targetRoot,
          mode,
          skillNames: hasFlag(args, "--skills") ? skillNames : undefined,
          skipExisting: hasFlag(args, "--skip-existing"),
          prefix
        }),
        stderr: ""
      };
    }

    if (command === "render") {
      const target = readOption(args, "--target");
      const outputDir = readOption(args, "--output-dir");
      if (!target || !outputDir) {
        throw new Error("render requires --target and --output-dir");
      }
      const skillNames = readValuesAfter(args, args.indexOf("--skills") + 1);
      return {
        exitCode: 0,
        stdout: await runRenderCommand({
          catalogDir: readOption(args, "--skills-dir") ?? process.cwd(),
          target,
          outputDir,
          skillNames: args.includes("--skills") ? skillNames : undefined
        }),
        stderr: ""
      };
    }

    if (command === "serve-mcp") {
      const catalogDir = readOption(args, "--skills-dir") ?? process.cwd();
      const handle = await createOmniskillMcpServer({ catalogDir });
      await handle.startStdio();
      return {
        exitCode: 0,
        stdout: "",
        stderr: ""
      };
    }

    return {
      exitCode: 1,
      stdout: "",
      stderr:
        "Usage: omniskill <list|doctor|import claude|install|render|serve-mcp> [options]"
    };
  } catch (error) {
    return {
      exitCode: 1,
      stdout: "",
      stderr: error instanceof Error ? error.message : String(error)
    };
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const result = await runCli(process.argv.slice(2));
  if (result.stdout) {
    console.log(result.stdout);
  }
  if (result.stderr) {
    console.error(result.stderr);
  }
  process.exitCode = result.exitCode;
}
