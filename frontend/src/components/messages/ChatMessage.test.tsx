import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import { ChatMessageComponent } from "./ChatMessage";
import type { ChatMessage } from "../../types";

// Mock the CopyButton to simplify testing
vi.mock("./CopyButton", () => ({
  CopyButton: ({ content }: { content: string }) => (
    <button data-testid="copy-button" data-content={content}>
      Copy
    </button>
  ),
}));

// Mock the CodeBlock component
vi.mock("./CodeBlock", () => ({
  CodeBlock: ({ code, language }: { code: string; language?: string }) => (
    <pre data-testid="code-block" data-language={language}>
      {code}
    </pre>
  ),
}));

// Mock the codeHighlighting utilities
vi.mock("../../utils/codeHighlighting", () => ({
  hasCodeBlocks: vi.fn((content: string) => content.includes("```")),
  parseContentWithCodeBlocks: vi.fn((content: string) => {
    // Simple mock implementation
    const segments: Array<
      | { type: "text"; content: string }
      | { type: "code"; code: string; language?: string }
    > = [];
    const parts = content.split(/(```\w*\n[\s\S]*?```)/);
    for (const part of parts) {
      if (part.startsWith("```")) {
        const match = part.match(/```(\w*)\n([\s\S]*?)```/);
        if (match) {
          segments.push({ type: "code", code: match[2], language: match[1] });
        }
      } else if (part.trim()) {
        segments.push({ type: "text", content: part });
      }
    }
    return segments;
  }),
}));

describe("ChatMessageComponent", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const createChatMessage = (
    role: "user" | "assistant",
    content: string,
    timestamp: number = Date.now(),
  ): ChatMessage => ({
    type: "chat",
    role,
    content,
    timestamp,
  });

  describe("user messages", () => {
    it("renders user label", () => {
      const message = createChatMessage("user", "Hello");
      render(<ChatMessageComponent message={message} />);

      expect(screen.getByText("User")).toBeInTheDocument();
    });

    it("renders user message content", () => {
      const message = createChatMessage("user", "Hello, Claude!");
      render(<ChatMessageComponent message={message} />);

      expect(screen.getByText("Hello, Claude!")).toBeInTheDocument();
    });

    it("aligns user messages to the right", () => {
      const message = createChatMessage("user", "Test");
      render(<ChatMessageComponent message={message} />);

      const container = screen.getByText("User").closest(".mb-4");
      expect(container).toHaveClass("justify-end");
    });

    it("applies blue color scheme for user messages", () => {
      const message = createChatMessage("user", "Test");
      render(<ChatMessageComponent message={message} />);

      const messageBox = screen.getByText("User").closest(".rounded-lg");
      expect(messageBox).toHaveClass("bg-blue-600");
      expect(messageBox).toHaveClass("text-white");
    });
  });

  describe("assistant messages", () => {
    it("renders Claude label", () => {
      const message = createChatMessage("assistant", "Hi there");
      render(<ChatMessageComponent message={message} />);

      expect(screen.getByText("Claude")).toBeInTheDocument();
    });

    it("renders assistant message content", () => {
      const message = createChatMessage("assistant", "Hello! How can I help?");
      render(<ChatMessageComponent message={message} />);

      expect(screen.getByText("Hello! How can I help?")).toBeInTheDocument();
    });

    it("aligns assistant messages to the left", () => {
      const message = createChatMessage("assistant", "Test");
      render(<ChatMessageComponent message={message} />);

      const container = screen.getByText("Claude").closest(".mb-4");
      expect(container).toHaveClass("justify-start");
    });

    it("applies slate color scheme for assistant messages", () => {
      const message = createChatMessage("assistant", "Test");
      render(<ChatMessageComponent message={message} />);

      const messageBox = screen.getByText("Claude").closest(".rounded-lg");
      expect(messageBox).toHaveClass("bg-slate-200");
    });
  });

  describe("copy button", () => {
    it("renders copy button with message content", () => {
      const message = createChatMessage("user", "Copy this text");
      render(<ChatMessageComponent message={message} />);

      const copyButton = screen.getByTestId("copy-button");
      expect(copyButton).toHaveAttribute("data-content", "Copy this text");
    });
  });

  describe("code blocks in assistant messages", () => {
    it("parses and renders code blocks", () => {
      const message = createChatMessage(
        "assistant",
        "Here is code:\n```javascript\nconst x = 1;\n```",
      );
      render(<ChatMessageComponent message={message} />);

      const codeBlock = screen.getByTestId("code-block");
      expect(codeBlock).toBeInTheDocument();
      expect(codeBlock).toHaveAttribute("data-language", "javascript");
    });

    it("does not parse code blocks in user messages", () => {
      const message = createChatMessage(
        "user",
        "Here is code:\n```javascript\nconst x = 1;\n```",
      );
      render(<ChatMessageComponent message={message} />);

      // User messages don't parse code blocks
      expect(screen.queryByTestId("code-block")).not.toBeInTheDocument();
    });
  });

  describe("timestamp", () => {
    it("renders timestamp component", () => {
      const timestamp = 1704067200000; // 2024-01-01 00:00:00 UTC
      const message = createChatMessage("user", "Test", timestamp);
      render(<ChatMessageComponent message={message} />);

      // TimestampComponent should be present (we can check for time element or text)
      const timeContainer = document.querySelector(".opacity-70");
      expect(timeContainer).toBeInTheDocument();
    });
  });

  describe("content formatting", () => {
    it("preserves whitespace in message content", () => {
      const message = createChatMessage("user", "Line 1\nLine 2\n  Indented");
      const { container } = render(<ChatMessageComponent message={message} />);

      const pre = container.querySelector("pre");
      expect(pre).toHaveClass("whitespace-pre-wrap");
    });

    it("uses monospace font", () => {
      const message = createChatMessage("user", "Test");
      const { container } = render(<ChatMessageComponent message={message} />);

      const pre = container.querySelector("pre");
      expect(pre).toHaveClass("font-mono");
    });
  });

  describe("edge cases", () => {
    it("handles empty content", () => {
      const message = createChatMessage("user", "");
      render(<ChatMessageComponent message={message} />);

      expect(screen.getByText("User")).toBeInTheDocument();
    });

    it("handles special characters", () => {
      const message = createChatMessage(
        "assistant",
        "<script>alert('xss')</script>",
      );
      render(<ChatMessageComponent message={message} />);

      // Content should be escaped/rendered as text
      expect(screen.getByText(/<script>/)).toBeInTheDocument();
    });

    it("handles unicode content", () => {
      const message = createChatMessage("user", "Hello 👋 🌍 こんにちは");
      render(<ChatMessageComponent message={message} />);

      expect(screen.getByText(/Hello 👋 🌍 こんにちは/)).toBeInTheDocument();
    });

    it("handles very long content", () => {
      const longContent = "A".repeat(10000);
      const message = createChatMessage("assistant", longContent);
      render(<ChatMessageComponent message={message} />);

      expect(screen.getByText(longContent)).toBeInTheDocument();
    });
  });
});
