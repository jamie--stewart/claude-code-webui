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

interface UsePermissionsOptions {
  onPermissionModeChange?: (mode: PermissionMode) => void;
}

export function usePermissions(options: UsePermissionsOptions = {}) {
  const { onPermissionModeChange } = options;
  const [allowedTools, setAllowedTools] = useState<string[]>([]);
  const [permissionRequest, setPermissionRequest] =
    useState<PermissionRequest | null>(null);
  const [planModeRequest, setPlanModeRequest] =
    useState<PlanModeRequest | null>(null);

  // New state for inline permission system
  const [isPermissionMode, setIsPermissionMode] = useState(false);

  const showPermissionRequest = useCallback(
    (toolName: string, patterns: string[], toolUseId: string) => {
      setPermissionRequest({
        isOpen: true,
        toolName,
        patterns,
        toolUseId,
      });
      // Enable inline permission mode
      setIsPermissionMode(true);
    },
    [],
  );

  const closePermissionRequest = useCallback(() => {
    setPermissionRequest(null);
    // Disable inline permission mode
    setIsPermissionMode(false);
  }, []);

  const showPlanModeRequest = useCallback((planContent: string) => {
    setPlanModeRequest({
      isOpen: true,
      planContent,
    });
    setIsPermissionMode(true);
  }, []);

  const closePlanModeRequest = useCallback(() => {
    setPlanModeRequest(null);
    setIsPermissionMode(false);
  }, []);

  // AskUserQuestion state management with queue to handle race conditions
  // When multiple AskUserQuestion requests arrive, they are queued
  // and processed one at a time to prevent overwriting
  const [askUserQuestionQueue, setAskUserQuestionQueue] = useState<
    QueuedAskUserQuestionRequest[]
  >([]);

  // Enqueue a new AskUserQuestion request
  const showAskUserQuestion = useCallback(
    (questions: AskUserQuestion[], toolUseId: string) => {
      setAskUserQuestionQueue((prev) => [...prev, { questions, toolUseId }]);
      setIsPermissionMode(true);
    },
    [],
  );

  // Dequeue the current request (called after submit or cancel)
  const closeAskUserQuestion = useCallback(() => {
    setAskUserQuestionQueue((prev) => {
      const newQueue = prev.slice(1);
      // If queue is now empty, exit permission mode
      if (newQueue.length === 0) {
        setIsPermissionMode(false);
      }
      return newQueue;
    });
  }, []);

  // Get the current (first) request from the queue for display
  // Returns the request in the expected format with isOpen flag
  const askUserQuestionRequest: AskUserQuestionRequest | null =
    askUserQuestionQueue.length > 0
      ? {
          isOpen: true,
          questions: askUserQuestionQueue[0].questions,
          toolUseId: askUserQuestionQueue[0].toolUseId,
        }
      : null;

  // Count of pending questions (useful for UI indication)
  const pendingAskUserQuestionCount = askUserQuestionQueue.length;

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

  // Helper function to update permission mode based on user action
  const updatePermissionMode = useCallback(
    (mode: PermissionMode) => {
      onPermissionModeChange?.(mode);
    },
    [onPermissionModeChange],
  );

  return {
    allowedTools,
    permissionRequest,
    showPermissionRequest,
    closePermissionRequest,
    allowToolTemporary,
    allowToolPermanent,
    resetPermissions,
    isPermissionMode,
    setIsPermissionMode,
    planModeRequest,
    showPlanModeRequest,
    closePlanModeRequest,
    updatePermissionMode,
    // AskUserQuestion
    askUserQuestionRequest,
    showAskUserQuestion,
    closeAskUserQuestion,
    pendingAskUserQuestionCount,
  };
}
