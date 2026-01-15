import { ChevronLeftIcon } from "@heroicons/react/24/outline";
import type { ProjectInfo } from "../../types";
import { SettingsButton } from "../SettingsButton";
import { HistoryButton } from "./HistoryButton";
import { ProjectDisplay } from "../ProjectDisplay";

interface ChatHeaderProps {
  workingDirectory?: string;
  project?: ProjectInfo | null;
  sessionId: string | null;
  isHistoryView: boolean;
  isLoadedConversation: boolean;
  onBackToChat: () => void;
  onBackToHistory: () => void;
  onBackToProjects: () => void;
  onBackToProjectChat: () => void;
  onHistoryClick: () => void;
  onSettingsClick: () => void;
}

export function ChatHeader({
  workingDirectory,
  project,
  sessionId,
  isHistoryView,
  isLoadedConversation,
  onBackToChat,
  onBackToHistory,
  onBackToProjects,
  onBackToProjectChat,
  onHistoryClick,
  onSettingsClick,
}: ChatHeaderProps) {
  return (
    <div className="flex items-center justify-between mb-4 sm:mb-8 flex-shrink-0">
      <div className="flex items-center gap-4">
        {isHistoryView && (
          <button
            onClick={onBackToChat}
            className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md"
            aria-label="Back to chat"
          >
            <ChevronLeftIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        )}
        {isLoadedConversation && (
          <button
            onClick={onBackToHistory}
            className="p-2 rounded-lg bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 hover:bg-white dark:hover:bg-slate-800 transition-all duration-200 backdrop-blur-sm shadow-sm hover:shadow-md"
            aria-label="Back to history"
          >
            <ChevronLeftIcon className="w-5 h-5 text-slate-600 dark:text-slate-400" />
          </button>
        )}
        <div>
          <nav aria-label="Breadcrumb">
            <div className="flex items-center">
              <button
                onClick={onBackToProjects}
                className="text-slate-800 dark:text-slate-100 text-lg sm:text-3xl font-bold tracking-tight hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded-md px-1 -mx-1"
                aria-label="Back to project selection"
              >
                Claude Code Web UI
              </button>
              {(isHistoryView || sessionId) && (
                <>
                  <span
                    className="text-slate-800 dark:text-slate-100 text-lg sm:text-3xl font-bold tracking-tight mx-3 select-none"
                    aria-hidden="true"
                  >
                    {" "}
                    ›{" "}
                  </span>
                  <h1
                    className="text-slate-800 dark:text-slate-100 text-lg sm:text-3xl font-bold tracking-tight"
                    aria-current="page"
                  >
                    {isHistoryView ? "Conversation History" : "Conversation"}
                  </h1>
                </>
              )}
            </div>
          </nav>
          {workingDirectory && (
            <div className="flex items-center text-sm mt-1">
              <button
                onClick={onBackToProjectChat}
                className="text-slate-600 dark:text-slate-400 hover:text-blue-600 dark:hover:text-blue-400 transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-900 rounded px-1 -mx-1 cursor-pointer"
                aria-label={`Return to new chat in ${workingDirectory}`}
              >
                {project ? (
                  <ProjectDisplay project={project} variant="breadcrumb" />
                ) : (
                  <span className="font-mono">{workingDirectory}</span>
                )}
              </button>
              {sessionId && (
                <span className="ml-2 text-xs text-slate-600 dark:text-slate-400">
                  Session: {sessionId.substring(0, 8)}...
                </span>
              )}
            </div>
          )}
        </div>
      </div>
      <div className="flex items-center gap-3">
        {!isHistoryView && <HistoryButton onClick={onHistoryClick} />}
        <SettingsButton onClick={onSettingsClick} />
      </div>
    </div>
  );
}
