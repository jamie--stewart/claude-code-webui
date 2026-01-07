import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import {
  ToolResultDisplay,
  DiffDisplay,
  BashContent,
  SearchResultContent,
  FileOperationContent,
} from "./ToolResultDisplay";

// Mock highlight.js to avoid issues with CSS imports in tests
vi.mock("highlight.js/styles/github.css", () => ({}));

describe("ToolResultDisplay", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("status indicators", () => {
    it("shows success indicator for successful tool results", () => {
      render(
        <ToolResultDisplay
          toolName="Bash"
          content="Hello World"
          summary="completed"
          toolUseResult={{
            stdout: "Hello World",
            stderr: "",
            interrupted: false,
            isImage: false,
          }}
        />,
      );

      // Should show checkmark for success
      expect(screen.getByLabelText("success")).toBeInTheDocument();
    });

    it("shows warning indicator for interrupted bash command", () => {
      render(
        <ToolResultDisplay
          toolName="Bash"
          content="partial output"
          summary="interrupted"
          toolUseResult={{
            stdout: "partial output",
            stderr: "",
            interrupted: true,
            isImage: false,
          }}
        />,
      );

      expect(screen.getByLabelText("warning")).toBeInTheDocument();
    });

    it("shows error indicator when stderr contains error", () => {
      render(
        <ToolResultDisplay
          toolName="Bash"
          content=""
          summary="failed"
          toolUseResult={{
            stdout: "",
            stderr: "Error: command not found",
            interrupted: false,
            isImage: false,
          }}
        />,
      );

      expect(screen.getByLabelText("error")).toBeInTheDocument();
    });

    it("shows warning indicator for empty grep results", () => {
      render(
        <ToolResultDisplay toolName="Grep" content="" summary="0 matches" />,
      );

      expect(screen.getByLabelText("warning")).toBeInTheDocument();
    });
  });

  describe("tool name display", () => {
    const toolNames = ["Bash", "Edit", "Read", "Write", "Grep", "Glob"];

    for (const toolName of toolNames) {
      it(`displays tool name: ${toolName}`, () => {
        render(
          <ToolResultDisplay
            toolName={toolName}
            content="test content"
            summary="test summary"
          />,
        );

        expect(screen.getByText(toolName)).toBeInTheDocument();
      });
    }
  });

  describe("summary display", () => {
    it("displays summary text", () => {
      render(
        <ToolResultDisplay
          toolName="Read"
          content="file content"
          summary="file.txt - 100 lines"
        />,
      );

      // Summary should be displayed in the header
      expect(screen.getByText("file.txt - 100 lines")).toBeInTheDocument();
    });
  });

  describe("expand/collapse functionality", () => {
    it("shows expand button for long content", () => {
      const longContent = Array(30).fill("line").join("\n");

      render(
        <ToolResultDisplay
          toolName="Bash"
          content={longContent}
          summary="30 lines"
          toolUseResult={{
            stdout: longContent,
            stderr: "",
            interrupted: false,
            isImage: false,
          }}
        />,
      );

      expect(screen.getByText(/Show \d+ more lines?/)).toBeInTheDocument();
    });

    it("expands content when expand button is clicked", () => {
      const longContent = Array(30).fill("line").join("\n");

      render(
        <ToolResultDisplay
          toolName="Bash"
          content={longContent}
          summary="30 lines"
          toolUseResult={{
            stdout: longContent,
            stderr: "",
            interrupted: false,
            isImage: false,
          }}
        />,
      );

      const expandButton = screen.getByText(/Show \d+ more lines?/);
      fireEvent.click(expandButton);

      expect(screen.getByText("Collapse")).toBeInTheDocument();
    });

    it("does not show expand button for short content", () => {
      render(
        <ToolResultDisplay
          toolName="Bash"
          content="short"
          summary="1 line"
          toolUseResult={{
            stdout: "short",
            stderr: "",
            interrupted: false,
            isImage: false,
          }}
        />,
      );

      expect(
        screen.queryByText(/Show \d+ more lines?/),
      ).not.toBeInTheDocument();
    });
  });

  describe("copy functionality", () => {
    it("renders copy button", () => {
      render(
        <ToolResultDisplay
          toolName="Read"
          content="copyable content"
          summary="test"
        />,
      );

      // Copy button should be present
      const copyButton = document.querySelector(
        '[aria-label="Copy to clipboard"]',
      );
      expect(copyButton).toBeInTheDocument();
    });
  });
});

