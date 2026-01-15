import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ProjectDisplay } from "./ProjectDisplay";
import type { ProjectInfo } from "../types";

describe("ProjectDisplay", () => {
  const baseProject: ProjectInfo = {
    path: "/workspace/my-project",
    encodedName: "my-project",
    displayName: "owner/repo",
    isGitRepo: true,
  };

  describe("compact variant (default)", () => {
    it("renders display name only", () => {
      render(<ProjectDisplay project={baseProject} />);
      expect(screen.getByText("owner/repo")).toBeInTheDocument();
    });

    it("applies custom className", () => {
      render(<ProjectDisplay project={baseProject} className="custom-class" />);
      expect(screen.getByText("owner/repo")).toHaveClass("custom-class");
    });

    it("handles projects without repo info", () => {
      const nonGitProject: ProjectInfo = {
        path: "/workspace/local",
        encodedName: "local",
        displayName: "local",
        isGitRepo: false,
      };
      render(<ProjectDisplay project={nonGitProject} />);
      expect(screen.getByText("local")).toBeInTheDocument();
    });
  });

  describe("breadcrumb variant", () => {
    it("renders display name with branch badge", () => {
      const projectWithBranch: ProjectInfo = {
        ...baseProject,
        branch: "feature/test",
      };
      render(
        <ProjectDisplay project={projectWithBranch} variant="breadcrumb" />,
      );
      expect(screen.getByText("owner/repo")).toBeInTheDocument();
      expect(screen.getByText("feature/test")).toBeInTheDocument();
    });

    it("renders display name with PR badge", () => {
      const projectWithPR: ProjectInfo = {
        ...baseProject,
        pr: 123,
      };
      render(<ProjectDisplay project={projectWithPR} variant="breadcrumb" />);
      expect(screen.getByText("owner/repo")).toBeInTheDocument();
      expect(screen.getByText("PR #123")).toBeInTheDocument();
    });

    it("renders display name with commit SHA badge", () => {
      const projectWithCommit: ProjectInfo = {
        ...baseProject,
        commitSha: "abc1234",
      };
      render(
        <ProjectDisplay project={projectWithCommit} variant="breadcrumb" />,
      );
      expect(screen.getByText("owner/repo")).toBeInTheDocument();
      expect(screen.getByText("abc1234")).toBeInTheDocument();
    });

    it("prioritizes PR badge over branch", () => {
      const projectWithBoth: ProjectInfo = {
        ...baseProject,
        branch: "main",
        pr: 456,
      };
      render(<ProjectDisplay project={projectWithBoth} variant="breadcrumb" />);
      expect(screen.getByText("PR #456")).toBeInTheDocument();
      expect(screen.queryByText("main")).not.toBeInTheDocument();
    });

    it("prioritizes branch badge over commit", () => {
      const projectWithBoth: ProjectInfo = {
        ...baseProject,
        branch: "develop",
        commitSha: "def5678",
      };
      render(<ProjectDisplay project={projectWithBoth} variant="breadcrumb" />);
      expect(screen.getByText("develop")).toBeInTheDocument();
      expect(screen.queryByText("def5678")).not.toBeInTheDocument();
    });

    it("does not show commit badge if not a git repo", () => {
      const nonGitProject: ProjectInfo = {
        path: "/workspace/local",
        encodedName: "local",
        displayName: "local",
        isGitRepo: false,
        commitSha: "abc1234",
      };
      render(<ProjectDisplay project={nonGitProject} variant="breadcrumb" />);
      expect(screen.queryByText("abc1234")).not.toBeInTheDocument();
    });

    it("renders without badge when no git context", () => {
      render(<ProjectDisplay project={baseProject} variant="breadcrumb" />);
      expect(screen.getByText("owner/repo")).toBeInTheDocument();
      // Should only have the name, no badge
      expect(screen.queryByText(/PR/)).not.toBeInTheDocument();
    });
  });

  describe("card variant", () => {
    it("renders display name in card format", () => {
      render(<ProjectDisplay project={baseProject} variant="card" />);
      expect(screen.getByText("owner/repo")).toBeInTheDocument();
    });

    it("shows path when showPath is true", () => {
      render(<ProjectDisplay project={baseProject} variant="card" showPath />);
      expect(screen.getByText("owner/repo")).toBeInTheDocument();
      expect(screen.getByText("/workspace/my-project")).toBeInTheDocument();
    });

    it("does not show path when showPath is false", () => {
      render(
        <ProjectDisplay
          project={baseProject}
          variant="card"
          showPath={false}
        />,
      );
      expect(screen.getByText("owner/repo")).toBeInTheDocument();
      expect(
        screen.queryByText("/workspace/my-project"),
      ).not.toBeInTheDocument();
    });

    it("includes branch badge in card", () => {
      const projectWithBranch: ProjectInfo = {
        ...baseProject,
        branch: "main",
      };
      render(<ProjectDisplay project={projectWithBranch} variant="card" />);
      expect(screen.getByText("main")).toBeInTheDocument();
    });

    it("includes PR badge in card", () => {
      const projectWithPR: ProjectInfo = {
        ...baseProject,
        pr: 789,
      };
      render(<ProjectDisplay project={projectWithPR} variant="card" />);
      expect(screen.getByText("PR #789")).toBeInTheDocument();
    });

    it("applies custom className to card container", () => {
      const { container } = render(
        <ProjectDisplay
          project={baseProject}
          variant="card"
          className="my-card"
        />,
      );
      const cardDiv = container.querySelector(".my-card");
      expect(cardDiv).toBeInTheDocument();
    });
  });

  describe("edge cases", () => {
    it("handles empty display name", () => {
      const emptyProject: ProjectInfo = {
        path: "/",
        encodedName: "",
        displayName: "",
        isGitRepo: false,
      };
      render(<ProjectDisplay project={emptyProject} />);
      // Should render without crashing, though content might be empty
      expect(document.body).toBeInTheDocument();
    });

    it("handles long branch names", () => {
      const longBranchProject: ProjectInfo = {
        ...baseProject,
        branch: "feature/very-long-branch-name-that-might-overflow",
      };
      render(
        <ProjectDisplay project={longBranchProject} variant="breadcrumb" />,
      );
      expect(
        screen.getByText("feature/very-long-branch-name-that-might-overflow"),
      ).toBeInTheDocument();
    });

    it("handles special characters in display name", () => {
      const specialProject: ProjectInfo = {
        ...baseProject,
        displayName: "org/repo-with_special.chars",
      };
      render(<ProjectDisplay project={specialProject} />);
      expect(
        screen.getByText("org/repo-with_special.chars"),
      ).toBeInTheDocument();
    });
  });
});
