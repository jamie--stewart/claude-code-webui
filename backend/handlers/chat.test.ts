import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Context } from "hono";
import { handleChatRequest } from "./chat";
import type { ChatRequest, ToolResultContent } from "../../shared/types";
import { query } from "@anthropic-ai/claude-code";

// Define minimal mock types for Claude Code SDK to maintain type safety in tests
type MockClaudeCode = {
  query: typeof vi.fn;
};

vi.mock(
  "@anthropic-ai/claude-code",
  (): MockClaudeCode => ({
    query: vi.fn(),
  }),
);

// Mock logger
vi.mock("../utils/logger", () => ({
  logger: {
    chat: {
      debug: vi.fn(),
      warn: vi.fn(),
      error: vi.fn(),
    },
  },
}));

const mockQuery = vi.mocked(query);

describe("Chat Handler - Permission Mode Tests", () => {
  let mockContext: Context;
  let requestAbortControllers: Map<string, AbortController>;

  beforeEach(() => {
    requestAbortControllers = new Map();

    // Create mock context
    mockContext = {
      req: {
        json: vi.fn(),
      },
      var: {
        config: {
          cliPath: "/path/to/claude-cli",
        },
      },
    } as any;

    vi.clearAllMocks();
  });

  afterEach(() => {
    requestAbortControllers.clear();
  });

  describe("Permission Mode Parameter Handling", () => {
    it("should pass permissionMode 'plan' to Claude SDK", async () => {
      const chatRequest: ChatRequest = {
        message: "Test message",
        requestId: "test-123",
        permissionMode: "plan",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      // Mock SDK to return simple message and complete
      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Response" }] },
            session_id: "test-session",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      const response = await handleChatRequest(
        mockContext,
        requestAbortControllers,
      );

      expect(mockQuery).toHaveBeenCalledWith({
        prompt: "Test message",
        options: expect.objectContaining({
          permissionMode: "plan",
          abortController: expect.any(AbortController),
          executable: "node",
          executableArgs: [],
          pathToClaudeCodeExecutable: "/path/to/claude-cli",
        }),
      });

      expect(response).toBeInstanceOf(Response);
      expect(response.headers.get("Content-Type")).toBe("application/x-ndjson");
    });

    it("should pass permissionMode 'acceptEdits' to Claude SDK", async () => {
      const chatRequest: ChatRequest = {
        message: "Test message",
        requestId: "test-456",
        permissionMode: "acceptEdits",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Response" }] },
            session_id: "test-session",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      await handleChatRequest(mockContext, requestAbortControllers);

      expect(mockQuery).toHaveBeenCalledWith({
        prompt: "Test message",
        options: expect.objectContaining({
          permissionMode: "acceptEdits",
        }),
      });
    });

    it("should pass permissionMode 'default' to Claude SDK", async () => {
      const chatRequest: ChatRequest = {
        message: "Test message",
        requestId: "test-789",
        permissionMode: "default",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Response" }] },
            session_id: "test-session",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      await handleChatRequest(mockContext, requestAbortControllers);

      expect(mockQuery).toHaveBeenCalledWith({
        prompt: "Test message",
        options: expect.objectContaining({
          permissionMode: "default",
        }),
      });
    });

    it("should not include permissionMode in options when undefined", async () => {
      const chatRequest: ChatRequest = {
        message: "Test message",
        requestId: "test-undefined",
        // permissionMode is undefined
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Response" }] },
            session_id: "test-session",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      await handleChatRequest(mockContext, requestAbortControllers);

      const queryCall = mockQuery.mock.calls[0][0];
      expect(queryCall.options).not.toHaveProperty("permissionMode");
    });

    it("should handle permissionMode alongside other parameters", async () => {
      const chatRequest: ChatRequest = {
        message: "Test message with all params",
        requestId: "test-all-params",
        sessionId: "session-123",
        allowedTools: ["Bash", "Edit"],
        workingDirectory: "/project/path",
        permissionMode: "plan",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Response" }] },
            session_id: "test-session",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      await handleChatRequest(mockContext, requestAbortControllers);

      expect(mockQuery).toHaveBeenCalledWith({
        prompt: "Test message with all params",
        options: expect.objectContaining({
          permissionMode: "plan",
          resume: "session-123",
          allowedTools: ["Bash", "Edit"],
          cwd: "/project/path",
          abortController: expect.any(AbortController),
          executable: "node",
          executableArgs: [],
          pathToClaudeCodeExecutable: "/path/to/claude-cli",
        }),
      });
    });
  });

  describe("Message Processing with Permission Mode", () => {
    it("should process slash commands with permissionMode", async () => {
      const chatRequest: ChatRequest = {
        message: "/help",
        requestId: "test-slash",
        permissionMode: "plan",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Help response" }] },
            session_id: "test-session",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      await handleChatRequest(mockContext, requestAbortControllers);

      // Should strip the slash and pass "help" to SDK
      expect(mockQuery).toHaveBeenCalledWith({
        prompt: "help",
        options: expect.objectContaining({
          permissionMode: "plan",
        }),
      });
    });

    it("should handle regular messages with permissionMode", async () => {
      const chatRequest: ChatRequest = {
        message: "Regular message",
        requestId: "test-regular",
        permissionMode: "acceptEdits",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Regular response" }] },
            session_id: "test-session",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      await handleChatRequest(mockContext, requestAbortControllers);

      expect(mockQuery).toHaveBeenCalledWith({
        prompt: "Regular message",
        options: expect.objectContaining({
          permissionMode: "acceptEdits",
        }),
      });
    });
  });

  describe("Stream Response Generation", () => {
    it("should yield SDK messages with permissionMode context", async () => {
      const chatRequest: ChatRequest = {
        message: "Test streaming",
        requestId: "test-stream",
        permissionMode: "plan",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      const mockMessages = [
        {
          type: "system",
          subtype: "init",
          cwd: "/test",
          tools: [],
          session_id: "test",
          apiKeySource: "env",
          mcp_servers: {},
          model: "test",
          is_resuming: false,
        } as any,
        {
          type: "assistant",
          message: { content: [{ type: "text", text: "Streaming response" }] },
          session_id: "test",
          parent_tool_use_id: null,
        } as any,
        {
          type: "result",
          subtype: "success",
          usage: { input_tokens: 10, output_tokens: 5 },
          session_id: "test",
        } as any,
      ];

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          for (const message of mockMessages) {
            yield message;
          }
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      const response = await handleChatRequest(
        mockContext,
        requestAbortControllers,
      );
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      let allChunks = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        allChunks += decoder.decode(value);
      }

      const lines = allChunks.trim().split("\n");
      expect(lines).toHaveLength(4); // 3 SDK messages + 1 done message

      // Parse each line to verify structure
      const parsedLines = lines.map((line) => JSON.parse(line));

      expect(parsedLines[0]).toEqual({
        type: "claude_json",
        data: mockMessages[0],
      });

      expect(parsedLines[1]).toEqual({
        type: "claude_json",
        data: mockMessages[1],
      });

      expect(parsedLines[2]).toEqual({
        type: "claude_json",
        data: mockMessages[2],
      });

      expect(parsedLines[3]).toEqual({
        type: "done",
      });
    });
  });

  describe("Error Handling with Permission Mode", () => {
    it("should handle SDK errors when using permissionMode", async () => {
      const chatRequest: ChatRequest = {
        message: "Error test",
        requestId: "test-error",
        permissionMode: "plan",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          throw new Error("SDK execution failed");
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      const response = await handleChatRequest(
        mockContext,
        requestAbortControllers,
      );
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      let allChunks = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        allChunks += decoder.decode(value);
      }

      const lines = allChunks.trim().split("\n");
      expect(lines).toHaveLength(1);

      const errorResponse = JSON.parse(lines[0]);
      expect(errorResponse).toEqual({
        type: "error",
        error: "SDK execution failed",
      });
    });

    describe("Context Overflow Detection", () => {
      const contextOverflowTestCases = [
        {
          name: "exceed context limit",
          errorMessage:
            "input length and `max_tokens` exceed context limit: 150000 + 8096 > 128000",
        },
        {
          name: "exceed context limit (case insensitive)",
          errorMessage: "EXCEED CONTEXT LIMIT",
        },
        {
          name: "context window exceeded",
          errorMessage: "context window exceeded",
        },
        {
          name: "context length exceeded",
          errorMessage: "The context length has been exceeded",
        },
        {
          name: "maximum context length",
          errorMessage: "maximum context length exceeded",
        },
        { name: "max context size", errorMessage: "max context size reached" },
        { name: "max context limit", errorMessage: "max context limit hit" },
        { name: "token limit exceeded", errorMessage: "token limit exceeded" },
        {
          name: "input too long",
          errorMessage: "The input is too long for this model",
        },
        {
          name: "conversation too long",
          errorMessage: "The conversation is too long to continue",
        },
      ];

      for (const testCase of contextOverflowTestCases) {
        it(`should detect context overflow for pattern: ${testCase.name}`, async () => {
          const chatRequest: ChatRequest = {
            message: "Test message",
            requestId: `test-overflow-${testCase.name}`,
          };

          mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

          mockQuery.mockReturnValue({
            [Symbol.asyncIterator]: async function* () {
              throw new Error(testCase.errorMessage);
            },
            interrupt: vi.fn(),
            next: vi.fn(),
            return: vi.fn(),
            throw: vi.fn(),
          } as any);

          const response = await handleChatRequest(
            mockContext,
            requestAbortControllers,
          );
          const reader = response.body!.getReader();
          const decoder = new TextDecoder();

          let allChunks = "";
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            allChunks += decoder.decode(value);
          }

          const lines = allChunks.trim().split("\n");
          expect(lines).toHaveLength(1);

          const errorResponse = JSON.parse(lines[0]);
          expect(errorResponse.type).toBe("context_overflow");
          expect(errorResponse.error).toContain("context limit");
        });
      }

      it("should not detect context overflow for unrelated errors", async () => {
        const chatRequest: ChatRequest = {
          message: "Test message",
          requestId: "test-non-overflow",
        };

        mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

        mockQuery.mockReturnValue({
          [Symbol.asyncIterator]: async function* () {
            throw new Error("Network connection failed");
          },
          interrupt: vi.fn(),
          next: vi.fn(),
          return: vi.fn(),
          throw: vi.fn(),
        } as any);

        const response = await handleChatRequest(
          mockContext,
          requestAbortControllers,
        );
        const reader = response.body!.getReader();
        const decoder = new TextDecoder();

        let allChunks = "";
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          allChunks += decoder.decode(value);
        }

        const lines = allChunks.trim().split("\n");
        const errorResponse = JSON.parse(lines[0]);
        expect(errorResponse.type).toBe("error");
        expect(errorResponse.error).toBe("Network connection failed");
      });
    });

    // TODO: Re-enable when AbortError is properly exported from Claude SDK
    it.skip("should handle abort errors when using permissionMode", async () => {
      // Test currently skipped because AbortError is not exported from Claude SDK
      // When AbortError becomes available, update this test accordingly
      const chatRequest: ChatRequest = {
        message: "Abort test",
        requestId: "test-abort",
        permissionMode: "acceptEdits",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          throw new Error("Operation aborted");
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      const response = await handleChatRequest(
        mockContext,
        requestAbortControllers,
      );
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      let allChunks = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        allChunks += decoder.decode(value);
      }

      const lines = allChunks.trim().split("\n");
      expect(lines).toHaveLength(1);

      const errorResponse = JSON.parse(lines[0]);
      expect(errorResponse).toEqual({
        type: "error",
        error: "Operation aborted",
      });
    });
  });

  describe("Abort Controller Management with Permission Mode", () => {
    it("should manage abort controller correctly with permissionMode", async () => {
      const chatRequest: ChatRequest = {
        message: "Controller test",
        requestId: "test-controller",
        permissionMode: "plan",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Response" }] },
            session_id: "test-session",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      expect(requestAbortControllers.size).toBe(0);

      const response = await handleChatRequest(
        mockContext,
        requestAbortControllers,
      );

      // Read the response to ensure the generator completes
      const reader = response.body!.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }

      // Controller should be cleaned up after completion
      expect(requestAbortControllers.size).toBe(0);
    });

    it("should store and retrieve abort controller during execution", async () => {
      const chatRequest: ChatRequest = {
        message: "Controller tracking",
        requestId: "test-tracking",
        permissionMode: "acceptEdits",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      let capturedController: AbortController | null = null;

      mockQuery.mockImplementation(
        (args: any) =>
          ({
            [Symbol.asyncIterator]: async function* () {
              capturedController = args.options.abortController;
              expect(requestAbortControllers.has("test-tracking")).toBe(true);
              yield {
                type: "assistant",
                message: { content: [{ type: "text", text: "Response" }] },
                session_id: "test-session",
                parent_tool_use_id: null,
              } as any;
            },
            interrupt: vi.fn(),
            next: vi.fn(),
            return: vi.fn(),
            throw: vi.fn(),
          }) as any,
      );

      await handleChatRequest(mockContext, requestAbortControllers);

      expect(capturedController).toBeInstanceOf(AbortController);
    });
  });

  describe("Tool Result Handling (AskUserQuestion Responses)", () => {
    it("should send tool_result format when toolResult is provided with sessionId", async () => {
      const toolResult: ToolResultContent = {
        tool_use_id: "toolu_12345",
        content: '{"Auth method":"OAuth"}',
        is_error: false,
      };

      const chatRequest: ChatRequest = {
        message: '{"Auth method":"OAuth"}',
        requestId: "test-tool-result",
        sessionId: "session-abc",
        toolResult,
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      let capturedPrompt: any = null;

      mockQuery.mockImplementation(
        (args: any) =>
          ({
            [Symbol.asyncIterator]: async function* () {
              capturedPrompt = args.prompt;
              yield {
                type: "assistant",
                message: { content: [{ type: "text", text: "Acknowledged" }] },
                session_id: "session-abc",
                parent_tool_use_id: null,
              } as any;
            },
            interrupt: vi.fn(),
            next: vi.fn(),
            return: vi.fn(),
            throw: vi.fn(),
          }) as any,
      );

      const response = await handleChatRequest(
        mockContext,
        requestAbortControllers,
      );

      // Read response to complete
      const reader = response.body!.getReader();
      while (true) {
        const { done } = await reader.read();
        if (done) break;
      }

      // Verify the prompt is an async iterable (not a string)
      expect(typeof capturedPrompt).not.toBe("string");
      expect(capturedPrompt[Symbol.asyncIterator]).toBeDefined();

      // Consume the iterable to verify the message structure
      const messages: any[] = [];
      for await (const msg of capturedPrompt) {
        messages.push(msg);
      }

      expect(messages).toHaveLength(1);
      expect(messages[0]).toMatchObject({
        type: "user",
        message: {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: "toolu_12345",
              content: '{"Auth method":"OAuth"}',
            },
          ],
        },
        parent_tool_use_id: null,
        session_id: "session-abc",
      });
      // Verify is_error is not included when false
      expect(messages[0].message.content[0]).not.toHaveProperty("is_error");
    });

    it("should include is_error flag when cancellation toolResult is provided", async () => {
      const toolResult: ToolResultContent = {
        tool_use_id: "toolu_67890",
        content: "User cancelled the question.",
        is_error: true,
      };

      const chatRequest: ChatRequest = {
        message: "User cancelled the question.",
        requestId: "test-cancel",
        sessionId: "session-def",
        toolResult,
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      let capturedPrompt: any = null;

      mockQuery.mockImplementation(
        (args: any) =>
          ({
            [Symbol.asyncIterator]: async function* () {
              capturedPrompt = args.prompt;
              yield {
                type: "assistant",
                message: { content: [{ type: "text", text: "Cancelled" }] },
                session_id: "session-def",
                parent_tool_use_id: null,
              } as any;
            },
            interrupt: vi.fn(),
            next: vi.fn(),
            return: vi.fn(),
            throw: vi.fn(),
          }) as any,
      );

      await handleChatRequest(mockContext, requestAbortControllers);

      // Consume the iterable
      const messages: any[] = [];
      for await (const msg of capturedPrompt) {
        messages.push(msg);
      }

      expect(messages).toHaveLength(1);
      expect(messages[0].message.content[0]).toMatchObject({
        type: "tool_result",
        tool_use_id: "toolu_67890",
        content: "User cancelled the question.",
        is_error: true,
      });
    });

    it("should use string prompt when toolResult is provided without sessionId", async () => {
      const toolResult: ToolResultContent = {
        tool_use_id: "toolu_no_session",
        content: "Some answer",
        is_error: false,
      };

      const chatRequest: ChatRequest = {
        message: "Some answer",
        requestId: "test-no-session",
        // No sessionId provided
        toolResult,
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      let capturedPrompt: any = null;

      mockQuery.mockImplementation(
        (args: any) =>
          ({
            [Symbol.asyncIterator]: async function* () {
              capturedPrompt = args.prompt;
              yield {
                type: "assistant",
                message: { content: [{ type: "text", text: "Response" }] },
                session_id: "new-session",
                parent_tool_use_id: null,
              } as any;
            },
            interrupt: vi.fn(),
            next: vi.fn(),
            return: vi.fn(),
            throw: vi.fn(),
          }) as any,
      );

      await handleChatRequest(mockContext, requestAbortControllers);

      // Without sessionId, toolResult is ignored and string prompt is used
      expect(typeof capturedPrompt).toBe("string");
      expect(capturedPrompt).toBe("Some answer");
    });

    it("should use string prompt when only message is provided (no toolResult)", async () => {
      const chatRequest: ChatRequest = {
        message: "Regular message",
        requestId: "test-regular-message",
        sessionId: "session-ghi",
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      let capturedPrompt: any = null;

      mockQuery.mockImplementation(
        (args: any) =>
          ({
            [Symbol.asyncIterator]: async function* () {
              capturedPrompt = args.prompt;
              yield {
                type: "assistant",
                message: { content: [{ type: "text", text: "Response" }] },
                session_id: "session-ghi",
                parent_tool_use_id: null,
              } as any;
            },
            interrupt: vi.fn(),
            next: vi.fn(),
            return: vi.fn(),
            throw: vi.fn(),
          }) as any,
      );

      await handleChatRequest(mockContext, requestAbortControllers);

      // Without toolResult, string prompt is used
      expect(typeof capturedPrompt).toBe("string");
      expect(capturedPrompt).toBe("Regular message");
    });

    it("should handle toolResult with all optional parameters", async () => {
      const toolResult: ToolResultContent = {
        tool_use_id: "toolu_full",
        content: '{"Framework":"React","Database":"PostgreSQL"}',
        is_error: false,
      };

      const chatRequest: ChatRequest = {
        message: '{"Framework":"React","Database":"PostgreSQL"}',
        requestId: "test-full-params",
        sessionId: "session-full",
        allowedTools: ["Bash", "Edit"],
        workingDirectory: "/project",
        permissionMode: "acceptEdits",
        toolResult,
      };

      mockContext.req.json = vi.fn().mockResolvedValue(chatRequest);

      mockQuery.mockReturnValue({
        [Symbol.asyncIterator]: async function* () {
          yield {
            type: "assistant",
            message: { content: [{ type: "text", text: "Response" }] },
            session_id: "session-full",
            parent_tool_use_id: null,
          } as any;
        },
        interrupt: vi.fn(),
        next: vi.fn(),
        return: vi.fn(),
        throw: vi.fn(),
      } as any);

      const response = await handleChatRequest(
        mockContext,
        requestAbortControllers,
      );

      // Verify response completes successfully
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let allChunks = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        allChunks += decoder.decode(value);
      }

      // Should contain claude_json and done messages
      const lines = allChunks.trim().split("\n");
      expect(lines.length).toBeGreaterThanOrEqual(2);

      // Verify SDK was called with correct options
      expect(mockQuery).toHaveBeenCalledWith({
        prompt: expect.anything(), // Could be string or async iterable
        options: expect.objectContaining({
          resume: "session-full",
          allowedTools: ["Bash", "Edit"],
          cwd: "/project",
          permissionMode: "acceptEdits",
        }),
      });
    });
  });
});
