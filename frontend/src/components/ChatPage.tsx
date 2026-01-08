import { useEffect, useCallback, useState } from "react";
import { useLocation, useSearchParams } from "react-router-dom";
import type { ProjectInfo } from "../types";
import { useClaudeStreaming } from "../hooks/useClaudeStreaming";
import { useChatState } from "../hooks/chat/useChatState";
import { useUnifiedPermissions } from "../hooks/chat/useUnifiedPermissions";
import { useAbortController } from "../hooks/chat/useAbortController";
import { useImagePaste } from "../hooks/chat/useImagePaste";
import { useNavigation } from "../hooks/chat/useNavigation";
import { useMessageSending } from "../hooks/chat/useMessageSending";
import { usePermissionHandlers } from "../hooks/chat/usePermissionHandlers";
import { useAutoHistoryLoader } from "../hooks/useHistoryLoader";
import { SettingsModal } from "./SettingsModal";
import { ChatHeader } from "./chat/ChatHeader";
import { ChatInput } from "./chat/ChatInput";
import { ChatMessages } from "./chat/ChatMessages";
import { HistoryView } from "./HistoryView";
import { getProjectsUrl } from "../config/api";
import { KEYBOARD_SHORTCUTS } from "../utils/constants";
import { normalizeWindowsPath } from "../utils/pathUtils";

