import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleHistoriesRequest } from "./histories";
import { createMockContext } from "./test-utils";

// Hoisted mocks for clean module mocking
const mocks = vi.hoisted(() => ({
  logDebug: vi.fn(),
  logError: vi.fn(),
  stat: vi.fn(),
  getHomeDir: vi.fn(),
  validateEncodedProjectName: vi.fn(),
  parseAllHistoryFiles: vi.fn(),
  groupConversations: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
  logger: {
    history: {
      debug: mocks.logDebug,
      error: mocks.logError,
    },
  },
}));

vi.mock("../utils/fs", () => ({
  stat: mocks.stat,
}));

vi.mock("../utils/os", () => ({
  getHomeDir: mocks.getHomeDir,
}));

vi.mock("../history/pathUtils", () => ({
  validateEncodedProjectName: mocks.validateEncodedProjectName,
}));

vi.mock("../history/parser", () => ({
  parseAllHistoryFiles: mocks.parseAllHistoryFiles,
}));

vi.mock("../history/grouping", () => ({
  groupConversations: mocks.groupConversations,
}));

describe("Histories Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleHistoriesRequest", () => {
    it("should return 400 if encoded project name is missing", async () => {
      const mockContext = createMockContext({
        params: { encodedProjectName: undefined },
      });

      const result = await handleHistoriesRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Encoded project name is required" },
        status: 400,
      });
    });

    it("should return 400 if encoded project name is invalid", async () => {
      const mockContext = createMockContext({
        params: { encodedProjectName: "invalid-name" },
      });
      mocks.validateEncodedProjectName.mockReturnValue(false);

      const result = await handleHistoriesRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Invalid encoded project name" },
        status: 400,
      });
    });

    it("should return 500 if home directory is not found", async () => {
      const mockContext = createMockContext({
        params: { encodedProjectName: "valid-encoded-name" },
      });
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.getHomeDir.mockReturnValue(null);

      const result = await handleHistoriesRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Home directory not found" },
        status: 500,
      });
    });

    it("should return 404 if project directory does not exist", async () => {
      const mockContext = createMockContext({
        params: { encodedProjectName: "valid-encoded-name" },
      });
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.stat.mockRejectedValue(new Error("No such file or directory"));

      const result = await handleHistoriesRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Project not found" },
        status: 404,
      });
    });

    it("should return 404 if path exists but is not a directory", async () => {
      const mockContext = createMockContext({
        params: { encodedProjectName: "valid-encoded-name" },
      });
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.stat.mockResolvedValue({ isDirectory: false });

      const result = await handleHistoriesRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Project not found" },
        status: 404,
      });
    });

    it("should return conversation list on success", async () => {
      const mockContext = createMockContext({
        params: { encodedProjectName: "valid-encoded-name" },
      });
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.stat.mockResolvedValue({ isDirectory: true });

      const mockConversationFiles = [
        { sessionId: "session1", messages: [] },
        { sessionId: "session2", messages: [] },
      ];
      mocks.parseAllHistoryFiles.mockResolvedValue(mockConversationFiles);

      const mockGroupedConversations = [
        {
          sessionId: "session1",
          messageCount: 5,
          lastMessageTime: "2024-01-01",
        },
        {
          sessionId: "session2",
          messageCount: 3,
          lastMessageTime: "2024-01-02",
        },
      ];
      mocks.groupConversations.mockReturnValue(mockGroupedConversations);

      const result = await handleHistoriesRequest(mockContext);

      expect(result).toEqual({
        data: { conversations: mockGroupedConversations },
        status: undefined,
      });
    });

    it("should use correct history directory path", async () => {
      const mockContext = createMockContext({
        params: { encodedProjectName: "my-project-name" },
      });
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.getHomeDir.mockReturnValue("/home/testuser");
      mocks.stat.mockResolvedValue({ isDirectory: true });
      mocks.parseAllHistoryFiles.mockResolvedValue([]);
      mocks.groupConversations.mockReturnValue([]);

      await handleHistoriesRequest(mockContext);

      expect(mocks.stat).toHaveBeenCalledWith(
        "/home/testuser/.claude/projects/my-project-name",
      );
      expect(mocks.parseAllHistoryFiles).toHaveBeenCalledWith(
        "/home/testuser/.claude/projects/my-project-name",
      );
    });

    it("should return 500 on unexpected errors", async () => {
      const mockContext = createMockContext({
        params: { encodedProjectName: "valid-encoded-name" },
      });
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.stat.mockResolvedValue({ isDirectory: true });
      mocks.parseAllHistoryFiles.mockRejectedValue(
        new Error("Unexpected error"),
      );

      const result = await handleHistoriesRequest(mockContext);
      const mockResult = result as unknown as {
        data: { error: string; details: string };
        status: number;
      };

      expect(mockResult.data).toHaveProperty(
        "error",
        "Failed to fetch conversation histories",
      );
      expect(mockResult.data).toHaveProperty("details", "Unexpected error");
      expect(mockResult.status).toBe(500);
    });

    it("should return empty conversations array when no history files exist", async () => {
      const mockContext = createMockContext({
        params: { encodedProjectName: "valid-encoded-name" },
      });
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.stat.mockResolvedValue({ isDirectory: true });
      mocks.parseAllHistoryFiles.mockResolvedValue([]);
      mocks.groupConversations.mockReturnValue([]);

      const result = await handleHistoriesRequest(mockContext);

      expect(result).toEqual({
        data: { conversations: [] },
        status: undefined,
      });
    });
  });
});
