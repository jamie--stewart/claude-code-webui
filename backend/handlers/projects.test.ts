import { describe, it, expect, vi, beforeEach } from "vitest";
import { Context } from "hono";
import { handleProjectsRequest } from "./projects";

// Mock dependencies
vi.mock("../utils/logger", () => ({
  logger: {
    api: {
      debug: vi.fn(),
      error: vi.fn(),
    },
  },
}));

const mockReadTextFile = vi.fn();
vi.mock("../utils/fs", () => ({
  readTextFile: (...args: unknown[]) => mockReadTextFile(...args),
}));

const mockGetHomeDir = vi.fn();
vi.mock("../utils/os", () => ({
  getHomeDir: () => mockGetHomeDir(),
}));

const mockGetEncodedProjectName = vi.fn();
vi.mock("../history/pathUtils", () => ({
  getEncodedProjectName: (...args: unknown[]) =>
    mockGetEncodedProjectName(...args),
}));

describe("Projects Handler", () => {
  let mockContext: Context;

  beforeEach(() => {
    mockContext = {
      json: vi.fn().mockImplementation((data, status) => ({
        data,
        status,
      })),
    } as any;

    vi.clearAllMocks();
  });

  describe("handleProjectsRequest", () => {
    it("should return 500 if home directory is not found", async () => {
      mockGetHomeDir.mockReturnValue(null);

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Home directory not found" },
        status: 500,
      });
    });

    it("should return empty projects array when config file does not exist", async () => {
      mockGetHomeDir.mockReturnValue("/home/user");
      mockReadTextFile.mockRejectedValue(
        new Error("No such file or directory"),
      );

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: { projects: [] },
        status: undefined,
      });
    });

    it("should return empty projects array when config has no projects object", async () => {
      mockGetHomeDir.mockReturnValue("/home/user");
      mockReadTextFile.mockResolvedValue("{}");

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: { projects: [] },
        status: undefined,
      });
    });

    it("should return projects with encoded names when config has projects", async () => {
      mockGetHomeDir.mockReturnValue("/home/user");
      mockReadTextFile.mockResolvedValue(
        JSON.stringify({
          projects: {
            "/path/to/project1": {},
            "/path/to/project2": {},
          },
        }),
      );

      mockGetEncodedProjectName
        .mockResolvedValueOnce("encoded-project1")
        .mockResolvedValueOnce("encoded-project2");

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: {
          projects: [
            { path: "/path/to/project1", encodedName: "encoded-project1" },
            { path: "/path/to/project2", encodedName: "encoded-project2" },
          ],
        },
        status: undefined,
      });
    });

    it("should filter out projects without history directories", async () => {
      mockGetHomeDir.mockReturnValue("/home/user");
      mockReadTextFile.mockResolvedValue(
        JSON.stringify({
          projects: {
            "/path/to/project1": {},
            "/path/to/project2": {},
            "/path/to/project3": {},
          },
        }),
      );

      // Only project1 and project3 have history (encoded names)
      mockGetEncodedProjectName
        .mockResolvedValueOnce("encoded-project1")
        .mockResolvedValueOnce(null) // project2 has no history
        .mockResolvedValueOnce("encoded-project3");

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: {
          projects: [
            { path: "/path/to/project1", encodedName: "encoded-project1" },
            { path: "/path/to/project3", encodedName: "encoded-project3" },
          ],
        },
        status: undefined,
      });
    });

    it("should read config from correct path", async () => {
      mockGetHomeDir.mockReturnValue("/home/testuser");
      mockReadTextFile.mockResolvedValue(JSON.stringify({ projects: {} }));

      await handleProjectsRequest(mockContext);

      expect(mockReadTextFile).toHaveBeenCalledWith(
        "/home/testuser/.claude.json",
      );
    });

    it("should return 500 on unexpected errors", async () => {
      mockGetHomeDir.mockReturnValue("/home/user");
      mockReadTextFile.mockRejectedValue(new Error("Unexpected error"));

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Failed to read projects" },
        status: 500,
      });
    });

    it("should handle invalid JSON in config file", async () => {
      mockGetHomeDir.mockReturnValue("/home/user");
      mockReadTextFile.mockResolvedValue("invalid json");

      const result = await handleProjectsRequest(mockContext);

      expect(result).toEqual({
        data: { error: "Failed to read projects" },
        status: 500,
      });
    });

    it("should handle projects that is not an object", async () => {
      mockGetHomeDir.mockReturnValue("/home/user");
      mockReadTextFile.mockResolvedValue(
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
  });
});