export function ChatPage() {
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const [projects, setProjects] = useState<ProjectInfo[]>([]);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  // Extract and normalize working directory from URL
  const workingDirectory = (() => {
    const rawPath = location.pathname.replace("/projects", "");
    if (!rawPath) return undefined;

    // URL decode the path
    const decodedPath = decodeURIComponent(rawPath);

    // Normalize Windows paths (remove leading slash from /C:/... format)
    return normalizeWindowsPath(decodedPath);
  })();

  // Get current view and sessionId from query parameters
  const currentView = searchParams.get("view");
  const sessionId = searchParams.get("sessionId");
  const isHistoryView = currentView === "history";
  const isLoadedConversation = !!sessionId && !isHistoryView;

  const { processStreamLine } = useClaudeStreaming();
  const { abortRequest, createAbortHandler } = useAbortController();

  // Unified permission state management (combines mode state and dialog state)
  const {
    permissionMode,
    setPermissionMode,
    allowedTools,
    permissionRequest,
    closePermissionRequest,
    allowToolTemporary,
    allowToolPermanent,
    planModeRequest,
    closePlanModeRequest,
    askUserQuestionRequest,
    closeAskUserQuestion,
    pendingAskUserQuestionCount,
    isPermissionDialogOpen,
    handlePermissionError,
    handleAskUserQuestion,
  } = useUnifiedPermissions();

  // Navigation handlers
  const {
    handleBackToChat,
    handleBackToHistory,
    handleBackToProjects,
    handleBackToProjectChat,
    handleHistoryClick,
    handleStartNewConversation,
  } = useNavigation({ workingDirectory });

  // Get encoded name for current working directory
  const getEncodedName = useCallback(() => {
    if (!workingDirectory || !projects.length) {
      return null;
    }

    const project = projects.find((p) => p.path === workingDirectory);

    // Normalize paths for comparison (handle Windows path issues)
    const normalizedWorking = normalizeWindowsPath(workingDirectory);
    const normalizedProject = projects.find(
      (p) => normalizeWindowsPath(p.path) === normalizedWorking,
    );

    // Use normalized result if exact match fails
    const finalProject = project || normalizedProject;

    return finalProject?.encodedName || null;
  }, [workingDirectory, projects]);

  // Load conversation history if sessionId is provided
  const {
    messages: historyMessages,
    loading: historyLoading,
    error: historyError,
    sessionId: loadedSessionId,
  } = useAutoHistoryLoader(
    getEncodedName() || undefined,
    sessionId || undefined,
  );

  // Initialize chat state with loaded history
  const {
    messages,
    input,
    isLoading,
    currentSessionId,
    currentRequestId,
    hasShownInitMessage,
    currentAssistantMessage,
    setInput,
    setCurrentSessionId,
    setHasShownInitMessage,
    setHasReceivedInit,
    setCurrentAssistantMessage,
    addMessage,
    updateLastMessage,
    clearInput,
    generateRequestId,
    resetRequestState,
    startRequest,
  } = useChatState({
    initialMessages: historyMessages,
    initialSessionId: loadedSessionId || undefined,
  });

  // Image paste state management
  const { images, handlePaste, removeImage, clearImages, getImagesForRequest } =
    useImagePaste();

  // Message sending hook
  const { sendMessage } = useMessageSending({
    input,
    isLoading,
    currentSessionId,
    allowedTools,
    hasShownInitMessage,
    currentAssistantMessage,
    workingDirectory,
    permissionMode,
    setCurrentSessionId,
    setHasShownInitMessage,
    setHasReceivedInit,
    setCurrentAssistantMessage,
    generateRequestId,
    clearInput,
    clearImages,
    getImagesForRequest,
    startRequest,
    addMessage,
    updateLastMessage,
    resetRequestState,
    processStreamLine,
    createAbortHandler,
    onPermissionError: handlePermissionError,
    onAskUserQuestion: handleAskUserQuestion,
  });

  // Permission handlers hook
  const { permissionData, planPermissionData, askUserQuestionData } =
    usePermissionHandlers({
      allowedTools,
      permissionRequest,
      planModeRequest,
      askUserQuestionRequest,
      pendingAskUserQuestionCount,
      closePermissionRequest,
      closePlanModeRequest,
      closeAskUserQuestion,
      allowToolTemporary,
      allowToolPermanent,
      setPermissionMode,
      currentSessionId,
      sendMessage,
    });

  const handleAbort = useCallback(() => {
    abortRequest(currentRequestId, isLoading, resetRequestState);
  }, [abortRequest, currentRequestId, isLoading, resetRequestState]);

  const handleSettingsClick = useCallback(() => {
    setIsSettingsOpen(true);
  }, []);

  const handleSettingsClose = useCallback(() => {
    setIsSettingsOpen(false);
  }, []);

  // Load projects to get encodedName mapping
  useEffect(() => {
    const loadProjects = async () => {
      try {
        const response = await fetch(getProjectsUrl());
        if (response.ok) {
          const data = await response.json();
          setProjects(data.projects || []);
        }
      } catch (error) {
        console.error("Failed to load projects:", error);
      }
    };
    loadProjects();
  }, []);

  // Handle global keyboard shortcuts
  useEffect(() => {
    const handleGlobalKeyDown = (e: KeyboardEvent) => {
      if (e.key === KEYBOARD_SHORTCUTS.ABORT && isLoading && currentRequestId) {
        e.preventDefault();
        handleAbort();
      }
    };

    document.addEventListener("keydown", handleGlobalKeyDown);
    return () => document.removeEventListener("keydown", handleGlobalKeyDown);
  }, [isLoading, currentRequestId, handleAbort]);

  return (
    <div className="min-h-screen bg-slate-50 dark:bg-slate-900 transition-colors duration-300">
      <div className="max-w-6xl mx-auto p-3 sm:p-6 h-screen flex flex-col">
        {/* Header */}
        <ChatHeader
          workingDirectory={workingDirectory}
          sessionId={sessionId}
          isHistoryView={isHistoryView}
          isLoadedConversation={isLoadedConversation}
          onBackToChat={handleBackToChat}
          onBackToHistory={handleBackToHistory}
          onBackToProjects={handleBackToProjects}
          onBackToProjectChat={handleBackToProjectChat}
          onHistoryClick={handleHistoryClick}
          onSettingsClick={handleSettingsClick}
        />

        {/* Main Content */}
        {isHistoryView ? (
          <HistoryView
            workingDirectory={workingDirectory || ""}
            encodedName={getEncodedName()}
            onBack={handleBackToChat}
          />
        ) : historyLoading ? (
          /* Loading conversation history */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <div className="w-8 h-8 border-2 border-slate-300 border-t-slate-600 rounded-full animate-spin mx-auto mb-4"></div>
              <p className="text-slate-600 dark:text-slate-400">
                Loading conversation history...
              </p>
            </div>
          </div>
        ) : historyError ? (
          /* Error loading conversation history */
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center max-w-md">
              <div className="w-16 h-16 mx-auto mb-4 bg-red-100 dark:bg-red-900/20 rounded-full flex items-center justify-center">
                <svg
                  className="w-8 h-8 text-red-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                  />
                </svg>
              </div>
              <h2 className="text-slate-800 dark:text-slate-100 text-xl font-semibold mb-2">
                Error Loading Conversation
              </h2>
              <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                {historyError}
              </p>
              <button
                onClick={handleBackToChat}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                Start New Conversation
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* Chat Messages */}
            <ChatMessages
              messages={messages}
              isLoading={isLoading}
              onStartNewConversation={handleStartNewConversation}
            />

            {/* Input */}
            <ChatInput
              input={input}
              isLoading={isLoading}
              currentRequestId={currentRequestId}
              onInputChange={setInput}
              onSubmit={() => sendMessage()}
              onAbort={handleAbort}
              permissionMode={permissionMode}
              onPermissionModeChange={setPermissionMode}
              showPermissions={isPermissionDialogOpen}
              permissionData={permissionData}
              planPermissionData={planPermissionData}
              askUserQuestionData={askUserQuestionData}
              images={images}
              onPaste={handlePaste}
              onRemoveImage={removeImage}
            />
          </>
        )}

        {/* Settings Modal */}
        <SettingsModal isOpen={isSettingsOpen} onClose={handleSettingsClose} />
      </div>
    </div>
  );
}
