import { Context } from "hono";
import {
  query,
  type PermissionMode,
  type SDKUserMessage,
} from "@anthropic-ai/claude-code";
import type {
  ChatRequest,
  StreamResponse,
  ToolResultContent,
} from "../../shared/types.ts";
import { logger } from "../utils/logger.ts";
import { randomUUID } from "node:crypto";

/**
 * Creates an SDKUserMessage with tool_result content for responding to tool_use requests.
 * This is the proper format for responding to interactive tools like AskUserQuestion.
 *
 * @param toolResult - The tool result content with tool_use_id, content, and optional is_error flag
 * @param sessionId - The current session ID
 * @returns SDKUserMessage with proper tool_result format
 */
function createToolResultMessage(
  toolResult: ToolResultContent,
  sessionId: string,
): SDKUserMessage {
  return {
    type: "user",
    message: {
      role: "user",
      content: [
        {
          type: "tool_result",
          tool_use_id: toolResult.tool_use_id,
          content: toolResult.content,
          // Only include is_error when true (omit for successful responses)
          ...(toolResult.is_error === true ? { is_error: true } : {}),
        },
      ],
    },
    parent_tool_use_id: null,
    session_id: sessionId,
    uuid: randomUUID(),
  };
}

/**
 * Creates an AsyncIterable that yields a single SDKUserMessage.
 * Used for streaming input to the SDK query function.
 */
async function* createSingleMessageIterable(
  message: SDKUserMessage,
): AsyncIterable<SDKUserMessage> {
  yield message;
}

/**
 * Executes a Claude command and yields streaming responses
 * @param message - User message or command
 * @param requestId - Unique request identifier for abort functionality
 * @param requestAbortControllers - Shared map of abort controllers
 * @param cliPath - Path to actual CLI script (detected by validateClaudeCli)
 * @param sessionId - Optional session ID for conversation continuity
 * @param allowedTools - Optional array of allowed tool names
 * @param workingDirectory - Optional working directory for Claude execution
 * @param permissionMode - Optional permission mode for Claude execution
 * @param toolResult - Optional tool result for responding to tool_use requests
 * @returns AsyncGenerator yielding StreamResponse objects
 */
async function* executeClaudeCommand(
  message: string,
  requestId: string,
  requestAbortControllers: Map<string, AbortController>,
  cliPath: string,
  sessionId?: string,
  allowedTools?: string[],
  workingDirectory?: string,
  permissionMode?: PermissionMode,
  toolResult?: ToolResultContent,
): AsyncGenerator<StreamResponse> {
  let abortController: AbortController;

  try {
    // Create and store AbortController for this request
    abortController = new AbortController();
    requestAbortControllers.set(requestId, abortController);

    // Determine the prompt format based on whether we have a toolResult
    let prompt: string | AsyncIterable<SDKUserMessage>;

    if (toolResult && sessionId) {
      // Use structured tool_result format for tool responses (e.g., AskUserQuestion)
      const toolResultMessage = createToolResultMessage(toolResult, sessionId);
      prompt = createSingleMessageIterable(toolResultMessage);
      logger.chat.debug("Sending tool_result response: {toolResult}", {
        toolResult,
      });
    } else {
      // Use plain text prompt for regular messages
      let processedMessage = message;
      if (message.startsWith("/")) {
        // Remove the '/' and send just the command
        processedMessage = message.substring(1);
      }
      prompt = processedMessage;
    }

    for await (const sdkMessage of query({
      prompt,
      options: {
        abortController,
        executable: "node" as const,
        executableArgs: [],
        pathToClaudeCodeExecutable: cliPath,
        ...(sessionId ? { resume: sessionId } : {}),
        ...(allowedTools ? { allowedTools } : {}),
        ...(workingDirectory ? { cwd: workingDirectory } : {}),
        ...(permissionMode ? { permissionMode } : {}),
      },
    })) {
      // Debug logging of raw SDK messages with detailed content
      logger.chat.debug("Claude SDK Message: {sdkMessage}", { sdkMessage });

      yield {
        type: "claude_json",
        data: sdkMessage,
      };
    }

    yield { type: "done" };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);

    // Check for context overflow error
    // Pattern: "input length and `max_tokens` exceed context limit: X + Y > Z"
    if (errorMessage.includes("exceed context limit")) {
      logger.chat.warn("Context overflow detected: {error}", { error });
      yield {
        type: "context_overflow",
        error:
          "The conversation has exceeded the context limit. Please start a new conversation to continue.",
      };
    }
    // Check if error is due to abort
    // TODO: Re-enable when AbortError is properly exported from Claude SDK
    // else if (error instanceof AbortError) {
    //   yield { type: "aborted" };
    // }
    else {
      logger.chat.error("Claude Code execution failed: {error}", { error });
      yield {
        type: "error",
        error: errorMessage,
      };
    }
  } finally {
    // Clean up AbortController from map
    if (requestAbortControllers.has(requestId)) {
      requestAbortControllers.delete(requestId);
    }
  }
}

/**
 * Handles POST /api/chat requests with streaming responses
 * @param c - Hono context object with config variables
 * @param requestAbortControllers - Shared map of abort controllers
 * @returns Response with streaming NDJSON
 */
export async function handleChatRequest(
  c: Context,
  requestAbortControllers: Map<string, AbortController>,
) {
  const chatRequest: ChatRequest = await c.req.json();
  const { cliPath } = c.var.config;

  logger.chat.debug(
    "Received chat request {*}",
    chatRequest as unknown as Record<string, unknown>,
  );

  const stream = new ReadableStream({
    async start(controller) {
      try {
        for await (const chunk of executeClaudeCommand(
          chatRequest.message,
          chatRequest.requestId,
          requestAbortControllers,
          cliPath, // Use detected CLI path from validateClaudeCli
          chatRequest.sessionId,
          chatRequest.allowedTools,
          chatRequest.workingDirectory,
          chatRequest.permissionMode,
          chatRequest.toolResult,
        )) {
          const data = JSON.stringify(chunk) + "\n";
          controller.enqueue(new TextEncoder().encode(data));
        }
        controller.close();
      } catch (error) {
        const errorResponse: StreamResponse = {
          type: "error",
          error: error instanceof Error ? error.message : String(error),
        };
        controller.enqueue(
          new TextEncoder().encode(JSON.stringify(errorResponse) + "\n"),
        );
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "application/x-ndjson",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
