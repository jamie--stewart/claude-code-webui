import {
  isBashToolUseResult,
  isEditToolUseResult,
  createEditResult,
} from "./contentUtils";

/**
 * Status types for tool results
 */
export type ToolResultStatus = "success" | "warning" | "error";

/**
 * Metadata extracted from tool results
 */
export interface ToolResultMetadata {
  duration?: number; // in milliseconds
  fileCount?: number;
  lineCount?: number;
  matchCount?: number;
}

/**
 * Parsed tool result with status, metadata, and formatted content
 */
export interface ParsedToolResult {
  status: ToolResultStatus;
  metadata: ToolResultMetadata;
  displayContent: string;
  language?: string;
}

/**
 * Get status icon based on result status
 */
export function getStatusIcon(status: ToolResultStatus): string {
  switch (status) {
    case "success":
      return "\u2705"; // Checkmark emoji
    case "warning":
      return "\u26a0\ufe0f"; // Warning emoji
    case "error":
      return "\u274c"; // X emoji
    default:
      return "\u2705";
  }
}

/**
 * Get color scheme based on status
 */
export function getStatusColorScheme(status: ToolResultStatus) {
  switch (status) {
    case "success":
      return {
        bg: "bg-emerald-50/80 dark:bg-emerald-900/20",
        border: "border-emerald-200 dark:border-emerald-800",
        header: "text-emerald-800 dark:text-emerald-300",
        headerBg: "bg-emerald-100/50 dark:bg-emerald-900/30",
        content: "text-emerald-700 dark:text-emerald-300",
      };
    case "warning":
      return {
        bg: "bg-amber-50/80 dark:bg-amber-900/20",
        border: "border-amber-200 dark:border-amber-800",
        header: "text-amber-800 dark:text-amber-300",
        headerBg: "bg-amber-100/50 dark:bg-amber-900/30",
        content: "text-amber-700 dark:text-amber-300",
      };
    case "error":
      return {
        bg: "bg-red-50/80 dark:bg-red-900/20",
        border: "border-red-200 dark:border-red-800",
        header: "text-red-800 dark:text-red-300",
        headerBg: "bg-red-100/50 dark:bg-red-900/30",
        content: "text-red-700 dark:text-red-300",
      };
    default:
      return {
        bg: "bg-emerald-50/80 dark:bg-emerald-900/20",
        border: "border-emerald-200 dark:border-emerald-800",
        header: "text-emerald-800 dark:text-emerald-300",
        headerBg: "bg-emerald-100/50 dark:bg-emerald-900/30",
        content: "text-emerald-700 dark:text-emerald-300",
      };
  }
}

/**
 * Format duration for display
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) {
    return `${ms}ms`;
  }
  const seconds = ms / 1000;
  if (seconds < 60) {
    return `${seconds.toFixed(1)}s`;
  }
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  return `${minutes}m ${remainingSeconds.toFixed(0)}s`;
}

/**
 * Detect language from file path
 */
export function detectLanguageFromPath(filePath: string): string | undefined {
  const extension = filePath.split(".").pop()?.toLowerCase();
  const languageMap: Record<string, string> = {
    ts: "typescript",
    tsx: "typescript",
    js: "javascript",
    jsx: "javascript",
    py: "python",
    rb: "ruby",
    go: "go",
    rs: "rust",
    java: "java",
    kt: "kotlin",
    swift: "swift",
    cpp: "cpp",
    c: "c",
    h: "c",
    hpp: "cpp",
    css: "css",
    scss: "scss",
    less: "less",
    html: "html",
    xml: "xml",
    json: "json",
    yaml: "yaml",
    yml: "yaml",
    md: "markdown",
    sql: "sql",
    sh: "bash",
    bash: "bash",
    zsh: "bash",
    fish: "bash",
    dockerfile: "dockerfile",
    makefile: "makefile",
  };

  return extension ? languageMap[extension] : undefined;
}

/**
 * Parse tool result to extract status, metadata, and formatted content
 */
export function parseToolResult(
  toolName: string,
  content: string,
  summary: string,
  toolUseResult?: unknown,
): ParsedToolResult {
  const metadata: ToolResultMetadata = {};
  const status: ToolResultStatus = "success";
  const displayContent = content;
  const language: string | undefined = undefined;

  // Parse based on tool type
  switch (toolName) {
    case "Bash":
      return parseBashResult(content, summary, toolUseResult);

    case "Edit":
      return parseEditResult(content, summary, toolUseResult);

    case "Read":
      return parseReadResult(content, summary);

    case "Write":
      return parseWriteResult(content, summary);

    case "Grep":
      return parseGrepResult(content);

    case "Glob":
      return parseGlobResult(content);

    default:
      // Generic parsing for unknown tools
      metadata.lineCount = content.split("\n").length;
      return { status, metadata, displayContent, language };
  }
}

/**
 * Parse Bash tool result
 */
