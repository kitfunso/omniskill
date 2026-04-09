import * as z from "zod/v4";
import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";

import { getCatalogSkillByName, listCatalogSkills } from "../core/catalog.js";
import { getDefaultTargetRoot } from "../core/paths.js";
import { installSkills } from "../renderers/install.js";
import { runDoctorCommand } from "../commands/doctor.js";

const INSTALLABLE_TARGETS = ["claude-code", "codex", "openclaw", "opencode", "pi"] as const;

export interface OmniskillMcpServerOptions {
  catalogDir: string;
}

export interface OmniskillMcpServerHandle {
  server: McpServer;
  toolNames: string[];
  startStdio: () => Promise<void>;
}

export async function createOmniskillMcpServer(
  options: OmniskillMcpServerOptions
): Promise<OmniskillMcpServerHandle> {
  const server = new McpServer({
    name: "omniskill",
    version: "0.1.0"
  });

  const toolNames = [
    "omniskill_list_skills",
    "omniskill_read_skill",
    "omniskill_install_skills",
    "omniskill_doctor_target"
  ];

  server.registerTool(
    "omniskill_list_skills",
    {
      description: "List skills from the Omniskill catalog",
      inputSchema: {}
    },
    async () => {
      const skills = await listCatalogSkills(options.catalogDir);
      return {
        content: [
          {
            type: "text",
            text: skills.map((skill) => `${skill.name}: ${skill.description}`).join("\n")
          }
        ],
        structuredContent: {
          skills: skills.map((skill) => ({
            name: skill.name,
            description: skill.description,
            directoryPath: skill.directoryPath
          }))
        }
      };
    }
  );

  server.registerTool(
    "omniskill_read_skill",
    {
      description: "Read metadata for a single Omniskill skill",
      inputSchema: {
        name: z.string().describe("Skill name")
      }
    },
    async ({ name }) => {
      const skill = await getCatalogSkillByName(options.catalogDir, name);
      if (!skill) {
        throw new Error(`Skill "${name}" was not found in the catalog.`);
      }

      return {
        content: [
          {
            type: "text",
            text: `${skill.name}: ${skill.description}\nPath: ${skill.directoryPath}`
          }
        ],
        structuredContent: {
          skill: {
            name: skill.name,
            description: skill.description,
            directoryPath: skill.directoryPath,
            skillFilePath: skill.skillFilePath,
            manifestPath: skill.manifestPath
          }
        }
      };
    }
  );

  server.registerTool(
    "omniskill_install_skills",
    {
      description: "Install one or more Omniskill skills into a target CLI root",
      inputSchema: {
        target: z.enum(INSTALLABLE_TARGETS).describe("Target CLI"),
        targetRoot: z.string().optional().describe("Override target root"),
        mode: z.enum(["copy", "link"]).optional().describe("Install mode"),
        skillNames: z.array(z.string()).optional().describe("Specific skills to install"),
        skipExisting: z
          .boolean()
          .optional()
          .describe("Skip target collisions instead of failing"),
        prefix: z
          .string()
          .optional()
          .describe("Prefix applied only when a target skill name collides")
      }
    },
    async ({ target, targetRoot, mode, skillNames, skipExisting, prefix }) => {
      const resolvedTargetRoot = targetRoot ?? getDefaultTargetRoot(target);
      const result = await installSkills({
        catalogDir: options.catalogDir,
        target,
        targetRoot: resolvedTargetRoot,
        mode: mode ?? "link",
        skillNames,
        skipExisting,
        prefix
      });

      return {
        content: [
          {
            type: "text",
            text:
              `Installed ${result.installed.length} skill(s) to ${resolvedTargetRoot}` +
              `; skipped ${result.skipped.length}`
          }
        ],
        structuredContent: {
          installed: result.installed,
          skipped: result.skipped
        }
      };
    }
  );

  server.registerTool(
    "omniskill_doctor_target",
    {
      description: "Inspect an Omniskill target root",
      inputSchema: {
        target: z.enum(INSTALLABLE_TARGETS).describe("Target CLI"),
        targetRoot: z.string().optional().describe("Override target root")
      }
    },
    async ({ target, targetRoot }) => {
      const resolvedTargetRoot = targetRoot ?? getDefaultTargetRoot(target);
      const text = await runDoctorCommand(target, resolvedTargetRoot);

      return {
        content: [
          {
            type: "text",
            text
          }
        ],
        structuredContent: {
          target,
          targetRoot: resolvedTargetRoot
        }
      };
    }
  );

  return {
    server,
    toolNames,
    startStdio: async () => {
      const transport = new StdioServerTransport();
      await server.connect(transport);
    }
  };
}
