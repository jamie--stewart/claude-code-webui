import { describe, it, expect } from "vitest";
import { formatProjectTitle } from "./projectUtils";
import type { ProjectInfo } from "../types";

describe("projectUtils", () => {
  describe("formatProjectTitle", () => {
    const baseProject: ProjectInfo = {
      path: "/workspace/my-project",
      encodedName: "my-project",
      displayName: "owner/repo",
      isGitRepo: true,
    };

    it("returns displayName with PR number when pr is set", () => {
      const project: ProjectInfo = { ...baseProject, pr: 123 };
      expect(formatProjectTitle(project)).toBe("owner/repo#123");
    });

    it("returns displayName with branch when branch is set", () => {
      const project: ProjectInfo = { ...baseProject, branch: "feature/test" };
      expect(formatProjectTitle(project)).toBe("owner/repo (feature/test)");
    });

    it("returns displayName with commit SHA when commitSha is set", () => {
      const project: ProjectInfo = { ...baseProject, commitSha: "abc1234" };
      expect(formatProjectTitle(project)).toBe("owner/repo @abc1234");
    });

    it("returns just displayName when no git context", () => {
      expect(formatProjectTitle(baseProject)).toBe("owner/repo");
    });

    it("prioritizes PR over branch", () => {
      const project: ProjectInfo = {
        ...baseProject,
        pr: 456,
        branch: "main",
      };
      expect(formatProjectTitle(project)).toBe("owner/repo#456");
    });

    it("prioritizes branch over commitSha", () => {
      const project: ProjectInfo = {
        ...baseProject,
        branch: "develop",
        commitSha: "def5678",
      };
      expect(formatProjectTitle(project)).toBe("owner/repo (develop)");
    });

    it("does not show commitSha if not a git repo", () => {
      const nonGitProject: ProjectInfo = {
        path: "/workspace/local",
        encodedName: "local",
        displayName: "local",
        isGitRepo: false,
        commitSha: "abc1234",
      };
      expect(formatProjectTitle(nonGitProject)).toBe("local");
    });

    it("handles long branch names", () => {
      const project: ProjectInfo = {
        ...baseProject,
        branch: "feature/very-long-branch-name",
      };
      expect(formatProjectTitle(project)).toBe(
        "owner/repo (feature/very-long-branch-name)",
      );
    });

    it("handles special characters in display name", () => {
      const project: ProjectInfo = {
        ...baseProject,
        displayName: "org/repo-with_special.chars",
      };
      expect(formatProjectTitle(project)).toBe("org/repo-with_special.chars");
    });
  });
});
