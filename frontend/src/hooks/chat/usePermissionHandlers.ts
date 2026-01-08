import { useCallback } from "react";
import type {
  PermissionMode,
  AskUserQuestion,
  ToolResultContent,
  ImageContent,
} from "../../types";

interface PermissionRequest {
  patterns: string[];
  toolUseId: string;
}

interface AskUserQuestionRequest {
  questions: AskUserQuestion[];
  toolUseId: string;
}

interface PlanModeRequest {
  isOpen: boolean;
  planContent: string;
}

interface UsePermissionHandlersOptions {
  // From useUnifiedPermissions
  allowedTools: string[];
  permissionRequest: PermissionRequest | null;
  planModeRequest: PlanModeRequest | null;
  askUserQuestionRequest: AskUserQuestionRequest | null;
  pendingAskUserQuestionCount: number;
  closePermissionRequest: () => void;
  closePlanModeRequest: () => void;
  closeAskUserQuestion: () => void;
  allowToolTemporary: (pattern: string, baseTools?: string[]) => string[];
  allowToolPermanent: (pattern: string, baseTools?: string[]) => string[];
  setPermissionMode: (mode: PermissionMode) => void;

  // Session state
  currentSessionId: string | null;

  // Message sending
  sendMessage: (
    messageContent?: string,
    tools?: string[],
    hideUserMessage?: boolean,
    overridePermissionMode?: PermissionMode,
    toolResult?: ToolResultContent,
    messageImages?: ImageContent[],
  ) => Promise<void>;
}

/**
 * Hook for creating permission action handlers.
 *
 * This hook bridges the permission state from useUnifiedPermissions with
 * the sendMessage function from useMessageSending. It creates callback
 * handlers for permission dialogs, plan approval, and user questions.
 *
 * Kept separate from useUnifiedPermissions to avoid circular dependencies
 * with useMessageSending.
 */
export function usePermissionHandlers(options: UsePermissionHandlersOptions) {
  const {
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
  } = options;

  // Permission request handlers
  const handlePermissionAllow = useCallback(() => {
    if (!permissionRequest) return;

    // Add all patterns temporarily
    let updatedAllowedTools = allowedTools;
    permissionRequest.patterns.forEach((pattern) => {
      updatedAllowedTools = allowToolTemporary(pattern, updatedAllowedTools);
    });

    closePermissionRequest();

    if (currentSessionId) {
      sendMessage("continue", updatedAllowedTools, true);
    }
  }, [
    permissionRequest,
    currentSessionId,
    sendMessage,
    allowedTools,
    allowToolTemporary,
    closePermissionRequest,
  ]);

  const handlePermissionAllowPermanent = useCallback(() => {
    if (!permissionRequest) return;

    // Add all patterns permanently
    let updatedAllowedTools = allowedTools;
    permissionRequest.patterns.forEach((pattern) => {
      updatedAllowedTools = allowToolPermanent(pattern, updatedAllowedTools);
    });

    closePermissionRequest();

    if (currentSessionId) {
      sendMessage("continue", updatedAllowedTools, true);
    }
  }, [
    permissionRequest,
    currentSessionId,
    sendMessage,
    allowedTools,
    allowToolPermanent,
    closePermissionRequest,
  ]);

  const handlePermissionDeny = useCallback(() => {
    closePermissionRequest();
  }, [closePermissionRequest]);

  // Plan mode request handlers
  const handlePlanAcceptWithEdits = useCallback(() => {
    setPermissionMode("acceptEdits");
    closePlanModeRequest();
    if (currentSessionId) {
      sendMessage("accept", allowedTools, true, "acceptEdits");
    }
  }, [
    setPermissionMode,
    closePlanModeRequest,
    currentSessionId,
    sendMessage,
    allowedTools,
  ]);

  const handlePlanAcceptDefault = useCallback(() => {
    setPermissionMode("default");
    closePlanModeRequest();
    if (currentSessionId) {
      sendMessage("accept", allowedTools, true, "default");
    }
  }, [
    setPermissionMode,
    closePlanModeRequest,
    currentSessionId,
    sendMessage,
    allowedTools,
  ]);

  const handlePlanKeepPlanning = useCallback(() => {
    setPermissionMode("plan");
    closePlanModeRequest();
  }, [setPermissionMode, closePlanModeRequest]);

  // AskUserQuestion handlers
  const handleAskUserQuestionSubmit = useCallback(
    (answers: Record<string, string>) => {
      const toolUseId = askUserQuestionRequest?.toolUseId;
      closeAskUserQuestion();
      if (currentSessionId && toolUseId) {
        // Format answers as JSON and send as proper tool_result
        const answerContent = JSON.stringify(answers);
        const toolResult: ToolResultContent = {
          tool_use_id: toolUseId,
          content: answerContent,
          is_error: false,
        };
        // Send with tool_result - message is just for logging/display purposes
        sendMessage(answerContent, allowedTools, true, undefined, toolResult);
      }
    },
    [
      askUserQuestionRequest,
      closeAskUserQuestion,
      currentSessionId,
      sendMessage,
      allowedTools,
    ],
  );

  const handleAskUserQuestionCancel = useCallback(() => {
    const toolUseId = askUserQuestionRequest?.toolUseId;
    closeAskUserQuestion();
    if (currentSessionId && toolUseId) {
      // Send cancellation as tool_result with is_error: true
      const toolResult: ToolResultContent = {
        tool_use_id: toolUseId,
        content: "User cancelled the question.",
        is_error: true,
      };
      sendMessage(
        "User cancelled the question.",
        allowedTools,
        true,
        undefined,
        toolResult,
      );
    }
  }, [
    askUserQuestionRequest,
    closeAskUserQuestion,
    currentSessionId,
    sendMessage,
    allowedTools,
  ]);

  // Create permission data for inline permission interface
  const permissionData = permissionRequest
    ? {
        patterns: permissionRequest.patterns,
        onAllow: handlePermissionAllow,
        onAllowPermanent: handlePermissionAllowPermanent,
        onDeny: handlePermissionDeny,
      }
    : undefined;

  // Create plan permission data for plan mode interface
  const planPermissionData = planModeRequest
    ? {
        onAcceptWithEdits: handlePlanAcceptWithEdits,
        onAcceptDefault: handlePlanAcceptDefault,
        onKeepPlanning: handlePlanKeepPlanning,
      }
    : undefined;

  // Create AskUserQuestion data for question interface
  const askUserQuestionData = askUserQuestionRequest
    ? {
        questions: askUserQuestionRequest.questions,
        onSubmit: handleAskUserQuestionSubmit,
        onCancel: handleAskUserQuestionCancel,
        pendingCount: pendingAskUserQuestionCount,
      }
    : undefined;

  return {
    handlePermissionAllow,
    handlePermissionAllowPermanent,
    handlePermissionDeny,
    handlePlanAcceptWithEdits,
    handlePlanAcceptDefault,
    handlePlanKeepPlanning,
    handleAskUserQuestionSubmit,
    handleAskUserQuestionCancel,
    permissionData,
    planPermissionData,
    askUserQuestionData,
  };
}
