import type { ProjectInfo } from "../types";

// Icons for different display contexts
function GitBranchIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M6 3v12m0 0a3 3 0 103 3 3 3 0 00-3-3zm0 0a3 3 0 01-3-3 3 3 0 013-3m12-3a3 3 0 11-6 0 3 3 0 016 0zm0 0v6a3 3 0 01-3 3H9"
      />
    </svg>
  );
}

function PullRequestIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M7.5 21L3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5"
      />
    </svg>
  );
}

function CommitIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M12 6v6m0 0v6m0-6h6m-6 0H6"
      />
    </svg>
  );
}

export type ProjectDisplayVariant = "card" | "breadcrumb" | "compact";

export interface ProjectDisplayProps {
  project: ProjectInfo;
  variant?: ProjectDisplayVariant;
  className?: string;
  showPath?: boolean;
}

/**
 * ProjectDisplay - Renders project information in various formats
 *
 * Variants:
 * - card: Full display with repo name, badge, and optional path
 * - breadcrumb: Inline display for navigation headers
 * - compact: Just the display name
 */
export function ProjectDisplay({
  project,
  variant = "compact",
  className = "",
  showPath = false,
}: ProjectDisplayProps) {
  const { displayName, branch, pr, commitSha, isGitRepo, path } = project;

  // Determine what badge/context to show
  const renderBadge = () => {
    if (pr) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300">
          <PullRequestIcon className="w-3 h-3" />
          PR #{pr}
        </span>
      );
    }
    if (branch) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300">
          <GitBranchIcon className="w-3 h-3" />
          {branch}
        </span>
      );
    }
    if (commitSha && isGitRepo) {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 text-xs font-medium rounded-full bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
          <CommitIcon className="w-3 h-3" />
          {commitSha}
        </span>
      );
    }
    return null;
  };

  if (variant === "compact") {
    return (
      <span className={`text-slate-800 dark:text-slate-200 ${className}`}>
        {displayName}
      </span>
    );
  }

  if (variant === "breadcrumb") {
    return (
      <span
        className={`inline-flex items-center gap-2 text-slate-800 dark:text-slate-200 ${className}`}
      >
        <span className="font-medium">{displayName}</span>
        {renderBadge()}
      </span>
    );
  }

  // Card variant
  return (
    <div className={`flex flex-col gap-1 ${className}`}>
      <div className="flex items-center gap-2">
        <span className="text-slate-800 dark:text-slate-200 font-medium">
          {displayName}
        </span>
        {renderBadge()}
      </div>
      {showPath && path && (
        <span className="text-xs text-slate-500 dark:text-slate-400 font-mono truncate">
          {path}
        </span>
      )}
    </div>
  );
}

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
