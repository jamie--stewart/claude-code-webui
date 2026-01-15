/**
 * Project information utilities
 *
 * Functions for detecting and formatting project information
 * including git repository details.
 */

import type { Runtime } from "../runtime/types.ts";
import type { ProjectInfo } from "../../shared/types.ts";
import { getEnv } from "./os.ts";
import { getGitInfo, parseRepoName } from "./git.ts";
import { basename } from "node:path";

/**
 * Format a display name for a project based on available information
 *
 * Display Priority (highest to lowest):
 * 1. PR Mode: `owner/repo#123`
 * 2. Branch Mode: `owner/repo on branch-name`
 * 3. Detached HEAD: `owner/repo at abc1234`
 * 4. Git repo with no remote: `path on branch` or `path at abc1234`
 * 5. Fallback: basename of path
 *
 * @param info - Partial project info with available data
 * @param path - Filesystem path as fallback
 * @returns Formatted display name
 */
function formatDisplayName(
  info: {
    repoUrl?: string | null;
    branch?: string | null;
    pr?: number | null;
    commitSha?: string | null;
  },
  path: string,
): string {
  const pathBasename = basename(path);
  const repoInfo = info.repoUrl ? parseRepoName(info.repoUrl) : null;
  const repoName = repoInfo ? `${repoInfo.owner}/${repoInfo.repo}` : null;

  // PR Mode: owner/repo#123
  if (repoName && info.pr) {
    return `${repoName}#${info.pr}`;
  }

  // Branch Mode: owner/repo on branch-name
  if (repoName && info.branch) {
    return `${repoName} on ${info.branch}`;
  }

  // Detached HEAD with remote: owner/repo at abc1234
  if (repoName && info.commitSha) {
    return `${repoName} at ${info.commitSha}`;
  }

  // Git repo without remote but with branch
  if (info.branch) {
    return `${pathBasename} on ${info.branch}`;
  }

  // Git repo without remote, detached HEAD
  if (info.commitSha) {
    return `${pathBasename} at ${info.commitSha}`;
  }

  // Fallback to path basename
  return pathBasename;
}

/**
 * URL-safe encode a project path for use in API routes
 *
 * @param path - Filesystem path
 * @returns URL-safe encoded string
 */
function encodeProjectName(path: string): string {
  return encodeURIComponent(path).replace(/%/g, "-");
}

/**
 * Get comprehensive project information for a directory
 *
 * Detection priority:
 * 1. Check environment variables (CLONE_REPO, CLONE_BRANCH, CLONE_PR)
 * 2. Detect from git if no env vars
 * 3. Fallback to path-only info if git detection fails
 *
 * @param runtime - Runtime abstraction for command execution
 * @param path - Filesystem path to the project directory
 * @returns Promise with complete ProjectInfo
 */
export async function getProjectInfo(
  runtime: Runtime,
  path: string,
): Promise<ProjectInfo> {
  // Check for environment variables first (web planning mode)
  const envRepoUrl = getEnv("CLONE_REPO");
  const envBranch = getEnv("CLONE_BRANCH");
  const envPrStr = getEnv("CLONE_PR");
  const envPr = envPrStr ? parseInt(envPrStr, 10) : undefined;

  // If we have environment variables, use them
  if (envRepoUrl) {
    const displayName = formatDisplayName(
      {
        repoUrl: envRepoUrl,
        branch: envBranch || null,
        pr: envPr || null,
        commitSha: null,
      },
      path,
    );

    return {
      path,
      encodedName: encodeProjectName(path),
      displayName,
      repoUrl: envRepoUrl,
      branch: envBranch || undefined,
      pr: envPr && !isNaN(envPr) ? envPr : undefined,
      isGitRepo: true, // Assume true if env vars are set
    };
  }

  // Detect from git
  const gitInfo = await getGitInfo(runtime, path);

  if (!gitInfo.isGitRepo) {
    // Not a git repo, return path-only info
    return {
      path,
      encodedName: encodeProjectName(path),
      displayName: basename(path),
      isGitRepo: false,
    };
  }

  // Format display name based on git info
  const displayName = formatDisplayName(
    {
      repoUrl: gitInfo.remoteUrl,
      branch: gitInfo.branch,
      pr: null, // PR detection from git is not implemented
      commitSha: gitInfo.commitSha,
    },
    path,
  );

  return {
    path,
    encodedName: encodeProjectName(path),
    displayName,
    repoUrl: gitInfo.remoteUrl || undefined,
    branch: gitInfo.branch || undefined,
    commitSha: gitInfo.commitSha || undefined,
    isGitRepo: true,
  };
}
