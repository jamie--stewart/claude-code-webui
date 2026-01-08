import { Context } from "hono";
import { join, relative, sep } from "node:path";
import { readDir, exists, stat } from "../utils/fs.ts";
import { logger } from "../utils/logger.ts";
import type { MentionItem, MentionsResponse } from "../../shared/types.ts";

/**
 * Configuration for file listing
 */
const MAX_DEPTH = 3; // Maximum directory depth to traverse
const MAX_RESULTS = 50; // Maximum number of results to return
const MAX_FILES_PER_DIR = 100; // Maximum files to read per directory
const IGNORED_DIRS = new Set([
  "node_modules",
  ".git",
  ".next",
  ".nuxt",
  "dist",
  "build",
  ".cache",
  "__pycache__",
  ".venv",
  "venv",
  ".tox",
  "coverage",
  ".nyc_output",
  ".pytest_cache",
  ".mypy_cache",
  "target", // Rust/Java
  "vendor", // Go/PHP
]);

/**
 * Recursively list files in a directory
 */
async function listFilesRecursive(
  basePath: string,
  currentPath: string,
  depth: number,
  results: MentionItem[],
  maxResults: number,
): Promise<void> {
  if (depth > MAX_DEPTH || results.length >= maxResults) {
    return;
  }

  try {
    let fileCount = 0;
    for await (const entry of readDir(currentPath)) {
      if (results.length >= maxResults) {
        break;
      }

      fileCount++;
      if (fileCount > MAX_FILES_PER_DIR) {
        break;
      }

      const fullPath = join(currentPath, entry.name);
      const relativePath = relative(basePath, fullPath);

      // Skip ignored directories
      if (entry.isDirectory && IGNORED_DIRS.has(entry.name)) {
        continue;
      }

      // Skip hidden files/directories (except commonly needed ones)
      if (entry.name.startsWith(".") && !entry.name.startsWith(".env")) {
        continue;
      }

      // Add to results
      results.push({
        type: entry.isDirectory ? "directory" : "file",
        value: relativePath,
        displayText: entry.name,
        path: relativePath.split(sep).join("/"), // Normalize to forward slashes
      });

      // Recurse into directories
      if (entry.isDirectory) {
        await listFilesRecursive(
          basePath,
          fullPath,
          depth + 1,
          results,
          maxResults,
        );
      }
    }
  } catch (error) {
    // Silently skip directories we can't read
    logger.api.debug("Error reading directory {path}: {error}", {
      path: currentPath,
      error,
    });
  }
}

/**
 * Filter and sort mention results
 */
function filterMentions(items: MentionItem[], query: string): MentionItem[] {
  const lowerQuery = query.toLowerCase();

  // Filter items that match the query
  const filtered = items.filter((item) => {
    const lowerPath = item.path.toLowerCase();
    const lowerDisplay = item.displayText.toLowerCase();

    // Match against path or display text
    return lowerPath.includes(lowerQuery) || lowerDisplay.includes(lowerQuery);
  });

  // Sort: exact matches first, then prefix matches, then contains matches
  filtered.sort((a, b) => {
    const aLower = a.path.toLowerCase();
    const bLower = b.path.toLowerCase();

    // Exact match takes priority
    const aExact = aLower === lowerQuery;
    const bExact = bLower === lowerQuery;
    if (aExact !== bExact) return aExact ? -1 : 1;

    // Prefix match next
    const aPrefix = aLower.startsWith(lowerQuery);
    const bPrefix = bLower.startsWith(lowerQuery);
    if (aPrefix !== bPrefix) return aPrefix ? -1 : 1;

    // Display text prefix match
    const aDisplayPrefix = a.displayText.toLowerCase().startsWith(lowerQuery);
    const bDisplayPrefix = b.displayText.toLowerCase().startsWith(lowerQuery);
    if (aDisplayPrefix !== bDisplayPrefix) return aDisplayPrefix ? -1 : 1;

    // Shorter paths first (more likely to be relevant)
    if (a.path.length !== b.path.length) {
      return a.path.length - b.path.length;
    }

    // Alphabetical as tiebreaker
    return a.path.localeCompare(b.path);
  });

  return filtered;
}

/**
 * Handles GET /api/mentions requests
 * Returns file/directory completions for @ mentions
 *
 * Query parameters:
 * - cwd: Working directory to list files from (required)
 * - query: Filter string for matching files (optional)
 */
export async function handleMentionsRequest(c: Context) {
  const cwd = c.req.query("cwd");
  const query = c.req.query("query") || "";

  if (!cwd) {
    return c.json({ error: "Missing required 'cwd' parameter" }, 400);
  }

  try {
    // Verify directory exists
    const dirExists = await exists(cwd);
    if (!dirExists) {
      return c.json({ error: "Directory not found" }, 404);
    }

    const dirStats = await stat(cwd);
    if (!dirStats.isDirectory) {
      return c.json({ error: "Path is not a directory" }, 400);
    }

    // List files
    const allItems: MentionItem[] = [];
    await listFilesRecursive(cwd, cwd, 0, allItems, MAX_RESULTS * 2);

    // Filter by query if provided
    const filteredItems = query ? filterMentions(allItems, query) : allItems;

    // Limit results
    const limitedItems = filteredItems.slice(0, MAX_RESULTS);

    const response: MentionsResponse = {
      items: limitedItems,
      truncated: filteredItems.length > MAX_RESULTS,
    };

    return c.json(response);
  } catch (error) {
    logger.api.error("Error listing mentions: {error}", { error });
    return c.json({ error: "Failed to list files" }, 500);
  }
}
