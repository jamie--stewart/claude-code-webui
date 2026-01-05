import { describe, it, expect, vi, beforeEach } from "vitest";
import { Context } from "hono";
import { handleHistoriesRequest } from "./histories";

// Mock dependencies
vi.mock("../utils/logger", () => ({
  logger: {
    history: {
      debug: vi.fn(),
      error: vi.fn(),
    },
  },
}));

const mockStat = vi.fn();
vi.mock("../utils/fs", () => ({
  stat: (...args: unknown[]) => mockStat(...args),
}));

const mockGetHomeDir = vi.fn();
vi.mock("../utils/os", () => ({
  getHomeDir: () => mockGetHomeDir(),
}));

const mockValidateEncodedProjectName = vi.fn();
vi.mock("../history/pathUtils", () => ({
  validateEncodedProjectName: (...args: unknown[]) =>
    mockValidateEncodedProjectName(...args),
}));

const mockParseAllHistoryFiles = vi.fn();
vi.mock("../history/parser", () => ({
  parseAllHistoryFiles: (...args: unknown[]) =>
    mockParseAllHistoryFiles(...args),
}));

const mockGroupConversations = vi.fn();
vi.mock("../history/grouping", () => ({
  groupConversations: (...args: unknown[]) => mockGroupConversations(...args),
}));

describe("Histories Handler", () => {
  let mockContext: Context;

  beforeEach(() => {
    vi.clearAllMocks();
  });

  function createMockContext(encodedProjectName: string | undefined): Context {
    return {
      req: {
        param: vi.fn().mockReturnValue(encodedProjectName),
      },
      json: vi.fn().mockImplementation((data, status) => ({
        data,
        status,
      })),
    } as any;
  }

  describe("handleHistoriesRequest", () => {
    it("should return 400 if encoded project name is missing", async () => {
      mockContext = createMockContext(undefined);

      const result = await handleHistoriesRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Encoded project name is required" },
        status: 400,
      });
    });

    it("should return 400 if encoded project name is invalid", async () => {
      mockContext = createMockContext("invalid-name");
      mockValidateEncodedProjectName.mockReturnValue(false);

      const result = await handleHistoriesRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Invalid encoded project name" },
        status: 400,
      });
    });

    it("should return 500 if home directory is not found", async () => {
      mockContext = createMockContext("valid-encoded-name");
      mockValidateEncodedProjectName.mockReturnValue(true);
      mockGetHomeDir.mockReturnValue(null);

      const result = await handleHistoriesRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Home directory not found" },
        status: 500,
      });
    });

    it("should return 404 if project directory does not exist", async () => {
      mockContext = createMockContext("valid-encoded-name");
      mockValidateEncodedProjectName.mockReturnValue(true);
      mockGetHomeDir.mockReturnValue("/home/user");
      mockStat.mockRejectedValue(new Error("No such file or directory"));

      const result = await handleHistoriesRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Project not found" },
        status: 404,
      });
    });

    it("should return 404 if path exists but is not a directory", async () => {
      mockContext = createMockContext("valid-encoded-name");
      mockValidateEncodedProjectName.mockReturnValue(true);
      mockGetHomeDir.mockReturnValue("/home/user");
      mockStat.mockResolvedValue({ isDirectory: false });

      const result = await handleHistoriesRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Project not found" },
        status: 404,
      });
    });

    it("should return conversation list on success", async () => {
      mockContext = createMockContext("valid-encoded-name");
      mockValidateEncodedProjectName.mockReturnValue(true);
      mockGetHomeDir.mockReturnValue("/home/user");
      mockStat.mockResolvedValue({ isDirectory: true });

      const mockConversationFiles = [
        { sessionId: "session1", messages: [] },
        { sessionId: "session2", messages: [] },
      ];
      mockParseAllHistoryFiles.mockResolvedValue(mockConversationFiles);

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
      mockGroupConversations.mockReturnValue(mockGroupedConversations);

      const result = await handleHistoriesRequest(mockContext);

      expect(result).toEqual({
        data: { conversations: mockGroupedConversations },
        status: undefined,
      });
    });

    it("should use correct history directory path", async () => {
      mockContext = createMockContext("my-project-name");
      mockValidateEncodedProjectName.mockReturnValue(true);
      mockGetHomeDir.mockReturnValue("/home/testuser");
      mockStat.mockResolvedValue({ isDirectory: true });
      mockParseAllHistoryFiles.mockResolvedValue([]);
      mockGroupConversations.mockReturnValue([]);

      await handleHistoriesRequest(mockContext);

      expect(mockStat).toHaveBeenCalledWith(
        "/home/testuser/.claude/projects/my-project-name",
      );
      expect(mockParseAllHistoryFiles).toHaveBeenCalledWith(
        "/home/testuser/.claude/projects/my-project-name",
      );
    });

    it("should return 500 on unexpected errors", async () => {
      mockContext = createMockContext("valid-encoded-name");
      mockValidateEncodedProjectName.mockReturnValue(true);
      mockGetHomeDir.mockReturnValue("/home/user");
      mockStat.mockResolvedValue({ isDirectory: true });
      mockParseAllHistoryFiles.mockRejectedValue(new Error("Unexpected error"));

      const result = await handleHistoriesRequest(mockContext);

      expect(result.data).toHaveProperty(
        "error",
        "Failed to fetch conversation histories",
      );
      expect(result.data).toHaveProperty("details", "Unexpected error");
      expect(result.status).toBe(500);
    });

    it("should return empty conversations array when no history files exist", async () => {
      mockContext = createMockContext("valid-encoded-name");
      mockValidateEncodedProjectName.mockReturnValue(true);
      mockGetHomeDir.mockReturnValue("/home/user");
      mockStat.mockResolvedValue({ isDirectory: true });
      mockParseAllHistoryFiles.mockResolvedValue([]);
      mockGroupConversations.mockReturnValue([]);

      const result = await handleHistoriesRequest(mockContext);

      expect(result).toEqual({
        data: { conversations: [] },
        status: undefined,
      });
    });
  });
});
