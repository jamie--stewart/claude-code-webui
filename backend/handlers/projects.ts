import { Context } from "hono";
import { basename } from "node:path";
import type { ProjectInfo, ProjectsResponse } from "../../shared/types.ts";
import type { ConfigContext } from "../middleware/config.ts";
import { getEncodedProjectName } from "../history/pathUtils.ts";
import { logger } from "../utils/logger.ts";
import { readTextFile } from "../utils/fs.ts";
import { getHomeDir } from "../utils/os.ts";
import { getProjectInfo } from "../utils/projectInfo.ts";

/**
 * Handles GET /api/projects requests
 * Retrieves list of available project directories from Claude configuration
 * @param c - Hono context object
 * @returns JSON response with projects array
 */
export async function handleProjectsRequest(c: Context<ConfigContext>) {
  try {
    const homeDir = getHomeDir();
    if (!homeDir) {
      return c.json({ error: "Home directory not found" }, 500);
    }

    // Get runtime from context for git operations
    const config = c.get("config");
    const runtime = config?.runtime;

    const claudeConfigPath = `${homeDir}/.claude.json`;

    try {
      const configContent = await readTextFile(claudeConfigPath);
      const claudeConfig = JSON.parse(configContent);

      if (claudeConfig.projects && typeof claudeConfig.projects === "object") {
        const projectPaths = Object.keys(claudeConfig.projects);

        // Get project info for each project, only include projects with history
        const projects: ProjectInfo[] = [];
        for (const path of projectPaths) {
          const encodedName = await getEncodedProjectName(path);
          // Only include projects that have history directories
          if (encodedName) {
            // Use getProjectInfo() if runtime is available, otherwise fallback to basic info
            if (runtime) {
              try {
                const projectInfo = await getProjectInfo(runtime, path);
                // Override encodedName with the one from history (ensures consistency)
                projects.push({
                  ...projectInfo,
                  encodedName,
                });
              } catch {
                // Fallback to basic info if git detection fails
                projects.push({
                  path,
                  encodedName,
                  displayName: basename(path),
                  isGitRepo: false,
                });
              }
            } else {
              // No runtime available, use basic info
              projects.push({
                path,
                encodedName,
                displayName: basename(path),
                isGitRepo: false,
              });
            }
          }
        }

        const response: ProjectsResponse = { projects };
        return c.json(response);
      } else {
        const response: ProjectsResponse = { projects: [] };
        return c.json(response);
      }
    } catch (error) {
      // Handle file not found errors in a cross-platform way
      if (error instanceof Error && error.message.includes("No such file")) {
        const response: ProjectsResponse = { projects: [] };
        return c.json(response);
      }
      throw error;
    }
  } catch (error) {
    logger.api.error("Error reading projects: {error}", { error });
    return c.json({ error: "Failed to read projects" }, 500);
  }
}
