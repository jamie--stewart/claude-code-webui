/**
 * Git utilities with runtime abstraction
 *
 * Provides cross-platform git operations that work in both
 * Deno and Node.js environments using the Runtime interface.
 */

import type { Runtime } from "../runtime/types.ts";

/** Default timeout for git operations (5 seconds) */
const GIT_TIMEOUT_MS = 5000;

/** Git information for a repository */
export interface GitInfo {
  /** Git remote URL (e.g., https://github.com/owner/repo.git) */
  remoteUrl: string | null;
  /** Current branch name (null if detached HEAD) */
  branch: string | null;
  /** Current commit SHA (short form) */
  commitSha: string | null;
  /** Whether this is a git repository */
  isGitRepo: boolean;
}

/** Parsed repository name */
export interface RepoInfo {
  /** Repository owner (e.g., "anthropics") */
  owner: string;
  /** Repository name (e.g., "claude-code") */
  repo: string;
}

/**
 * Execute a git command with timeout and safe environment
 *
 * @param runtime - Runtime abstraction for command execution
 * @param args - Arguments to pass to git (e.g., ["status"])
 * @param cwd - Working directory for the command (optional)
 * @param timeoutMs - Timeout in milliseconds (default: 5000)
 * @returns Promise with stdout on success, null on failure
 */
export async function execGit(
  runtime: Runtime,
  args: string[],
  cwd?: string,
  timeoutMs: number = GIT_TIMEOUT_MS,
): Promise<string | null> {
  try {
    // Create a promise that rejects after timeout
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error("Git command timed out")), timeoutMs);
    });

    // Build environment with GIT_TERMINAL_PROMPT=0 to prevent prompts
    const env: Record<string, string> = {
      GIT_TERMINAL_PROMPT: "0",
    };

    // Add working directory to environment if specified
    if (cwd) {
      env.GIT_DIR = `${cwd}/.git`;
      env.GIT_WORK_TREE = cwd;
    }

    // Race between command execution and timeout
    const result = await Promise.race([
      runtime.runCommand("git", args, { env }),
      timeoutPromise,
    ]);

    if (result.success) {
      return result.stdout.trim();
    }

    return null;
  } catch {
    // Graceful fallback on any error (timeout, command not found, etc.)
    return null;
  }
}

/**
 * Parse a git remote URL to extract owner and repo name
 *
 * Supports various URL formats:
 * - https://github.com/owner/repo.git
 * - https://github.com/owner/repo
 * - git@github.com:owner/repo.git
 * - git@github.com:owner/repo
 * - ssh://git@github.com/owner/repo.git
 *
 * @param url - Git remote URL
 * @returns RepoInfo with owner and repo, or null if parsing fails
 */
export function parseRepoName(url: string): RepoInfo | null {
  if (!url) {
    return null;
  }

  // Remove trailing .git suffix
  let cleanUrl = url.replace(/\.git$/, "");

  // Try SSH format: git@host:owner/repo
  const sshMatch = cleanUrl.match(/^git@[^:]+:([^/]+)\/(.+)$/);
  if (sshMatch) {
    return {
      owner: sshMatch[1],
      repo: sshMatch[2],
    };
  }

  // Try HTTPS/SSH URL format: protocol://host/owner/repo
  // Also handles: ssh://git@host/owner/repo
  const httpsMatch = cleanUrl.match(
    /^(?:https?|ssh):\/\/[^/]+\/([^/]+)\/(.+)$/,
  );
  if (httpsMatch) {
    return {
      owner: httpsMatch[1],
      repo: httpsMatch[2],
    };
  }

  // Try simple path format: /owner/repo (for local paths that look like repos)
  const pathMatch = cleanUrl.match(/\/([^/]+)\/([^/]+)$/);
  if (pathMatch) {
    return {
      owner: pathMatch[1],
      repo: pathMatch[2],
    };
  }

  return null;
}

/**
 * Get git repository information for a directory
 *
 * Detects:
 * - Whether the directory is a git repository
 * - The remote origin URL
 * - The current branch (or null if detached HEAD)
 * - The current commit SHA
 *
 * @param runtime - Runtime abstraction for command execution
 * @param cwd - Directory to check (optional, defaults to current directory)
 * @returns Promise with GitInfo object
 */
export async function getGitInfo(
  runtime: Runtime,
  cwd?: string,
): Promise<GitInfo> {
  // Default result for non-git directories
  const defaultResult: GitInfo = {
    remoteUrl: null,
    branch: null,
    commitSha: null,
    isGitRepo: false,
  };

  // Check if this is a git repository by trying to get the top-level directory
  const topLevel = await execGit(
    runtime,
    ["rev-parse", "--show-toplevel"],
    cwd,
  );

  if (!topLevel) {
    return defaultResult;
  }

  // It's a git repo, gather information
  const result: GitInfo = {
    remoteUrl: null,
    branch: null,
    commitSha: null,
    isGitRepo: true,
  };

  // Get remote URL (origin)
  const remoteUrl = await execGit(
    runtime,
    ["config", "--get", "remote.origin.url"],
    cwd,
  );
  if (remoteUrl) {
    result.remoteUrl = remoteUrl;
  }

  // Get current branch name
  // Using symbolic-ref to get the branch name (fails on detached HEAD)
  const branch = await execGit(
    runtime,
    ["symbolic-ref", "--short", "HEAD"],
    cwd,
  );
  if (branch) {
    result.branch = branch;
  }

  // Get current commit SHA (short form)
  const commitSha = await execGit(
    runtime,
    ["rev-parse", "--short", "HEAD"],
    cwd,
  );
  if (commitSha) {
    result.commitSha = commitSha;
  }

  return result;
}
