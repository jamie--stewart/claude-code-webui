import { useState, useCallback } from "react";
import type { PermissionMode, AskUserQuestion } from "../../types";

interface PermissionRequest {
  isOpen: boolean;
  toolName: string;
  patterns: string[];
  toolUseId: string;
}

interface PlanModeRequest {
  isOpen: boolean;
  planContent: string;
}

interface AskUserQuestionRequest {
  isOpen: boolean;
  questions: AskUserQuestion[];
  toolUseId: string;
}

/**
 * Queued AskUserQuestion request (without isOpen flag, as queue presence indicates openness)
 */
interface QueuedAskUserQuestionRequest {
  questions: AskUserQuestion[];
  toolUseId: string;
}

export interface UseUnifiedPermissionsResult {
  // Permission mode state (formerly usePermissionMode)
  permissionMode: PermissionMode;
  setPermissionMode: (mode: PermissionMode) => void;
  isPlanMode: boolean;
  isDefaultMode: boolean;
  isAcceptEditsMode: boolean;
  isBypassPermissionsMode: boolean;

  // Tool permissions (formerly usePermissions)
  allowedTools: string[];
  allowToolTemporary: (pattern: string, baseTools?: string[]) => string[];
  allowToolPermanent: (pattern: string, baseTools?: string[]) => string[];
  resetPermissions: () => void;

  // Permission dialog state
  permissionRequest: PermissionRequest | null;
  showPermissionRequest: (
    toolName: string,
    patterns: string[],
    toolUseId: string,
  ) => void;
  closePermissionRequest: () => void;

  // Plan mode dialog state
  planModeRequest: PlanModeRequest | null;
  showPlanModeRequest: (planContent: string) => void;
  closePlanModeRequest: () => void;

  // AskUserQuestion state
  askUserQuestionRequest: AskUserQuestionRequest | null;
  showAskUserQuestion: (
    questions: AskUserQuestion[],
    toolUseId: string,
  ) => void;
  closeAskUserQuestion: () => void;
  pendingAskUserQuestionCount: number;

  // UI state - whether any permission dialog is currently showing
  isPermissionDialogOpen: boolean;

  // Handle incoming permission errors (dispatches to correct dialog)
  handlePermissionError: (
    toolName: string,
    patterns: string[],
    toolUseId: string,
  ) => void;

  // Handle incoming AskUserQuestion requests
  handleAskUserQuestion: (
    questions: AskUserQuestion[],
    toolUseId: string,
  ) => void;
}

/**
 * Unified permission management hook combining mode state, dialog state,
 * and tool permissions into a single cohesive system.
 *
 * This consolidates the functionality previously split across:
 * - usePermissionMode (mode state)
 * - usePermissions (dialog state and tool permissions)
 *
 * The handlers that require sendMessage (usePermissionHandlers) remain separate
 * to avoid circular dependencies with useMessageSending.
 */
