import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleConversationRequest } from "./conversations";
import { createMockContext } from "./test-utils";

// Hoisted mocks for clean module mocking
const mocks = vi.hoisted(() => ({
  logDebug: vi.fn(),
  logError: vi.fn(),
  validateEncodedProjectName: vi.fn(),
  loadConversation: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
  logger: {
    history: {
      debug: mocks.logDebug,
      error: mocks.logError,
    },
  },
}));

vi.mock("../history/pathUtils", () => ({
  validateEncodedProjectName: mocks.validateEncodedProjectName,
}));

vi.mock("../history/conversationLoader", () => ({
  loadConversation: mocks.loadConversation,
}));

describe("Conversations Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleConversationRequest", () => {
    it("should return 400 if encoded project name is missing", async () => {
      const mockContext = createMockContext({
        params: { encodedProjectName: undefined, sessionId: "session-123" },
      });

      const result = await handleConversationRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Encoded project name is required" },
        status: 400,
      });
    });

    it("should return 400 if session ID is missing", async () => {
      const mockContext = createMockContext({
        params: { encodedProjectName: "project-name", sessionId: undefined },
      });

      const result = await handleConversationRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Session ID is required" },
        status: 400,
      });
    });

    it("should return 400 if encoded project name is invalid", async () => {
      const mockContext = createMockContext({
        params: {
          encodedProjectName: "invalid-name",
          sessionId: "session-123",
        },
      });
      mocks.validateEncodedProjectName.mockReturnValue(false);

      const result = await handleConversationRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Invalid encoded project name" },
        status: 400,
      });
    });

    it("should return 404 if conversation is not found", async () => {
      const mockContext = createMockContext({
        params: {
          encodedProjectName: "valid-project",
          sessionId: "session-123",
        },
      });
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.loadConversation.mockResolvedValue(null);

      const result = await handleConversationRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Conversation not found", sessionId: "session-123" },
        status: 404,
      });
    });

    it("should return conversation history on success", async () => {
      const mockContext = createMockContext({
        params: {
          encodedProjectName: "valid-project",
          sessionId: "session-123",
        },
      });
      mocks.validateEncodedProjectName.mockReturnValue(true);

      const mockConversation = {
        sessionId: "session-123",
        messages: [
          { type: "user", content: "Hello" },
          { type: "assistant", content: "Hi there!" },
        ],
        createdAt: "2024-01-01T00:00:00Z",
      };
      mocks.loadConversation.mockResolvedValue(mockConversation);

      const result = await handleConversationRequest(mockContext);

      expect(result).toEqual({
        data: mockConversation,
        status: undefined,
      });
    });

    it("should call loadConversation with correct parameters", async () => {
      const mockContext = createMockContext({
        params: { encodedProjectName: "my-project", sessionId: "my-session" },
      });
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.loadConversation.mockResolvedValue({
        sessionId: "my-session",
        messages: [],
      });

      await handleConversationRequest(mockContext);

      expect(mocks.loadConversation).toHaveBeenCalledWith(
        "my-project",
        "my-session",
      );
    });

    it("should return 400 for invalid session ID format error", async () => {
      const mockContext = createMockContext({
        params: {
          encodedProjectName: "valid-project",
          sessionId: "invalid-session",
        },
      });
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.loadConversation.mockRejectedValue(
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
      const mockContext = createMockContext({
        params: {
          encodedProjectName: "valid-project",
          sessionId: "session-123",
        },
      });
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.loadConversation.mockRejectedValue(
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
      const mockContext = createMockContext({
        params: {
          encodedProjectName: "valid-project",
          sessionId: "session-123",
        },
      });
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.loadConversation.mockRejectedValue(
        new Error("Database connection failed"),
      );

      const result = await handleConversationRequest(mockContext);
      const mockResult = result as unknown as {
        data: { error: string; details: string };
        status: number;
      };

      expect(mockResult.data).toHaveProperty(
        "error",
        "Failed to fetch conversation details",
      );
      expect(mockResult.data).toHaveProperty(
        "details",
        "Database connection failed",
      );
      expect(mockResult.status).toBe(500);
    });

    it("should handle non-Error thrown values", async () => {
      const mockContext = createMockContext({
        params: {
          encodedProjectName: "valid-project",
          sessionId: "session-123",
        },
      });
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.loadConversation.mockRejectedValue("String error");

      const result = await handleConversationRequest(mockContext);
      const mockResult = result as unknown as {
        data: { error: string; details: string };
        status: number;
      };

      expect(mockResult.data).toHaveProperty(
        "error",
        "Failed to fetch conversation details",
      );
      expect(mockResult.data).toHaveProperty("details", "String error");
      expect(mockResult.status).toBe(500);
    });

    it("should validate project name before loading", async () => {
      const mockContext = createMockContext({
        params: { encodedProjectName: "project", sessionId: "session" },
      });
      mocks.validateEncodedProjectName.mockReturnValue(false);

      await handleConversationRequest(mockContext);

      expect(mocks.validateEncodedProjectName).toHaveBeenCalledWith("project");
      expect(mocks.loadConversation).not.toHaveBeenCalled();
    });
  });
});
