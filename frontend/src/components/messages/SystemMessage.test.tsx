import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SystemMessageComponent } from "./SystemMessage";
import type { SystemMessage, ErrorMessage } from "../../types";

// Mock the contentUtils module
vi.mock("../../utils/contentUtils", () => ({
  createContentPreview: vi.fn((content: string) => ({
    preview: content.split("\n").slice(0, 5).join("\n"),
    hasMore: content.split("\n").length > 5,
    totalLines: content.split("\n").length,
    previewLines: Math.min(5, content.split("\n").length),
  })),
  createMoreLinesIndicator: vi.fn(
    (total: number, preview: number) =>
      `... ${total - preview} more line(s) (click to expand)`,
  ),
}));

describe("SystemMessageComponent", () => {
  describe("init message", () => {
    const createInitMessage = (): SystemMessage =>
      ({
        type: "system",
        subtype: "init",
        uuid: "uuid-123",
        session_id: "sess-123456789abcdef",
        model: "claude-3-opus",
        tools: ["read_file", "write_file"],
        mcp_servers: [],
        slash_commands: [],
        output_style: "text",
        cwd: "/home/user/project",
        permissionMode: "default",
        apiKeySource: "environment",
        timestamp: Date.now(),
      }) as unknown as SystemMessage;

    it("renders System label", () => {
      const message = createInitMessage();
      render(<SystemMessageComponent message={message} />);

      expect(screen.getByText("System")).toBeInTheDocument();
    });

    it("renders init badge", () => {
      const message = createInitMessage();
      render(<SystemMessageComponent message={message} />);

      expect(screen.getByText("(init)")).toBeInTheDocument();
    });

    it("displays model information when expanded", () => {
      const message = createInitMessage();
      render(<SystemMessageComponent message={message} />);

      // Expand the collapsible
      const header = screen.getByRole("button");
      fireEvent.click(header);

      expect(screen.getByText(/Model: claude-3-opus/)).toBeInTheDocument();
    });

    it("displays session id (truncated) when expanded", () => {
      const message = createInitMessage();
      render(<SystemMessageComponent message={message} />);

      const header = screen.getByRole("button");
      fireEvent.click(header);

      expect(screen.getByText(/Session: sess-123/)).toBeInTheDocument();
    });

    it("displays tools count when expanded", () => {
      const message = createInitMessage();
      render(<SystemMessageComponent message={message} />);

      const header = screen.getByRole("button");
      fireEvent.click(header);

      expect(screen.getByText(/Tools: 2 available/)).toBeInTheDocument();
    });

    it("displays cwd when expanded", () => {
      const message = createInitMessage();
      render(<SystemMessageComponent message={message} />);

      const header = screen.getByRole("button");
      fireEvent.click(header);

      expect(
        screen.getByText(/CWD: \/home\/user\/project/),
      ).toBeInTheDocument();
    });

    it("displays permission mode when expanded", () => {
      const message = createInitMessage();
      render(<SystemMessageComponent message={message} />);

      const header = screen.getByRole("button");
      fireEvent.click(header);

      expect(screen.getByText(/Permission Mode: default/)).toBeInTheDocument();
    });
  });

  describe("result message", () => {
    const createResultMessage = (): SystemMessage =>
      ({
        type: "result",
        duration_ms: 1500,
        total_cost_usd: 0.0025,
        usage: {
          input_tokens: 1000,
          output_tokens: 500,
        },
        timestamp: Date.now(),
      }) as unknown as SystemMessage;

    it("renders Result label", () => {
      const message = createResultMessage();
      render(<SystemMessageComponent message={message} />);

      expect(screen.getByText("Result")).toBeInTheDocument();
    });

    it("displays duration when expanded", () => {
      const message = createResultMessage();
      render(<SystemMessageComponent message={message} />);

      const header = screen.getByRole("button");
      fireEvent.click(header);

      expect(screen.getByText(/Duration: 1500ms/)).toBeInTheDocument();
    });

    it("displays cost when expanded", () => {
      const message = createResultMessage();
      render(<SystemMessageComponent message={message} />);

      const header = screen.getByRole("button");
      fireEvent.click(header);

      expect(screen.getByText(/Cost: \$0\.0025/)).toBeInTheDocument();
    });

    it("displays token usage when expanded", () => {
      const message = createResultMessage();
      render(<SystemMessageComponent message={message} />);

      const header = screen.getByRole("button");
      fireEvent.click(header);

      expect(screen.getByText(/Tokens: 1000 in, 500 out/)).toBeInTheDocument();
    });
  });

  describe("error message", () => {
    const createErrorMessage = (): ErrorMessage => ({
      type: "error",
      subtype: "stream_error",
      message: "Connection failed",
      timestamp: Date.now(),
    });

    it("renders Error label", () => {
      const message = createErrorMessage();
      render(<SystemMessageComponent message={message} />);

      expect(screen.getByText("Error")).toBeInTheDocument();
    });

    it("displays error message when expanded", () => {
      const message = createErrorMessage();
      render(<SystemMessageComponent message={message} />);

      const header = screen.getByRole("button");
      fireEvent.click(header);

      expect(screen.getByText("Connection failed")).toBeInTheDocument();
    });
  });

  describe("context overflow message", () => {
    const createContextOverflowMessage = (): SystemMessage =>
      ({
        type: "system",
        subtype: "context_overflow",
        message:
          "The conversation has exceeded the context limit. Please start a new conversation.",
        timestamp: Date.now(),
      }) as SystemMessage;

    it("renders Context Limit Reached label", () => {
      const message = createContextOverflowMessage();
      render(<SystemMessageComponent message={message} />);

      expect(screen.getByText("Context Limit Reached")).toBeInTheDocument();
    });

    it("renders overflow badge", () => {
      const message = createContextOverflowMessage();
      render(<SystemMessageComponent message={message} />);

      expect(screen.getByText("(overflow)")).toBeInTheDocument();
    });

    it("applies warning color scheme", () => {
      const message = createContextOverflowMessage();
      const { container } = render(
        <SystemMessageComponent message={message} />,
      );

      const wrapper = container.querySelector(".bg-amber-50\\/80");
      expect(wrapper).toBeInTheDocument();
    });

    it("shows Start New Conversation button when callback provided", () => {
      const message = createContextOverflowMessage();
      const onStartNew = vi.fn();
      render(
        <SystemMessageComponent
          message={message}
          onStartNewConversation={onStartNew}
        />,
      );

      expect(
        screen.getByRole("button", { name: "Start New Conversation" }),
      ).toBeInTheDocument();
    });

    it("calls onStartNewConversation when button clicked", () => {
      const message = createContextOverflowMessage();
      const onStartNew = vi.fn();
      render(
        <SystemMessageComponent
          message={message}
          onStartNewConversation={onStartNew}
        />,
      );

      fireEvent.click(
        screen.getByRole("button", { name: "Start New Conversation" }),
      );
      expect(onStartNew).toHaveBeenCalledTimes(1);
    });

    it("does not show button when callback not provided", () => {
      const message = createContextOverflowMessage();
      render(<SystemMessageComponent message={message} />);

      expect(
        screen.queryByRole("button", { name: "Start New Conversation" }),
      ).not.toBeInTheDocument();
    });
  });

  describe("hooks message", () => {
    const createHooksMessage = (): SystemMessage =>
      ({
        type: "system",
        content: "\x1b[32mHook executed successfully\x1b[0m",
        timestamp: Date.now(),
      }) as SystemMessage;

    it("renders System label", () => {
      const message = createHooksMessage();
      render(<SystemMessageComponent message={message} />);

      expect(screen.getByText("System")).toBeInTheDocument();
    });

    it("strips ANSI codes from content when expanded", () => {
      const message = createHooksMessage();
      render(<SystemMessageComponent message={message} />);

      const header = screen.getByRole("button");
      fireEvent.click(header);

      expect(
        screen.getByText("Hook executed successfully"),
      ).toBeInTheDocument();
    });
  });

  describe("styling", () => {
    it("renders gear icon for non-overflow messages", () => {
      const message = {
        type: "result",
        duration_ms: 100,
        total_cost_usd: 0.001,
        usage: { input_tokens: 100, output_tokens: 50 },
        timestamp: Date.now(),
      } as unknown as SystemMessage;

      render(<SystemMessageComponent message={message} />);
      expect(screen.getByText("⚙")).toBeInTheDocument();
    });

    it("renders warning icon for context overflow", () => {
      const message = {
        type: "system",
        subtype: "context_overflow",
        message: "Overflow",
        timestamp: Date.now(),
      } as unknown as SystemMessage;

      render(<SystemMessageComponent message={message} />);
      expect(screen.getByText("⚠")).toBeInTheDocument();
    });
  });
});
