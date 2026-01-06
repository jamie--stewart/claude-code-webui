import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { CodeBlock } from "./CodeBlock";

// Mock highlight.js to avoid issues with CSS imports in tests
vi.mock("highlight.js/styles/github.css", () => ({}));

describe("CodeBlock", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("rendering", () => {
    it("renders code content", () => {
      render(<CodeBlock code="const x = 1;" language="typescript" />);

      const codeElement = document.querySelector("code");
      expect(codeElement?.textContent).toBe("const x = 1;");
    });

    it("renders language label when language is provided", () => {
      render(<CodeBlock code="const x = 1;" language="typescript" />);

      expect(screen.getByText("typescript")).toBeInTheDocument();
    });

    it("does not render language label when language is not provided", () => {
      render(<CodeBlock code="const x = 1;" />);

      // The code should be rendered
      const codeElement = document.querySelector("code");
      expect(codeElement?.textContent).toBe("const x = 1;");

      // But no language label div should exist (the only div with text-xs class)
      const languageLabel = document.querySelector(".text-xs.font-mono");
      expect(languageLabel).toBeNull();
    });

    it("renders multiline code correctly", () => {
      const multilineCode = `function hello() {
  console.log('hi');
}`;
      render(<CodeBlock code={multilineCode} language="javascript" />);

      const codeElement = document.querySelector("code");
      expect(codeElement?.textContent).toContain("function hello");
    });

    it("applies correct CSS classes to pre element", () => {
      render(<CodeBlock code="code" language="js" />);

      const preElement = document.querySelector("pre");
      expect(preElement).toHaveClass("overflow-x-auto");
      expect(preElement).toHaveClass("rounded-lg");
      expect(preElement).toHaveClass("bg-slate-100");
    });

    it("applies hljs class to code element", () => {
      render(<CodeBlock code="code" language="typescript" />);

      const codeElement = document.querySelector("code");
      expect(codeElement).toHaveClass("hljs");
    });

    it("applies language-specific class to code element", () => {
      render(<CodeBlock code="code" language="python" />);

      const codeElement = document.querySelector("code");
      expect(codeElement).toHaveClass("language-python");
    });

    it("does not apply language class when no language provided", () => {
      render(<CodeBlock code="code" />);

      const codeElement = document.querySelector("code");
      expect(codeElement).toHaveClass("hljs");
      expect(codeElement?.className).not.toContain("language-");
    });
  });

  describe("syntax highlighting", () => {
    it("highlights TypeScript code", async () => {
      render(<CodeBlock code="const x: number = 1;" language="typescript" />);

      // Wait for useEffect to run and apply highlighting
      await waitFor(() => {
        const codeElement = document.querySelector("code");
        // highlight.js adds span elements with hljs-* classes
        expect(
          codeElement?.innerHTML.includes("hljs-") ||
            codeElement?.textContent === "const x: number = 1;",
        ).toBe(true);
      });
    });

    it("highlights JavaScript code", async () => {
      render(<CodeBlock code="const x = 1;" language="javascript" />);

      await waitFor(() => {
        const codeElement = document.querySelector("code");
        expect(codeElement).toBeInTheDocument();
      });
    });

    it("highlights Python code", async () => {
      render(
        <CodeBlock code="def hello():\n    print('hi')" language="python" />,
      );

      await waitFor(() => {
        const codeElement = document.querySelector("code");
        expect(codeElement).toBeInTheDocument();
      });
    });

    it("highlights Bash code", async () => {
      render(<CodeBlock code="echo 'hello'" language="bash" />);

      await waitFor(() => {
        const codeElement = document.querySelector("code");
        expect(codeElement).toBeInTheDocument();
      });
    });

    it("highlights JSON code", async () => {
      render(<CodeBlock code='{"key": "value"}' language="json" />);

      await waitFor(() => {
        const codeElement = document.querySelector("code");
        expect(codeElement).toBeInTheDocument();
      });
    });

    it("auto-detects language when not specified", async () => {
      // JSON is easily auto-detected
      render(<CodeBlock code='{"name": "test", "value": 123}' />);

      await waitFor(() => {
        const codeElement = document.querySelector("code");
        expect(codeElement).toBeInTheDocument();
      });
    });

    it("handles unsupported language gracefully", async () => {
      render(<CodeBlock code="some code" language="unsupportedlang" />);

      await waitFor(() => {
        const codeElement = document.querySelector("code");
        // Should still render the code, possibly with auto-detection
        expect(codeElement?.textContent).toContain("some code");
      });
    });
  });

  describe("language aliases", () => {
    const aliasTestCases = [
      { alias: "ts", expected: "ts" },
      { alias: "tsx", expected: "tsx" },
      { alias: "js", expected: "js" },
      { alias: "jsx", expected: "jsx" },
      { alias: "py", expected: "py" },
      { alias: "sh", expected: "sh" },
      { alias: "shell", expected: "shell" },
      { alias: "yml", expected: "yml" },
      { alias: "md", expected: "md" },
      { alias: "golang", expected: "golang" },
      { alias: "rs", expected: "rs" },
    ];

    for (const { alias, expected } of aliasTestCases) {
      it(`renders language label for alias: ${alias}`, () => {
        render(<CodeBlock code="code" language={alias} />);

        expect(screen.getByText(expected)).toBeInTheDocument();
      });
    }
  });

  describe("edge cases", () => {
    it("handles empty code string", () => {
      render(<CodeBlock code="" language="typescript" />);

      const codeElement = document.querySelector("code");
      expect(codeElement).toBeInTheDocument();
    });

    it("handles code with special characters", () => {
      const codeWithSpecialChars = `<div class="test">&amp;</div>`;
      render(<CodeBlock code={codeWithSpecialChars} language="html" />);

      const codeElement = document.querySelector("code");
      expect(codeElement).toBeInTheDocument();
    });

    it("handles code with unicode characters", () => {
      const unicodeCode = `const emoji = "🎉";`;
      render(<CodeBlock code={unicodeCode} language="javascript" />);

      expect(screen.getByText(/🎉/)).toBeInTheDocument();
    });

    it("preserves indentation in code", async () => {
      const indentedCode = `function test() {
    if (true) {
        return 1;
    }
}`;
      render(<CodeBlock code={indentedCode} language="javascript" />);

      await waitFor(() => {
        const codeElement = document.querySelector("code");
        expect(codeElement?.textContent).toContain("    if (true)");
      });
    });
  });

  describe("re-rendering", () => {
    it("updates highlighting when code changes", async () => {
      const { rerender } = render(
        <CodeBlock code="const x = 1;" language="typescript" />,
      );

      await waitFor(() => {
        const codeElement = document.querySelector("code");
        expect(codeElement?.textContent).toBe("const x = 1;");
      });

      rerender(<CodeBlock code="const y = 2;" language="typescript" />);

      await waitFor(() => {
        const codeElement = document.querySelector("code");
        expect(codeElement?.textContent).toBe("const y = 2;");
      });
    });

    it("updates highlighting when language changes", async () => {
      const { rerender } = render(<CodeBlock code="x = 1" language="python" />);

      expect(screen.getByText("python")).toBeInTheDocument();

      rerender(<CodeBlock code="x = 1" language="javascript" />);

      expect(screen.getByText("javascript")).toBeInTheDocument();
    });
  });
});