export function useUnifiedPermissions(): UseUnifiedPermissionsResult {
  // Permission mode state
  const [permissionMode, setPermissionModeState] =
    useState<PermissionMode>("default");

  // Tool permissions
  const [allowedTools, setAllowedTools] = useState<string[]>([]);

  // Dialog states
  const [permissionRequest, setPermissionRequest] =
    useState<PermissionRequest | null>(null);
  const [planModeRequest, setPlanModeRequest] =
    useState<PlanModeRequest | null>(null);

  // AskUserQuestion queue for handling concurrent requests
  const [askUserQuestionQueue, setAskUserQuestionQueue] = useState<
    QueuedAskUserQuestionRequest[]
  >([]);

  // Permission mode setters
  const setPermissionMode = useCallback((mode: PermissionMode) => {
    setPermissionModeState(mode);
  }, []);

  // Mode helper getters
  const isPlanMode = permissionMode === "plan";
  const isDefaultMode = permissionMode === "default";
  const isAcceptEditsMode = permissionMode === "acceptEdits";
  const isBypassPermissionsMode = permissionMode === "bypassPermissions";

  // Tool permission handlers
  const allowToolTemporary = useCallback(
    (pattern: string, baseTools?: string[]) => {
      const currentAllowedTools = baseTools || allowedTools;
      return [...currentAllowedTools, pattern];
    },
    [allowedTools],
  );

  const allowToolPermanent = useCallback(
    (pattern: string, baseTools?: string[]) => {
      const currentAllowedTools = baseTools || allowedTools;
      const updatedAllowedTools = [...currentAllowedTools, pattern];
      setAllowedTools(updatedAllowedTools);
      return updatedAllowedTools;
    },
    [allowedTools],
  );

  const resetPermissions = useCallback(() => {
    setAllowedTools([]);
  }, []);

  // Permission request dialog handlers
  const showPermissionRequest = useCallback(
    (toolName: string, patterns: string[], toolUseId: string) => {
      setPermissionRequest({
        isOpen: true,
        toolName,
        patterns,
        toolUseId,
      });
    },
    [],
  );

  const closePermissionRequest = useCallback(() => {
    setPermissionRequest(null);
  }, []);

  // Plan mode dialog handlers
  const showPlanModeRequest = useCallback((planContent: string) => {
    setPlanModeRequest({
      isOpen: true,
      planContent,
    });
  }, []);

  const closePlanModeRequest = useCallback(() => {
    setPlanModeRequest(null);
  }, []);

  // AskUserQuestion handlers
  const showAskUserQuestion = useCallback(
    (questions: AskUserQuestion[], toolUseId: string) => {
      setAskUserQuestionQueue((prev) => [...prev, { questions, toolUseId }]);
    },
    [],
  );

  const closeAskUserQuestion = useCallback(() => {
    setAskUserQuestionQueue((prev) => prev.slice(1));
  }, []);

  // Get the current (first) request from the queue for display
  const askUserQuestionRequest: AskUserQuestionRequest | null =
    askUserQuestionQueue.length > 0
      ? {
          isOpen: true,
          questions: askUserQuestionQueue[0].questions,
          toolUseId: askUserQuestionQueue[0].toolUseId,
        }
      : null;

  const pendingAskUserQuestionCount = askUserQuestionQueue.length;

  // Computed UI state - whether any permission dialog is showing
  const isPermissionDialogOpen =
    permissionRequest !== null ||
    planModeRequest !== null ||
    askUserQuestionQueue.length > 0;

  // Handler for incoming permission errors - dispatches to correct dialog
  const handlePermissionError = useCallback(
    (toolName: string, patterns: string[], toolUseId: string) => {
      if (patterns.includes("ExitPlanMode")) {
        // For ExitPlanMode, show plan permission interface instead of regular permission
        showPlanModeRequest("");
      } else {
        showPermissionRequest(toolName, patterns, toolUseId);
      }
    },
    [showPermissionRequest, showPlanModeRequest],
  );

  // Handler for incoming AskUserQuestion requests
  const handleAskUserQuestion = useCallback(
    (questions: AskUserQuestion[], toolUseId: string) => {
      showAskUserQuestion(questions, toolUseId);
    },
    [showAskUserQuestion],
  );

  return {
    // Permission mode state
    permissionMode,
    setPermissionMode,
    isPlanMode,
    isDefaultMode,
    isAcceptEditsMode,
    isBypassPermissionsMode,

    // Tool permissions
    allowedTools,
    allowToolTemporary,
    allowToolPermanent,
    resetPermissions,

    // Permission dialog state
    permissionRequest,
    showPermissionRequest,
    closePermissionRequest,

    // Plan mode dialog state
    planModeRequest,
    showPlanModeRequest,
    closePlanModeRequest,

    // AskUserQuestion state
    askUserQuestionRequest,
    showAskUserQuestion,
    closeAskUserQuestion,
    pendingAskUserQuestionCount,

    // UI state
    isPermissionDialogOpen,

    // Handlers
    handlePermissionError,
    handleAskUserQuestion,
  };
}