function parseBashResult(
  content: string,
  summary: string,
  toolUseResult?: unknown,
): ParsedToolResult {
  const metadata: ToolResultMetadata = {};
  let status: ToolResultStatus = "success";
  let displayContent = content;

  if (isBashToolUseResult(toolUseResult)) {
    const { stdout, stderr, interrupted } = toolUseResult;

    // Determine status
    if (interrupted) {
      status = "warning";
    } else if (stderr && stderr.trim()) {
      // Check if stderr contains actual errors vs just warnings
      const stderrLower = stderr.toLowerCase();
      if (
        stderrLower.includes("error") ||
        stderrLower.includes("fatal") ||
        stderrLower.includes("failed")
      ) {
        status = "error";
      } else {
        status = "warning";
      }
    }

    // Use stdout as primary content, stderr as secondary
    displayContent = stdout || "";
    if (stderr && stderr.trim()) {
      if (displayContent) {
        displayContent += "\n\n--- stderr ---\n" + stderr;
      } else {
        displayContent = stderr;
      }
    }

    // Count output lines
    const outputLines = (stdout || "").split("\n").filter(Boolean).length;
    if (outputLines > 0) {
      metadata.lineCount = outputLines;
    }
  }

  // Parse duration from summary if available
  const durationMatch = summary.match(/(\d+(?:\.\d+)?)\s*(?:ms|s)/i);
  if (durationMatch) {
    const value = parseFloat(durationMatch[1]);
    metadata.duration =
      summary.includes("s") && !summary.includes("ms") ? value * 1000 : value;
  }

  return { status, metadata, displayContent, language: "bash" };
}

/**
 * Parse Edit tool result
 */
function parseEditResult(
  content: string,
  summary: string,
  toolUseResult?: unknown,
): ParsedToolResult {
  const metadata: ToolResultMetadata = {};
  let status: ToolResultStatus = "success";
  let displayContent = content;

  if (isEditToolUseResult(toolUseResult)) {
    const editResult = createEditResult(
      toolUseResult.structuredPatch,
      content,
      20,
    );
    displayContent = editResult.details;

    // Count added/removed lines
    const lines = displayContent.split("\n");
    const addedLines = lines.filter((l) => l.startsWith("+")).length;
    const removedLines = lines.filter((l) => l.startsWith("-")).length;
    metadata.lineCount = addedLines + removedLines;
  }

  // Check for error indicators in content
  if (
    content.toLowerCase().includes("error") ||
    content.toLowerCase().includes("failed")
  ) {
    status = "error";
  }

  return { status, metadata, displayContent, language: "diff" };
}

/**
 * Parse Read tool result
 */
function parseReadResult(content: string, summary: string): ParsedToolResult {
  const metadata: ToolResultMetadata = {};
  const status: ToolResultStatus = "success";

  // Extract line count from summary
  const lineMatch = summary.match(/(\d+)\s*lines?/i);
  if (lineMatch) {
    metadata.lineCount = parseInt(lineMatch[1], 10);
  } else {
    metadata.lineCount = content.split("\n").length;
  }

  // Try to detect language from file path in summary
  const pathMatch = summary.match(/([^\s]+\.\w+)/);
  const language = pathMatch ? detectLanguageFromPath(pathMatch[1]) : undefined;

  return { status, metadata, displayContent: content, language };
}

/**
 * Parse Write tool result
 */
function parseWriteResult(content: string, summary: string): ParsedToolResult {
  const metadata: ToolResultMetadata = {};
  let status: ToolResultStatus = "success";

  // Extract file count if multiple files
  const fileMatch = summary.match(/(\d+)\s*files?/i);
  if (fileMatch) {
    metadata.fileCount = parseInt(fileMatch[1], 10);
  }

  // Check for error
  if (
    content.toLowerCase().includes("error") ||
    content.toLowerCase().includes("failed")
  ) {
    status = "error";
  }

  // Try to detect language
  const pathMatch = summary.match(/([^\s]+\.\w+)/);
  const language = pathMatch ? detectLanguageFromPath(pathMatch[1]) : undefined;

  return { status, metadata, displayContent: content, language };
}

/**
 * Parse Grep tool result
 */
function parseGrepResult(content: string): ParsedToolResult {
  const metadata: ToolResultMetadata = {};
  let status: ToolResultStatus = "success";

  // Count matches
  const lines = content.trim().split("\n").filter(Boolean);
  metadata.matchCount = lines.length;

  // Count unique files
  const fileSet = new Set<string>();
  for (const line of lines) {
    const match = line.match(/^([^:]+):/);
    if (match) {
      fileSet.add(match[1]);
    }
  }
  if (fileSet.size > 0) {
    metadata.fileCount = fileSet.size;
  }

  // No matches is a warning, not an error
  if (lines.length === 0) {
    status = "warning";
  }

  return { status, metadata, displayContent: content };
}

/**
 * Parse Glob tool result
 */
function parseGlobResult(content: string): ParsedToolResult {
  const metadata: ToolResultMetadata = {};
  let status: ToolResultStatus = "success";

  // Count files
  const lines = content.trim().split("\n").filter(Boolean);
  metadata.fileCount = lines.length;

  // No matches is a warning
  if (lines.length === 0) {
    status = "warning";
  }

  return { status, metadata, displayContent: content };
}
