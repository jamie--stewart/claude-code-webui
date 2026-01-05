import { describe, it, expect, vi, beforeEach } from "vitest";
import { Context } from "hono";
import { handleConversationRequest } from "./conversations";

// Mock dependencies
vi.mock("../utils/logger", () => ({
  logger: {
    history: {
      debug: vi.fn(),
      error: vi.fn(),
    },
  },
}));

const mockValidateEncodedProjectName = vi.fn();
vi.mock("../history/pathUtils", () => ({
  validateEncodedProjectName: (...args: unknown[]) =>
    mockValidateEncodedProjectName(...args),
}));

const mockLoadConversation = vi.fn();
vi.mock("../history/conversationLoader", () => ({
  loadConversation: (...args: unknown[]) => mockLoadConversation(...args),
}));

describe("Conversations Handler", () => {
  let mockContext: Context;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockContext(
    encodedProjectName: string | undefined,
    sessionId: string | undefined,
  ): Context {
    return {
      req: {
        param: vi.fn().mockImplementation((name) => {
          if (name === "encodedProjectName") return encodedProjectName;
          if (name === "sessionId") return sessionId;
          return undefined;
        }),
      },
      json: vi.fn().mockImplementation((data, status) => ({
        data,
        status,
      })),
    } as any;
  }

  describe("handleConversationRequest", () => {
    it("should return 400 if encoded project name is missing", async () => {
      mockContext = createMockContext(undefined, "session-123");

      const result = await handleConversationRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Encoded project name is required" },
        status: 400,
      });
    });

    it("should return 400 if session ID is missing", async () => {
      mockContext = createMockContext("project-name", undefined);

      const result = await handleConversationRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Session ID is required" },
        status: 400,
      });
    });

    it("should return 400 if encoded project name is invalid", async () => {
      mockContext = createMockContext("invalid-name", "session-123");
      mockValidateEncodedProjectName.mockReturnValue(false);

      const result = await handleConversationRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Invalid encoded project name" },
        status: 400,
      });
    });

    it("should return 404 if conversation is not found", async () => {
      mockContext = createMockContext("valid-project", "session-123");
      mockValidateEncodedProjectName.mockReturnValue(true);
      mockLoadConversation.mockResolvedValue(null);

      const result = await handleConversationRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Conversation not found", sessionId: "session-123" },
        status: 404,
      });
    });

    it("should return conversation history on success", async () => {
      mockContext = createMockContext("valid-project", "session-123");
      mockValidateEncodedProjectName.mockReturnValue(true);

      const mockConversation = {
        sessionId: "session-123",
        messages: [
          { type: "user", content: "Hello" },
          { type: "assistant", content: "Hi there!" },
        ],
        createdAt: "2024-01-01T00:00:00Z",
      };
      mockLoadConversation.mockResolvedValue(mockConversation);

      const result = await handleConversationRequest(mockContext);

      expect(result).toEqual({
        data: mockConversation,
        status: undefined,
      });
    });

    it("should call loadConversation with correct parameters", async () => {
      mockContext = createMockContext("my-project", "my-session");
      mockValidateEncodedProjectName.mockReturnValue(true);
      mockLoadConversation.mockResolvedValue({
        sessionId: "my-session",
        messages: [],
      });

      await handleConversationRequest(mockContext);

      expect(mockLoadConversation).toHaveBeenCalledWith(
        "my-project",
        "my-session",
      );
    });

    it("should return 400 for invalid session ID format error", async () => {
      mockContext = createMockContext("valid-project", "invalid-session");
      mockValidateEncodedProjectName.mockReturnValue(true);
      mockLoadConversation.mockRejectedValue(
        new Error("Invalid session ID format"),
      );

      const result = await handleConversationRequest(mockContext);

      expect(result).toEqual({
        data: {
          error: "Invalid session ID format",
          details: "Invalid session ID format",
        },
        status: 400,
      });
    });

    it("should return 400 for invalid encoded project name error from loader", async () => {
      mockContext = createMockContext("valid-project", "session-123");
      mockValidateEncodedProjectName.mockReturnValue(true);
      mockLoadConversation.mockRejectedValue(
        new Error("Invalid encoded project name"),
      );

      const result = await handleConversationRequest(mockContext);

      expect(result).toEqual({
        data: {
          error: "Invalid project name",
          details: "Invalid encoded project name",
        },
        status: 400,
      });
    });

    it("should return 500 on unexpected errors", async () => {
      mockContext = createMockContext("valid-project", "session-123");
      mockValidateEncodedProjectName.mockReturnValue(true);
      mockLoadConversation.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await handleConversationRequest(mockContext);

      expect(result.data).toHaveProperty(
        "error",
        "Failed to fetch conversation details",
      );
      expect(result.data).toHaveProperty(
        "details",
        "Database connection failed",
      );
      expect(result.status).toBe(500);
    });

    it("should handle non-Error thrown values", async () => {
      mockContext = createMockContext("valid-project", "session-123");
      mockValidateEncodedProjectName.mockReturnValue(true);
      mockLoadConversation.mockRejectedValue("String error");

      const result = await handleConversationRequest(mockContext);

      expect(result.data).toHaveProperty(
        "error",
        "Failed to fetch conversation details",
      );
      expect(result.data).toHaveProperty("details", "String error");
      expect(result.status).toBe(500);
    });

    it("should validate project name before loading", async () => {
      mockContext = createMockContext("project", "session");
      mockValidateEncodedProjectName.mockReturnValue(false);

      await handleConversationRequest(mockContext);

      expect(mockValidateEncodedProjectName).toHaveBeenCalledWith("project");
      expect(mockLoadConversation).not.toHaveBeenCalled();
    });
  });
});
