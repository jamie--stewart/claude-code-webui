/**
 * Project Info Utilities Test
 *
 * Tests for the project info detection and formatting utilities.
 * Note: Environment variable tests would require integration testing
 * as the module caching makes mocking getEnv challenging.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { NodeRuntime } from "../../runtime/node.js";

// Hoisted mocks for clean module mocking
const mocks = vi.hoisted(() => ({
  getGitInfo: vi.fn(),
}));

vi.mock("../../utils/git", async () => {
  const actual = await vi.importActual("../../utils/git");
  return {
    ...actual,
    getGitInfo: mocks.getGitInfo,
  };
});

// Mock getEnv to always return undefined (no env vars set)
vi.mock("../../utils/os", () => ({
  getEnv: () => undefined,
}));

describe("Project Info Utilities", () => {
  const runtime = new NodeRuntime();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe("getProjectInfo", () => {
    describe("with git detection", () => {
      it("should detect git repo information", async () => {
        mocks.getGitInfo.mockResolvedValue({
          isGitRepo: true,
          remoteUrl: "https://github.com/owner/repo.git",
          branch: "main",
          commitSha: "abc1234",
        });

        const { getProjectInfo } = await import("../../utils/projectInfo");
        const result = await getProjectInfo(runtime, "/workspace");

        expect(result.isGitRepo).toBe(true);
        expect(result.repoUrl).toBe("https://github.com/owner/repo.git");
        expect(result.branch).toBe("main");
        expect(result.commitSha).toBe("abc1234");
        expect(result.displayName).toBe("owner/repo on main");
      });

      it("should handle detached HEAD", async () => {
        mocks.getGitInfo.mockResolvedValue({
          isGitRepo: true,
          remoteUrl: "https://github.com/owner/repo.git",
          branch: null,
          commitSha: "abc1234",
        });

        const { getProjectInfo } = await import("../../utils/projectInfo");
        const result = await getProjectInfo(runtime, "/workspace");

        expect(result.branch).toBeUndefined();
        expect(result.displayName).toBe("owner/repo at abc1234");
      });

      it("should handle git repo without remote", async () => {
        mocks.getGitInfo.mockResolvedValue({
          isGitRepo: true,
          remoteUrl: null,
          branch: "main",
          commitSha: "abc1234",
        });

        const { getProjectInfo } = await import("../../utils/projectInfo");
        const result = await getProjectInfo(runtime, "/workspace/my-project");

        expect(result.repoUrl).toBeUndefined();
        expect(result.displayName).toBe("my-project on main");
      });

      it("should handle non-git directory", async () => {
        mocks.getGitInfo.mockResolvedValue({
          isGitRepo: false,
          remoteUrl: null,
          branch: null,
          commitSha: null,
        });

        const { getProjectInfo } = await import("../../utils/projectInfo");
        const result = await getProjectInfo(runtime, "/home/user/my-project");

        expect(result.isGitRepo).toBe(false);
        expect(result.displayName).toBe("my-project");
        expect(result.repoUrl).toBeUndefined();
        expect(result.branch).toBeUndefined();
      });

      it("should handle git repo without remote in detached HEAD", async () => {
        mocks.getGitInfo.mockResolvedValue({
          isGitRepo: true,
          remoteUrl: null,
          branch: null,
          commitSha: "def5678",
        });

        const { getProjectInfo } = await import("../../utils/projectInfo");
        const result = await getProjectInfo(runtime, "/workspace/test-repo");

        expect(result.displayName).toBe("test-repo at def5678");
      });
    });

    describe("encodedName generation", () => {
      beforeEach(() => {
        mocks.getGitInfo.mockResolvedValue({
          isGitRepo: false,
          remoteUrl: null,
          branch: null,
          commitSha: null,
        });
      });

      it("should encode path for URL safety", async () => {
        const { getProjectInfo } = await import("../../utils/projectInfo");
        const result = await getProjectInfo(runtime, "/home/user/my project");

        expect(result.encodedName).not.toContain(" ");
        expect(result.encodedName).not.toContain("%");
      });

      it("should handle paths with special characters", async () => {
        const { getProjectInfo } = await import("../../utils/projectInfo");
        const result = await getProjectInfo(
          runtime,
          "/home/user/project-name_123",
        );

        expect(result.encodedName).toBeTruthy();
        expect(result.path).toBe("/home/user/project-name_123");
      });
    });

    describe("path-based display names", () => {
      it("should use path basename for non-git directories", async () => {
        mocks.getGitInfo.mockResolvedValue({
          isGitRepo: false,
          remoteUrl: null,
          branch: null,
          commitSha: null,
        });

        const { getProjectInfo } = await import("../../utils/projectInfo");
        const result = await getProjectInfo(
          runtime,
          "/very/long/path/to/project-name",
        );

        expect(result.displayName).toBe("project-name");
      });
    });
  });
});
