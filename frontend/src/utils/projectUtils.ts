import type { ProjectInfo } from "../types";

/**
 * Format a project for use in document.title
 */
export function formatProjectTitle(project: ProjectInfo): string {
  const { displayName, branch, pr, commitSha, isGitRepo } = project;

  if (pr) {
    return `${displayName}#${pr}`;
  }
  if (branch) {
    return `${displayName} (${branch})`;
  }
  if (commitSha && isGitRepo) {
    return `${displayName} @${commitSha}`;
  }
  return displayName;
}
