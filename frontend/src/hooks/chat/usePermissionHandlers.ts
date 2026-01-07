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
  // Permissions hook values
  allowedTools: string[];
  permissionRequest: PermissionRequest | null;
  planModeRequest: PlanModeRequest | null;
  askUserQuestionRequest: AskUserQuestionRequest | null;
  pendingAskUserQuestionCount: number;

  // Permissions hook functions
  showPermissionRequest: (
    toolName: string,
    patterns: string[],
    toolUseId: string,
  ) => void;
  closePermissionRequest: () => void;
  allowToolTemporary: (pattern: string, baseTools?: string[]) => string[];
  allowToolPermanent: (pattern: string, baseTools?: string[]) => string[];
  showPlanModeRequest: (planContent: string) => void;
  closePlanModeRequest: () => void;
  updatePermissionMode: (mode: PermissionMode) => void;
  showAskUserQuestion: (
    questions: AskUserQuestion[],
    toolUseId: string,
  ) => void;
  closeAskUserQuestion: () => void;

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

export function usePermissionHandlers(options: UsePermissionHandlersOptions) {
  const {
    allowedTools,
    permissionRequest,
    planModeRequest,
    askUserQuestionRequest,
    pendingAskUserQuestionCount,
    showPermissionRequest,
    closePermissionRequest,
    allowToolTemporary,
    allowToolPermanent,
    showPlanModeRequest,
    closePlanModeRequest,
    updatePermissionMode,
    showAskUserQuestion,
    closeAskUserQuestion,
    currentSessionId,
    sendMessage,
  } = options;

  const handlePermissionError = useCallback(
    (toolName: string, patterns: string[], toolUseId: string) => {
      // Check if this is an ExitPlanMode permission error
      if (patterns.includes("ExitPlanMode")) {
        // For ExitPlanMode, show plan permission interface instead of regular permission
        showPlanModeRequest(""); // Empty plan content since it was already displayed
      } else {
        showPermissionRequest(toolName, patterns, toolUseId);
      }
    },
    [showPermissionRequest, showPlanModeRequest],
  );

  const handleAskUserQuestion = useCallback(
    (questions: AskUserQuestion[], toolUseId: string) => {
      showAskUserQuestion(questions, toolUseId);
    },
    [showAskUserQuestion],
  );

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
    updatePermissionMode("acceptEdits");
    closePlanModeRequest();
    if (currentSessionId) {
      sendMessage("accept", allowedTools, true, "acceptEdits");
    }
  }, [
    updatePermissionMode,
    closePlanModeRequest,
    currentSessionId,
    sendMessage,
    allowedTools,
  ]);

  const handlePlanAcceptDefault = useCallback(() => {
    updatePermissionMode("default");
    closePlanModeRequest();
    if (currentSessionId) {
      sendMessage("accept", allowedTools, true, "default");
    }
  }, [
    updatePermissionMode,
    closePlanModeRequest,
    currentSessionId,
    sendMessage,
    allowedTools,
  ]);

  const handlePlanKeepPlanning = useCallback(() => {
    updatePermissionMode("plan");
    closePlanModeRequest();
  }, [updatePermissionMode, closePlanModeRequest]);

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
    handlePermissionError,
    handleAskUserQuestion,
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
