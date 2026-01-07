import { describe, it, expect } from "vitest";
import {
  getStatusIcon,
  getStatusColorScheme,
  formatDuration,
  detectLanguageFromPath,
  parseToolResult,
} from "./toolResultUtils";

describe("getStatusIcon", () => {
  it("returns checkmark for success", () => {
    expect(getStatusIcon("success")).toBe("\u2705");
  });

  it("returns warning symbol for warning", () => {
    expect(getStatusIcon("warning")).toBe("\u26a0\ufe0f");
  });

  it("returns X for error", () => {
    expect(getStatusIcon("error")).toBe("\u274c");
  });
});

describe("getStatusColorScheme", () => {
  it("returns emerald colors for success", () => {
    const scheme = getStatusColorScheme("success");
    expect(scheme.bg).toContain("emerald");
    expect(scheme.border).toContain("emerald");
    expect(scheme.header).toContain("emerald");
  });

  it("returns amber colors for warning", () => {
    const scheme = getStatusColorScheme("warning");
    expect(scheme.bg).toContain("amber");
    expect(scheme.border).toContain("amber");
    expect(scheme.header).toContain("amber");
  });

  it("returns red colors for error", () => {
    const scheme = getStatusColorScheme("error");
    expect(scheme.bg).toContain("red");
    expect(scheme.border).toContain("red");
    expect(scheme.header).toContain("red");
  });
});

describe("formatDuration", () => {
  it("formats milliseconds correctly", () => {
    expect(formatDuration(500)).toBe("500ms");
    expect(formatDuration(999)).toBe("999ms");
  });

  it("formats seconds correctly", () => {
    expect(formatDuration(1000)).toBe("1.0s");
    expect(formatDuration(1500)).toBe("1.5s");
    expect(formatDuration(59000)).toBe("59.0s");
  });

  it("formats minutes and seconds correctly", () => {
    expect(formatDuration(60000)).toBe("1m 0s");
    expect(formatDuration(90000)).toBe("1m 30s");
    expect(formatDuration(125000)).toBe("2m 5s");
  });
});

describe("detectLanguageFromPath", () => {
  const testCases: Array<{ path: string; expected: string | undefined }> = [
    { path: "file.ts", expected: "typescript" },
    { path: "file.tsx", expected: "typescript" },
    { path: "file.js", expected: "javascript" },
    { path: "file.jsx", expected: "javascript" },
    { path: "file.py", expected: "python" },
    { path: "file.go", expected: "go" },
    { path: "file.rs", expected: "rust" },
    { path: "file.json", expected: "json" },
    { path: "file.yaml", expected: "yaml" },
    { path: "file.yml", expected: "yaml" },
    { path: "file.md", expected: "markdown" },
    { path: "file.sh", expected: "bash" },
    { path: "file.bash", expected: "bash" },
    { path: "file.html", expected: "html" },
    { path: "file.css", expected: "css" },
    { path: "file.sql", expected: "sql" },
    { path: "file.unknown", expected: undefined },
    { path: "file", expected: undefined },
  ];

  for (const { path, expected } of testCases) {
    it(`detects ${expected || "undefined"} for ${path}`, () => {
      expect(detectLanguageFromPath(path)).toBe(expected);
    });
  }
});

