import { useCallback } from "react";
import type {
  ChatMessage,
  ChatRequest,
  PermissionMode,
  AskUserQuestion,
  ToolResultContent,
  ImageContent,
  AllMessage,
} from "../../types";
import { getChatUrl } from "../../config/api";
import type { StreamingContext } from "../streaming/useMessageProcessor";
import { ApiError, getErrorMessage } from "../../types/errors";

interface MessageSendingDependencies {
  // State
  input: string;
  isLoading: boolean;
  currentSessionId: string | null;
  allowedTools: string[];
  hasShownInitMessage: boolean;
  currentAssistantMessage: ChatMessage | null;
  workingDirectory?: string;
  permissionMode: PermissionMode;

  // State setters
  setCurrentSessionId: (sessionId: string) => void;
  setHasShownInitMessage: (shown: boolean) => void;
  setHasReceivedInit: (received: boolean) => void;
  setCurrentAssistantMessage: (msg: ChatMessage | null) => void;

  // Helper functions
  generateRequestId: () => string;
  clearInput: () => void;
  clearImages: () => void;
  getImagesForRequest: () => ImageContent[];
  startRequest: () => void;
  addMessage: (msg: AllMessage) => void;
  updateLastMessage: (content: string) => void;
  resetRequestState: () => void;
  processStreamLine: (line: string, context: StreamingContext) => void;
  createAbortHandler: (requestId: string) => () => Promise<void>;

  // Permission callbacks
  onPermissionError: (
    toolName: string,
    patterns: string[],
    toolUseId: string,
  ) => void;
  onAskUserQuestion: (questions: AskUserQuestion[], toolUseId: string) => void;
}

export function useMessageSending(deps: MessageSendingDependencies) {
  const {
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
    onPermissionError,
    onAskUserQuestion,
  } = deps;

  const sendMessage = useCallback(
    async (
      messageContent?: string,
      tools?: string[],
      hideUserMessage = false,
      overridePermissionMode?: PermissionMode,
      toolResult?: ToolResultContent,
      messageImages?: ImageContent[],
    ) => {
      const content = messageContent || input.trim();
      const imagesToSend = messageImages || getImagesForRequest();

      // Need either text content or images to send
      if ((!content && imagesToSend.length === 0) || isLoading) return;

      const requestId = generateRequestId();

      // Only add user message to chat if not hidden
      if (!hideUserMessage) {
        const imageIndicator =
          imagesToSend.length > 0
            ? ` [${imagesToSend.length} image${imagesToSend.length > 1 ? "s" : ""}]`
            : "";
        const userMessage: ChatMessage = {
          type: "chat",
          role: "user",
          content: content + imageIndicator,
          timestamp: Date.now(),
        };
        addMessage(userMessage);
      }

      if (!messageContent) {
        clearInput();
        clearImages();
      }
      startRequest();

      try {
        const response = await fetch(getChatUrl(), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            message: content,
            requestId,
            ...(currentSessionId ? { sessionId: currentSessionId } : {}),
            allowedTools: tools || allowedTools,
            ...(workingDirectory ? { workingDirectory } : {}),
            permissionMode: overridePermissionMode || permissionMode,
            ...(toolResult ? { toolResult } : {}),
            ...(imagesToSend.length > 0 ? { images: imagesToSend } : {}),
          } as ChatRequest),
        });

        if (!response.ok) {
          throw ApiError.fromResponse(response, getChatUrl());
        }

        if (!response.body) {
          throw new ApiError("No response body received", {
            endpoint: getChatUrl(),
            retryable: true,
          });
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        // Local state for this streaming session
        let localHasReceivedInit = false;
        let shouldAbort = false;

        const streamingContext: StreamingContext = {
          currentAssistantMessage,
          setCurrentAssistantMessage,
          addMessage,
          updateLastMessage,
          onSessionId: setCurrentSessionId,
          shouldShowInitMessage: () => !hasShownInitMessage,
          onInitMessageShown: () => setHasShownInitMessage(true),
          get hasReceivedInit() {
            return localHasReceivedInit;
          },
          setHasReceivedInit: (received: boolean) => {
            localHasReceivedInit = received;
            setHasReceivedInit(received);
          },
          onPermissionError,
          onAbortRequest: async () => {
            shouldAbort = true;
            await createAbortHandler(requestId)();
          },
          onAskUserQuestion,
        };

        while (true) {
          const { done, value } = await reader.read();
          if (done || shouldAbort) break;

          const chunk = decoder.decode(value);
          const lines = chunk.split("\n").filter((line) => line.trim());

          for (const line of lines) {
            if (shouldAbort) break;
            processStreamLine(line, streamingContext);
          }

          if (shouldAbort) break;
        }
      } catch (error) {
        console.error("Failed to send message:", error);
        const errorMessage = getErrorMessage(error);
        addMessage({
          type: "chat",
          role: "assistant",
          content: `Error: ${errorMessage}`,
          timestamp: Date.now(),
        });
      } finally {
        resetRequestState();
      }
    },
    [
      input,
      isLoading,
      currentSessionId,
      allowedTools,
      hasShownInitMessage,
      currentAssistantMessage,
      workingDirectory,
      permissionMode,
      generateRequestId,
      clearInput,
      clearImages,
      getImagesForRequest,
      startRequest,
      addMessage,
      updateLastMessage,
      setCurrentSessionId,
      setHasShownInitMessage,
      setHasReceivedInit,
      setCurrentAssistantMessage,
      resetRequestState,
      processStreamLine,
      onPermissionError,
      onAskUserQuestion,
      createAbortHandler,
    ],
  );

  return { sendMessage };
}
