import React, { useState, useMemo } from "react";
import { CodeBlock } from "./CodeBlock";
import { CopyButton } from "./CopyButton";
import { isBashToolUseResult } from "../../utils/contentUtils";
import type { ToolResultMetadata } from "../../utils/toolResultUtils";
import {
  parseToolResult,
  formatDuration,
  getStatusIcon,
  getStatusColorScheme,
} from "../../utils/toolResultUtils";

// Maximum lines to show before truncating
const DEFAULT_MAX_LINES = 20;
const COLLAPSED_MAX_LINES = 5;

interface ToolResultDisplayProps {
  toolName: string;
  content: string;
  summary: string;
  toolUseResult?: unknown;
}

/**
 * Enhanced tool result display with status indicators,
 * tool-specific formatting, metadata, and smart truncation
 */
export function ToolResultDisplay({
  toolName,
  content,
  summary,
  toolUseResult,
}: ToolResultDisplayProps) {
  const [isExpanded, setIsExpanded] = useState(false);

  // Parse the tool result to extract status and metadata
  const { status, metadata, displayContent, language } = useMemo(() => {
    return parseToolResult(toolName, content, summary, toolUseResult);
  }, [toolName, content, summary, toolUseResult]);

  // Get status-based styling
  const colorScheme = getStatusColorScheme(status);
  const statusIcon = getStatusIcon(status);

  // Calculate truncation
  const lines = displayContent.split("\n");
  const totalLines = lines.length;
  const maxLines = isExpanded ? DEFAULT_MAX_LINES * 10 : COLLAPSED_MAX_LINES;
  const shouldTruncate = totalLines > maxLines;
  const truncatedContent = shouldTruncate
    ? lines.slice(0, maxLines).join("\n")
    : displayContent;
  const hiddenLines = totalLines - maxLines;

  return (
    <div
      className={`mb-3 rounded-lg ${colorScheme.bg} border ${colorScheme.border} overflow-hidden`}
    >
      {/* Header */}
      <div
        className={`px-2 sm:px-3 py-1.5 sm:py-2 ${colorScheme.headerBg} flex items-center justify-between gap-1 sm:gap-2`}
      >
        <div className="flex items-center gap-1 sm:gap-2 min-w-0">
          <span
            className="text-sm sm:text-base flex-shrink-0"
            aria-label={status}
          >
            {statusIcon}
          </span>
          <span
            className={`text-xs sm:text-sm font-semibold ${colorScheme.header}`}
          >
            {toolName}
          </span>
          {summary && (
            <span
              className={`text-xs sm:text-sm ${colorScheme.content} opacity-80 truncate hidden sm:inline`}
            >
              {summary}
            </span>
          )}
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <ToolMetadataDisplay metadata={metadata} colorScheme={colorScheme} />
          <CopyButton
            content={displayContent}
            className={`opacity-60 hover:opacity-100 ${colorScheme.content}`}
          />
        </div>
      </div>

      {/* Content */}
      {displayContent.trim() && (
        <div className="px-2 sm:px-3 py-1.5 sm:py-2">
          <ToolContentRenderer
            toolName={toolName}
            content={truncatedContent}
            language={language}
            colorScheme={colorScheme}
            toolUseResult={toolUseResult}
          />

          {/* Truncation indicator and expand/collapse */}
          {(shouldTruncate || isExpanded) &&
            totalLines > COLLAPSED_MAX_LINES && (
              <div className="mt-2 flex items-center gap-2">
                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  className={`text-xs sm:text-sm ${colorScheme.content} hover:underline focus:outline-none focus:ring-2 focus:ring-offset-2 rounded px-2 py-1`}
                  aria-expanded={isExpanded}
                >
                  {isExpanded ? (
                    <span>Collapse</span>
                  ) : (
                    <span>
                      Show {hiddenLines} more line{hiddenLines !== 1 ? "s" : ""}
                    </span>
                  )}
                </button>
              </div>
            )}
        </div>
      )}
    </div>
  );
}

interface ToolMetadataDisplayProps {
  metadata: ToolResultMetadata;
  colorScheme: ReturnType<typeof getStatusColorScheme>;
}

/**
 * Displays metadata like duration, file count, line count
 */
