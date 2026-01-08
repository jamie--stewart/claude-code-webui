import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { ThinkingMessageComponent } from "./ThinkingMessage";
import type { ThinkingMessage } from "../../types";

describe("ThinkingMessageComponent", () => {
  const createThinkingMessage = (
    content: string,
    timestamp: number = Date.now(),
  ): ThinkingMessage => ({
    type: "thinking",
    content,
    timestamp,
  });

  describe("rendering", () => {
    it("renders Claude's Reasoning label", () => {
      const message = createThinkingMessage("Some reasoning");
      render(<ThinkingMessageComponent message={message} />);

      expect(screen.getByText("Claude's Reasoning")).toBeInTheDocument();
    });

    it("renders thinking badge", () => {
      const message = createThinkingMessage("Some reasoning");
      render(<ThinkingMessageComponent message={message} />);

      expect(screen.getByText("(thinking)")).toBeInTheDocument();
    });

    it("renders thinking emoji icon", () => {
      const message = createThinkingMessage("Some reasoning");
      render(<ThinkingMessageComponent message={message} />);

      expect(screen.getByText("💭")).toBeInTheDocument();
    });

    it("displays the thinking content", () => {
      const message = createThinkingMessage(
        "This is my reasoning about the problem",
      );
      render(<ThinkingMessageComponent message={message} />);

      expect(
        screen.getByText("This is my reasoning about the problem"),
      ).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("applies purple color scheme", () => {
      const message = createThinkingMessage("Reasoning");
      const { container } = render(
        <ThinkingMessageComponent message={message} />,
      );

      const wrapper = container.querySelector(".bg-purple-50\\/60");
      expect(wrapper).toBeInTheDocument();
    });

    it("has italic content styling", () => {
      const message = createThinkingMessage("Reasoning content");
      const { container } = render(
        <ThinkingMessageComponent message={message} />,
      );

      const content = container.querySelector("pre.italic");
      expect(content).toBeInTheDocument();
    });
  });

  describe("expanded state", () => {
    it("is expanded by default", () => {
      const message = createThinkingMessage("Expanded reasoning content");
      render(<ThinkingMessageComponent message={message} />);

      // Content should be visible since defaultExpanded is true
      expect(
        screen.getByText("Expanded reasoning content"),
      ).toBeInTheDocument();
    });

    it("is not collapsible (always expanded)", () => {
      const message = createThinkingMessage("Always visible");
      render(<ThinkingMessageComponent message={message} />);

      // Should not have a button role since it's always expanded
      expect(screen.queryByRole("button")).not.toBeInTheDocument();
    });
  });

  describe("multiline content", () => {
    it("renders multiline thinking content", () => {
      const message = createThinkingMessage("Line 1\nLine 2\nLine 3");
      render(<ThinkingMessageComponent message={message} />);

      expect(screen.getByText(/Line 1/)).toBeInTheDocument();
    });

    it("preserves whitespace in thinking content", () => {
      const message = createThinkingMessage("  Indented\n    More indented");
      const { container } = render(
        <ThinkingMessageComponent message={message} />,
      );

      const pre = container.querySelector("pre");
      expect(pre).toHaveClass("whitespace-pre-wrap");
    });
  });

  describe("edge cases", () => {
    it("handles empty content", () => {
      const message = createThinkingMessage("");
      render(<ThinkingMessageComponent message={message} />);

      expect(screen.getByText("Claude's Reasoning")).toBeInTheDocument();
    });

    it("handles long content", () => {
      const longContent = "A".repeat(1000);
      const message = createThinkingMessage(longContent);
      render(<ThinkingMessageComponent message={message} />);

      expect(screen.getByText(longContent)).toBeInTheDocument();
    });

    it("handles special characters in content", () => {
      const message = createThinkingMessage(
        "Special chars: <>&\"' and unicode: 🎉",
      );
      render(<ThinkingMessageComponent message={message} />);

      expect(screen.getByText(/Special chars:/)).toBeInTheDocument();
      expect(screen.getByText(/🎉/)).toBeInTheDocument();
    });
  });
});