describe("DiffDisplay", () => {
  it("highlights added lines in green", () => {
    render(<DiffDisplay content="+added line" />);

    const addedLine = screen.getByText("+added line");
    expect(addedLine.parentElement).toHaveClass("bg-green-100");
  });

  it("highlights removed lines in red", () => {
    render(<DiffDisplay content="-removed line" />);

    const removedLine = screen.getByText("-removed line");
    expect(removedLine.parentElement).toHaveClass("bg-red-100");
  });

  it("highlights hunk headers in blue", () => {
    render(<DiffDisplay content="@@ -1,3 +1,4 @@" />);

    const hunkHeader = screen.getByText("@@ -1,3 +1,4 @@");
    expect(hunkHeader.parentElement).toHaveClass("bg-blue-100");
  });

  it("renders context lines without special highlighting", () => {
    render(<DiffDisplay content=" context line" />);

    const contextLine = screen.getByText("context line");
    expect(contextLine.parentElement).toHaveClass("bg-slate-50");
  });

  it("handles multiline diff content", () => {
    const diffContent = `+added
-removed
 context
@@ hunk @@`;

    render(<DiffDisplay content={diffContent} />);

    expect(screen.getByText("+added")).toBeInTheDocument();
    expect(screen.getByText("-removed")).toBeInTheDocument();
    expect(screen.getByText("context")).toBeInTheDocument();
    expect(screen.getByText("@@ hunk @@")).toBeInTheDocument();
  });
});

describe("BashContent", () => {
  it("renders terminal header with traffic lights", () => {
    render(
      <BashContent
        content="output"
        toolUseResult={{
          stdout: "output",
          stderr: "",
          interrupted: false,
          isImage: false,
        }}
      />,
    );

    expect(screen.getByText("Terminal")).toBeInTheDocument();
  });

  it("displays stdout content", () => {
    render(
      <BashContent
        content="command output"
        toolUseResult={{
          stdout: "command output",
          stderr: "",
          interrupted: false,
          isImage: false,
        }}
      />,
    );

    expect(screen.getByText("command output")).toBeInTheDocument();
  });

  it("displays stderr in red", () => {
    render(
      <BashContent
        content=""
        toolUseResult={{
          stdout: "",
          stderr: "error message",
          interrupted: false,
          isImage: false,
        }}
      />,
    );

    const stderrElement = screen.getByText("error message");
    expect(stderrElement).toHaveClass("text-red-400");
  });

  it("shows 'No output' for empty content", () => {
    render(
      <BashContent
        content=""
        toolUseResult={{
          stdout: "",
          stderr: "",
          interrupted: false,
          isImage: false,
        }}
      />,
    );

    expect(screen.getByText("No output")).toBeInTheDocument();
  });
});

describe("SearchResultContent", () => {
  describe("Glob results", () => {
    it("displays file paths with file icons", () => {
      const content = `src/index.ts
src/utils.ts
src/types.ts`;

      render(<SearchResultContent content={content} toolName="Glob" />);

      expect(screen.getByText("src/index.ts")).toBeInTheDocument();
      expect(screen.getByText("src/utils.ts")).toBeInTheDocument();
      expect(screen.getByText("src/types.ts")).toBeInTheDocument();
    });

    it("shows 'No results found' for empty content", () => {
      render(<SearchResultContent content="" toolName="Glob" />);

      expect(screen.getByText("No results found")).toBeInTheDocument();
    });
  });

  describe("Grep results", () => {
    it("parses and displays grep-style output", () => {
      const content = `src/index.ts:10:const x = 1;
src/utils.ts:20:function test() {}`;

      render(<SearchResultContent content={content} toolName="Grep" />);

      expect(screen.getByText("src/index.ts")).toBeInTheDocument();
      expect(screen.getByText("10")).toBeInTheDocument();
      expect(screen.getByText("const x = 1;")).toBeInTheDocument();
    });

    it("handles non-grep format lines", () => {
      const content = "just a plain line";

      render(<SearchResultContent content={content} toolName="Grep" />);

      expect(screen.getByText("just a plain line")).toBeInTheDocument();
    });
  });
});

describe("FileOperationContent", () => {
  it("renders diff content using DiffDisplay", () => {
    // Diff detection requires at least 2 diff lines or a hunk header
    render(<FileOperationContent content={"+added line\n-removed line"} />);

    const addedLine = screen.getByText("+added line");
    expect(addedLine.parentElement).toHaveClass("bg-green-100");
  });

  it("renders content with hunk header as diff", () => {
    render(<FileOperationContent content={"@@ -1,3 +1,4 @@\n context"} />);

    const hunkHeader = screen.getByText("@@ -1,3 +1,4 @@");
    expect(hunkHeader.parentElement).toHaveClass("bg-blue-100");
  });

  it("does not treat single + line as diff", () => {
    // A single line starting with + should not be treated as diff
    render(<FileOperationContent content="+1 (555) 123-4567" />);

    // Should render as plain text, not with diff highlighting
    const text = screen.getByText("+1 (555) 123-4567");
    expect(text.parentElement).not.toHaveClass("bg-green-100");
  });

  it("uses CodeBlock for content with language", () => {
    render(
      <FileOperationContent content="const x = 1;" language="typescript" />,
    );

    // CodeBlock renders the language label
    expect(screen.getByText("typescript")).toBeInTheDocument();
  });

  it("renders plain text for content without language or diff markers", () => {
    render(<FileOperationContent content="plain text content" />);

    expect(screen.getByText("plain text content")).toBeInTheDocument();
  });
});