function ToolMetadataDisplay({
  metadata,
  colorScheme,
}: ToolMetadataDisplayProps) {
  const items: React.ReactNode[] = [];

  if (metadata.duration !== undefined) {
    items.push(
      <span
        key="duration"
        className={`text-xs sm:text-sm ${colorScheme.content} opacity-70`}
      >
        {formatDuration(metadata.duration)}
      </span>,
    );
  }

  if (metadata.fileCount !== undefined) {
    items.push(
      <span
        key="fileCount"
        className={`text-xs sm:text-sm ${colorScheme.content} opacity-70`}
      >
        {metadata.fileCount} file{metadata.fileCount !== 1 ? "s" : ""}
      </span>,
    );
  }

  if (metadata.lineCount !== undefined) {
    items.push(
      <span
        key="lineCount"
        className={`text-xs sm:text-sm ${colorScheme.content} opacity-70`}
      >
        {metadata.lineCount} line{metadata.lineCount !== 1 ? "s" : ""}
      </span>,
    );
  }

  if (metadata.matchCount !== undefined) {
    items.push(
      <span
        key="matchCount"
        className={`text-xs sm:text-sm ${colorScheme.content} opacity-70`}
      >
        {metadata.matchCount} match{metadata.matchCount !== 1 ? "es" : ""}
      </span>,
    );
  }

  if (items.length === 0) return null;

  return (
    <div className="flex items-center gap-2">
      {items.map((item, index) => {
        // Get the key from the item's props
        const itemKey =
          React.isValidElement(item) && item.key ? item.key : index;
        return (
          <React.Fragment key={itemKey}>
            {index > 0 && (
              <span className={`${colorScheme.content} opacity-40`}>|</span>
            )}
            {item}
          </React.Fragment>
        );
      })}
    </div>
  );
}

interface ToolContentRendererProps {
  toolName: string;
  content: string;
  language?: string;
  colorScheme: ReturnType<typeof getStatusColorScheme>;
  toolUseResult?: unknown;
}

/**
 * Renders content with tool-specific formatting
 */
function ToolContentRenderer({
  toolName,
  content,
  language,
  colorScheme,
  toolUseResult,
}: ToolContentRendererProps) {
  // File operations with syntax highlighting
  if (toolName === "Edit" || toolName === "Write" || toolName === "Read") {
    return <FileOperationContent content={content} language={language} />;
  }

  // Bash commands with terminal styling
  if (toolName === "Bash") {
    return <BashContent content={content} toolUseResult={toolUseResult} />;
  }

  // Search operations with structured results
  if (toolName === "Grep" || toolName === "Glob") {
    return <SearchResultContent content={content} toolName={toolName} />;
  }

  // Default rendering
  return (
    <pre
      className={`whitespace-pre-wrap ${colorScheme.content} text-xs sm:text-sm font-mono leading-relaxed`}
    >
      {content}
    </pre>
  );
}

interface FileOperationContentProps {
  content: string;
  language?: string;
}

/**
 * Renders file operation results with syntax highlighting and diff display
 */
function FileOperationContent({
  content,
  language,
}: FileOperationContentProps) {
  // Check if content looks like a diff
  // Look for diff hunk headers (@@ ... @@) or consecutive +/- lines
  const lines = content.split("\n");
  const hasHunkHeader = lines.some((line) => line.startsWith("@@"));
  const hasDiffLines =
    lines.filter((line) => line.startsWith("+") || line.startsWith("-"))
      .length >= 2;
  const isDiff = hasHunkHeader || hasDiffLines;

  if (isDiff) {
    return <DiffDisplay content={content} />;
  }

  // Use syntax highlighting for file content
  if (language) {
    return <CodeBlock code={content} language={language} />;
  }

  // Plain text for other file content
  return (
    <pre className="whitespace-pre-wrap text-emerald-700 dark:text-emerald-300 text-xs sm:text-sm font-mono leading-relaxed bg-emerald-50/50 dark:bg-emerald-900/30 p-2 rounded">
      {content}
    </pre>
  );
}

interface DiffDisplayProps {
  content: string;
}

/**
 * Renders diff content with added/removed line highlighting
 */
function DiffDisplay({ content }: DiffDisplayProps) {
  const lines = content.split("\n");

  return (
    <div className="font-mono text-xs sm:text-sm leading-relaxed rounded overflow-hidden">
      {lines.map((line, index) => {
        let lineClass =
          "px-2 py-0.5 text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800/50";

        if (line.startsWith("+")) {
          lineClass =
            "px-2 py-0.5 text-green-800 dark:text-green-300 bg-green-100 dark:bg-green-900/40";
        } else if (line.startsWith("-")) {
          lineClass =
            "px-2 py-0.5 text-red-800 dark:text-red-300 bg-red-100 dark:bg-red-900/40";
        } else if (line.startsWith("@@")) {
          lineClass =
            "px-2 py-0.5 text-blue-700 dark:text-blue-300 bg-blue-100 dark:bg-blue-900/40 font-semibold";
        }

        return (
          <div key={index} className={lineClass}>
            <span className="select-all">{line || " "}</span>
          </div>
        );
      })}
    </div>
  );
}