describe("parseToolResult", () => {
  describe("Bash tool", () => {
    it("returns success status for clean output", () => {
      const result = parseToolResult("Bash", "output", "completed", {
        stdout: "output",
        stderr: "",
        interrupted: false,
        isImage: false,
      });

      expect(result.status).toBe("success");
      expect(result.displayContent).toBe("output");
    });

    it("returns warning status for interrupted command", () => {
      const result = parseToolResult("Bash", "partial", "interrupted", {
        stdout: "partial",
        stderr: "",
        interrupted: true,
        isImage: false,
      });

      expect(result.status).toBe("warning");
    });

    it("returns error status for stderr with error keyword", () => {
      const result = parseToolResult("Bash", "", "failed", {
        stdout: "",
        stderr: "Error: command not found",
        interrupted: false,
        isImage: false,
      });

      expect(result.status).toBe("error");
    });

    it("returns warning status for stderr without error keyword", () => {
      const result = parseToolResult("Bash", "", "warning", {
        stdout: "",
        stderr: "warning: deprecated option",
        interrupted: false,
        isImage: false,
      });

      expect(result.status).toBe("warning");
    });

    it("extracts line count from output", () => {
      const stdout = "line1\nline2\nline3";
      const result = parseToolResult("Bash", stdout, "completed", {
        stdout,
        stderr: "",
        interrupted: false,
        isImage: false,
      });

      expect(result.metadata.lineCount).toBe(3);
    });
  });

  describe("Edit tool", () => {
    it("returns success status for valid edit", () => {
      const result = parseToolResult("Edit", "diff content", "+1/-1 lines", {
        structuredPatch: [{ lines: ["+added", "-removed"] }],
      });

      expect(result.status).toBe("success");
      expect(result.language).toBe("diff");
    });

    it("extracts line count from structured patch", () => {
      const result = parseToolResult("Edit", "diff", "changes", {
        structuredPatch: [{ lines: ["+added1", "+added2", "-removed1"] }],
      });

      expect(result.metadata.lineCount).toBe(3);
    });

    it("returns error status when content contains error", () => {
      const result = parseToolResult(
        "Edit",
        "Error: file not found",
        "failed",
        {},
      );

      expect(result.status).toBe("error");
    });
  });

  describe("Read tool", () => {
    it("extracts line count from summary", () => {
      const result = parseToolResult("Read", "file content", "100 lines");

      expect(result.status).toBe("success");
      expect(result.metadata.lineCount).toBe(100);
    });

    it("counts lines from content when summary lacks line count", () => {
      const content = "line1\nline2\nline3";
      const result = parseToolResult("Read", content, "file.txt");

      expect(result.metadata.lineCount).toBe(3);
    });

    it("detects language from file path in summary", () => {
      const result = parseToolResult("Read", "const x = 1;", "file.ts");

      expect(result.language).toBe("typescript");
    });
  });

  describe("Write tool", () => {
    it("returns success status for successful write", () => {
      const result = parseToolResult("Write", "File written", "file.ts");

      expect(result.status).toBe("success");
    });

    it("returns error status when content contains error", () => {
      const result = parseToolResult(
        "Write",
        "Failed to write file",
        "file.ts",
      );

      expect(result.status).toBe("error");
    });

    it("extracts file count from summary", () => {
      const result = parseToolResult("Write", "Files written", "3 files");

      expect(result.metadata.fileCount).toBe(3);
    });
  });

  describe("Grep tool", () => {
    it("counts matches from content lines", () => {
      const content = `file1.ts:10:match1
file2.ts:20:match2
file3.ts:30:match3`;

      const result = parseToolResult("Grep", content, "3 matches");

      expect(result.status).toBe("success");
      expect(result.metadata.matchCount).toBe(3);
    });

    it("counts unique files from grep output", () => {
      const content = `file1.ts:10:match1
file1.ts:20:match2
file2.ts:30:match3`;

      const result = parseToolResult("Grep", content, "3 matches");

      expect(result.metadata.fileCount).toBe(2);
    });

    it("returns warning status for no matches", () => {
      const result = parseToolResult("Grep", "", "0 matches");

      expect(result.status).toBe("warning");
      expect(result.metadata.matchCount).toBe(0);
    });
  });

  describe("Glob tool", () => {
    it("counts files from content lines", () => {
      const content = `src/file1.ts
src/file2.ts
src/file3.ts`;

      const result = parseToolResult("Glob", content, "3 files");

      expect(result.status).toBe("success");
      expect(result.metadata.fileCount).toBe(3);
    });

    it("returns warning status for no files", () => {
      const result = parseToolResult("Glob", "", "0 files");

      expect(result.status).toBe("warning");
      expect(result.metadata.fileCount).toBe(0);
    });
  });

  describe("Unknown tools", () => {
    it("returns success status by default", () => {
      const result = parseToolResult("CustomTool", "output", "summary");

      expect(result.status).toBe("success");
    });

    it("counts content lines for metadata", () => {
      const content = "line1\nline2\nline3";
      const result = parseToolResult("CustomTool", content, "summary");

      expect(result.metadata.lineCount).toBe(3);
    });
  });
});
