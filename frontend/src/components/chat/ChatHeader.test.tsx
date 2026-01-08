import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { ChatHeader } from "./ChatHeader";

// Mock the child components
vi.mock("../SettingsButton", () => ({
  SettingsButton: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} data-testid="settings-button">
      Settings
    </button>
  ),
}));

vi.mock("./HistoryButton", () => ({
  HistoryButton: ({ onClick }: { onClick: () => void }) => (
    <button onClick={onClick} data-testid="history-button">
      History
    </button>
  ),
}));

describe("ChatHeader", () => {
  const defaultProps = {
    workingDirectory: "/home/user/project",
    sessionId: "sess-12345678",
    isHistoryView: false,
    isLoadedConversation: false,
    onBackToChat: vi.fn(),
    onBackToHistory: vi.fn(),
    onBackToProjects: vi.fn(),
    onBackToProjectChat: vi.fn(),
    onHistoryClick: vi.fn(),
    onSettingsClick: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders main title", () => {
      render(<ChatHeader {...defaultProps} />);

      expect(screen.getByText("Claude Code Web UI")).toBeInTheDocument();
    });

    it("renders working directory", () => {
      render(<ChatHeader {...defaultProps} />);

      expect(screen.getByText("/home/user/project")).toBeInTheDocument();
    });

    it("renders truncated session id when present", () => {
      render(<ChatHeader {...defaultProps} />);

      expect(screen.getByText(/Session: sess-123/)).toBeInTheDocument();
    });

    it("does not render session info when sessionId is null", () => {
      render(<ChatHeader {...defaultProps} sessionId={null} />);

      expect(screen.queryByText(/Session:/)).not.toBeInTheDocument();
    });

    it("does not render working directory when not provided", () => {
      render(<ChatHeader {...defaultProps} workingDirectory={undefined} />);

      expect(screen.queryByText("/home/user/project")).not.toBeInTheDocument();
    });

    it("renders settings button", () => {
      render(<ChatHeader {...defaultProps} />);

      expect(screen.getByTestId("settings-button")).toBeInTheDocument();
    });

    it("renders history button when not in history view", () => {
      render(<ChatHeader {...defaultProps} isHistoryView={false} />);

      expect(screen.getByTestId("history-button")).toBeInTheDocument();
    });

    it("does not render history button in history view", () => {
      render(<ChatHeader {...defaultProps} isHistoryView={true} />);

      expect(screen.queryByTestId("history-button")).not.toBeInTheDocument();
    });
  });

  describe("history view", () => {
    it("shows back to chat button in history view", () => {
      render(<ChatHeader {...defaultProps} isHistoryView={true} />);

      const backButton = screen.getByLabelText("Back to chat");
      expect(backButton).toBeInTheDocument();
    });

    it("calls onBackToChat when back button clicked in history view", () => {
      render(<ChatHeader {...defaultProps} isHistoryView={true} />);

      fireEvent.click(screen.getByLabelText("Back to chat"));
      expect(defaultProps.onBackToChat).toHaveBeenCalledTimes(1);
    });

    it("shows Conversation History title in history view", () => {
      render(
        <ChatHeader
          {...defaultProps}
          isHistoryView={true}
          sessionId="sess-123"
        />,
      );

      expect(screen.getByText("Conversation History")).toBeInTheDocument();
    });
  });

  describe("loaded conversation", () => {
    it("shows back to history button when conversation is loaded", () => {
      render(<ChatHeader {...defaultProps} isLoadedConversation={true} />);

      const backButton = screen.getByLabelText("Back to history");
      expect(backButton).toBeInTheDocument();
    });

    it("calls onBackToHistory when back button clicked for loaded conversation", () => {
      render(<ChatHeader {...defaultProps} isLoadedConversation={true} />);

      fireEvent.click(screen.getByLabelText("Back to history"));
      expect(defaultProps.onBackToHistory).toHaveBeenCalledTimes(1);
    });

    it("shows Conversation title when in active conversation", () => {
      render(
        <ChatHeader
          {...defaultProps}
          isHistoryView={false}
          sessionId="sess-123"
        />,
      );

      expect(screen.getByText("Conversation")).toBeInTheDocument();
    });
  });

  describe("navigation callbacks", () => {
    it("calls onBackToProjects when main title clicked", () => {
      render(<ChatHeader {...defaultProps} />);

      fireEvent.click(screen.getByText("Claude Code Web UI"));
      expect(defaultProps.onBackToProjects).toHaveBeenCalledTimes(1);
    });

    it("calls onBackToProjectChat when working directory clicked", () => {
      render(<ChatHeader {...defaultProps} />);

      fireEvent.click(screen.getByText("/home/user/project"));
      expect(defaultProps.onBackToProjectChat).toHaveBeenCalledTimes(1);
    });

    it("calls onHistoryClick when history button clicked", () => {
      render(<ChatHeader {...defaultProps} />);

      fireEvent.click(screen.getByTestId("history-button"));
      expect(defaultProps.onHistoryClick).toHaveBeenCalledTimes(1);
    });

    it("calls onSettingsClick when settings button clicked", () => {
      render(<ChatHeader {...defaultProps} />);

      fireEvent.click(screen.getByTestId("settings-button"));
      expect(defaultProps.onSettingsClick).toHaveBeenCalledTimes(1);
    });
  });

  describe("breadcrumb navigation", () => {
    it("renders breadcrumb nav element", () => {
      render(<ChatHeader {...defaultProps} />);

      expect(screen.getByRole("navigation")).toHaveAttribute(
        "aria-label",
        "Breadcrumb",
      );
    });

    it("shows separator when in conversation", () => {
      render(<ChatHeader {...defaultProps} sessionId="sess-123" />);

      expect(screen.getByText("›")).toBeInTheDocument();
    });

    it("does not show separator without session", () => {
      render(
        <ChatHeader {...defaultProps} sessionId={null} isHistoryView={false} />,
      );

      expect(screen.queryByText("›")).not.toBeInTheDocument();
    });

    it("marks current page with aria-current", () => {
      render(<ChatHeader {...defaultProps} sessionId="sess-123" />);

      const currentPage = screen.getByText("Conversation");
      expect(currentPage).toHaveAttribute("aria-current", "page");
    });
  });

  describe("accessibility", () => {
    it("main title button has aria-label", () => {
      render(<ChatHeader {...defaultProps} />);

      const titleButton = screen.getByLabelText("Back to project selection");
      expect(titleButton).toBeInTheDocument();
    });

    it("working directory button has aria-label", () => {
      render(<ChatHeader {...defaultProps} />);

      const dirButton = screen.getByLabelText(
        "Return to new chat in /home/user/project",
      );
      expect(dirButton).toBeInTheDocument();
    });

    it("buttons have focus styles", () => {
      render(<ChatHeader {...defaultProps} />);

      const titleButton = screen.getByText("Claude Code Web UI");
      expect(titleButton.className).toContain("focus:ring-2");
    });
  });
});
