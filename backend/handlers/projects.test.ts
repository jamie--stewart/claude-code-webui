import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleProjectsRequest } from "./projects";
import { createMockContext } from "./test-utils";

// Hoisted mocks for clean module mocking
const mocks = vi.hoisted(() => ({
  logDebug: vi.fn(),
  logError: vi.fn(),
  readTextFile: vi.fn(),
  getHomeDir: vi.fn(),
  getEncodedProjectName: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
  logger: {
    api: {
      debug: mocks.logDebug,
      error: mocks.logError,
    },
  },
}));

vi.mock("../utils/fs", () => ({
  readTextFile: mocks.readTextFile,
}));

vi.mock("../utils/os", () => ({
  getHomeDir: mocks.getHomeDir,
}));

vi.mock("../history/pathUtils", () => ({
  getEncodedProjectName: mocks.getEncodedProjectName,
}));

describe("Projects Handler", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("handleProjectsRequest", () => {
    it("should return 500 if home directory is not found", async () => {
      const mockContext = createMockContext();
      mocks.getHomeDir.mockReturnValue(null);

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Home directory not found" },
        status: 500,
      });
    });

    it("should return empty projects array when config file does not exist", async () => {
      const mockContext = createMockContext();
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.readTextFile.mockRejectedValue(
        new Error("No such file or directory"),
      );

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: { projects: [] },
        status: undefined,
      });
    });

    it("should return empty projects array when config has no projects object", async () => {
      const mockContext = createMockContext();
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.readTextFile.mockResolvedValue("{}");

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: { projects: [] },
        status: undefined,
      });
    });

    it("should return projects with encoded names when config has projects", async () => {
      const mockContext = createMockContext();
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.readTextFile.mockResolvedValue(
        JSON.stringify({
          projects: {
            "/path/to/project1": {},
            "/path/to/project2": {},
          },
        }),
      );

      mocks.getEncodedProjectName
        .mockResolvedValueOnce("encoded-project1")
        .mockResolvedValueOnce("encoded-project2");

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: {
          projects: [
            {
              path: "/path/to/project1",
              encodedName: "encoded-project1",
              displayName: "project1",
              isGitRepo: false,
            },
            {
              path: "/path/to/project2",
              encodedName: "encoded-project2",
              displayName: "project2",
              isGitRepo: false,
            },
          ],
        },
        status: undefined,
      });
    });

    it("should filter out projects without history directories", async () => {
      const mockContext = createMockContext();
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.readTextFile.mockResolvedValue(
        JSON.stringify({
          projects: {
            "/path/to/project1": {},
            "/path/to/project2": {},
            "/path/to/project3": {},
          },
        }),
      );

      // Only project1 and project3 have history (encoded names)
      mocks.getEncodedProjectName
        .mockResolvedValueOnce("encoded-project1")
        .mockResolvedValueOnce(null) // project2 has no history
        .mockResolvedValueOnce("encoded-project3");

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: {
          projects: [
            {
              path: "/path/to/project1",
              encodedName: "encoded-project1",
              displayName: "project1",
              isGitRepo: false,
            },
            {
              path: "/path/to/project3",
              encodedName: "encoded-project3",
              displayName: "project3",
              isGitRepo: false,
            },
          ],
        },
        status: undefined,
      });
    });

    it("should read config from correct path", async () => {
      const mockContext = createMockContext();
      mocks.getHomeDir.mockReturnValue("/home/testuser");
      mocks.readTextFile.mockResolvedValue(JSON.stringify({ projects: {} }));

      await handleProjectsRequest(mockContext);

      expect(mocks.readTextFile).toHaveBeenCalledWith(
        "/home/testuser/.claude.json",
      );
    });

    it("should return 500 on unexpected errors", async () => {
      const mockContext = createMockContext();
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.readTextFile.mockRejectedValue(new Error("Unexpected error"));

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Failed to read projects" },
        status: 500,
      });
    });

    it("should handle invalid JSON in config file", async () => {
      const mockContext = createMockContext();
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.readTextFile.mockResolvedValue("invalid json");

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Failed to read projects" },
        status: 500,
      });
    });

    it("should handle projects that is not an object", async () => {
      const mockContext = createMockContext();
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.readTextFile.mockResolvedValue(
        JSON.stringify({
          projects: "not an object",
        }),
      );

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: { projects: [] },
        status: undefined,
      });
    });

    it("should handle projects that is an array instead of object", async () => {
      const mockContext = createMockContext();
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.readTextFile.mockResolvedValue(
        JSON.stringify({
          projects: ["/path/to/project"],
        }),
      );

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: { projects: [] },
        status: undefined,
      });
    });

    it("should handle malformed JSON with extra characters", async () => {
      const mockContext = createMockContext();
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.readTextFile.mockResolvedValue('{"projects": {}}extra');

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Failed to read projects" },
        status: 500,
      });
    });

    it("should handle truncated JSON", async () => {
      const mockContext = createMockContext();
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.readTextFile.mockResolvedValue('{"projects": {');

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Failed to read projects" },
        status: 500,
      });
    });
  });
});