interface BashContentProps {
  content: string;
  toolUseResult?: unknown;
}

/**
 * Renders bash output with terminal-style formatting
 */
function BashContent({ content, toolUseResult }: BashContentProps) {
  // Extract stdout and stderr if available
  let stdout = content;
  let stderr = "";

  if (isBashToolUseResult(toolUseResult)) {
    stdout = toolUseResult.stdout || "";
    stderr = toolUseResult.stderr || "";
  }

  return (
    <div className="font-mono text-xs sm:text-sm rounded overflow-hidden">
      {/* Terminal header */}
      <div className="bg-slate-800 dark:bg-slate-900 px-2 sm:px-3 py-1 sm:py-1.5 flex items-center gap-1 sm:gap-2">
        <div className="flex gap-1.5">
          <div className="w-2.5 h-2.5 rounded-full bg-red-500"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-yellow-500"></div>
          <div className="w-2.5 h-2.5 rounded-full bg-green-500"></div>
        </div>
        <span className="text-slate-400 text-xs sm:text-sm ml-1 sm:ml-2">
          Terminal
        </span>
      </div>

      {/* Terminal content */}
      <div className="bg-slate-900 dark:bg-black p-2 sm:p-3 text-slate-100">
        {stdout && (
          <pre className="whitespace-pre-wrap leading-relaxed">{stdout}</pre>
        )}
        {stderr && (
          <pre className="whitespace-pre-wrap leading-relaxed text-red-400 mt-2">
            {stderr}
          </pre>
        )}
        {!stdout && !stderr && (
          <span className="text-slate-500 italic">No output</span>
        )}
      </div>
    </div>
  );
}

interface SearchResultContentProps {
  content: string;
  toolName: string;
}

/**
 * Renders search results with structured formatting
 */
function SearchResultContent({ content, toolName }: SearchResultContentProps) {
  const lines = content.trim().split("\n").filter(Boolean);

  if (lines.length === 0) {
    return (
      <div className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 italic py-2">
        No results found
      </div>
    );
  }

  // For Glob results (file paths)
  if (toolName === "Glob") {
    return (
      <div className="space-y-0.5">
        {lines.map((line, index) => (
          <div
            key={index}
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-mono py-0.5 px-1 sm:px-2 rounded hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30"
          >
            <span className="text-emerald-500 dark:text-emerald-400 flex-shrink-0">
              <FileIcon />
            </span>
            <span className="text-emerald-800 dark:text-emerald-200 truncate">
              {line}
            </span>
          </div>
        ))}
      </div>
    );
  }

  // For Grep results (file:line:content format)
  return (
    <div className="space-y-0.5">
      {lines.map((line, index) => {
        // Try to parse grep-style output (file:line:content)
        const match = line.match(/^([^:]+):(\d+):(.*)$/);

        if (match) {
          const [, file, lineNum, matchContent] = match;
          return (
            <div
              key={index}
              className="text-xs sm:text-sm font-mono py-0.5 px-1 sm:px-2 rounded hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30"
            >
              <span className="text-emerald-600 dark:text-emerald-400 break-all">
                {file}
              </span>
              <span className="text-slate-400">:</span>
              <span className="text-blue-600 dark:text-blue-400">
                {lineNum}
              </span>
              <span className="text-slate-400">:</span>
              <span className="text-slate-700 dark:text-slate-300 ml-1 break-all">
                {matchContent}
              </span>
            </div>
          );
        }

        // Plain line (probably just a file path)
        return (
          <div
            key={index}
            className="flex items-center gap-1 sm:gap-2 text-xs sm:text-sm font-mono py-0.5 px-1 sm:px-2 rounded hover:bg-emerald-100/50 dark:hover:bg-emerald-900/30"
          >
            <span className="text-emerald-800 dark:text-emerald-200 break-all">
              {line}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Simple file icon component
 */
function FileIcon() {
  return (
    <svg
      className="w-3.5 h-3.5"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2}
        d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
      />
    </svg>
  );
}

export { DiffDisplay, BashContent, SearchResultContent, FileOperationContent };
