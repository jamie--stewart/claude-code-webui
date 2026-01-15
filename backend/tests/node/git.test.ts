/**
 * Git Utilities Test
 *
 * Tests for the git utilities module, particularly the URL parsing
 * functionality that doesn't require actual git operations.
 */

import { describe, it, expect } from "vitest";
import { parseRepoName, execGit, getGitInfo } from "../../utils/git.js";
import { NodeRuntime } from "../../runtime/node.js";

describe("Git Utilities", () => {
  describe("parseRepoName", () => {
    it("should parse HTTPS URLs with .git suffix", () => {
      const result = parseRepoName("https://github.com/owner/repo.git");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("should parse HTTPS URLs without .git suffix", () => {
      const result = parseRepoName("https://github.com/owner/repo");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("should parse SSH URLs with .git suffix", () => {
      const result = parseRepoName("git@github.com:owner/repo.git");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("should parse SSH URLs without .git suffix", () => {
      const result = parseRepoName("git@github.com:owner/repo");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("should parse SSH protocol URLs", () => {
      const result = parseRepoName("ssh://git@github.com/owner/repo.git");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("should handle GitLab URLs", () => {
      const result = parseRepoName("https://gitlab.com/owner/repo.git");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("should handle Bitbucket URLs", () => {
      const result = parseRepoName("git@bitbucket.org:owner/repo.git");
      expect(result).toEqual({ owner: "owner", repo: "repo" });
    });

    it("should return null for empty string", () => {
      expect(parseRepoName("")).toBeNull();
    });

    it("should return null for invalid URLs", () => {
      expect(parseRepoName("not-a-url")).toBeNull();
    });

    it("should handle repos with hyphens and underscores", () => {
      const result = parseRepoName(
        "https://github.com/my-org/my_repo-name.git",
      );
      expect(result).toEqual({ owner: "my-org", repo: "my_repo-name" });
    });
  });

  describe("execGit", () => {
    const runtime = new NodeRuntime();

    it("should export execGit function", () => {
      expect(typeof execGit).toBe("function");
    });

    it("should return null for invalid git command", async () => {
      const result = await execGit(runtime, ["invalid-command-xyz"]);
      expect(result).toBeNull();
    });

    it("should execute git version command", async () => {
      const result = await execGit(runtime, ["--version"]);
      // This should succeed if git is installed
      if (result !== null) {
        expect(result).toContain("git version");
      }
    });
  });

  describe("getGitInfo", () => {
    const runtime = new NodeRuntime();

    it("should export getGitInfo function", () => {
      expect(typeof getGitInfo).toBe("function");
    });

    it("should return isGitRepo: false for non-git directory", async () => {
      // /tmp is unlikely to be a git repo
      const result = await getGitInfo(runtime, "/tmp");
      expect(result.isGitRepo).toBe(false);
    });

    it("should detect current directory as git repo", async () => {
      // The workspace should be a git repo based on the context
      const result = await getGitInfo(runtime, "/workspace");
      expect(result.isGitRepo).toBe(true);
      expect(result.commitSha).not.toBeNull();
    });
  });
});
