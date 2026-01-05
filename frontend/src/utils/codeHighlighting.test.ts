import { describe, it, expect } from "vitest";
import { parseContentWithCodeBlocks, hasCodeBlocks } from "./codeHighlighting";

describe("codeHighlighting", () => {
  describe("hasCodeBlocks", () => {
    it("should return true when content has a fenced code block", () => {
      const content = "Here is some code:\n```typescript\nconst x = 1;\n```";
      expect(hasCodeBlocks(content)).toBe(true);
    });

    it("should return true when content has a code block without language", () => {
      const content = "Here is some code:\n```\nconst x = 1;\n```";
      expect(hasCodeBlocks(content)).toBe(true);
    });

    it("should return false when content has no code blocks", () => {
      const content = "Just regular text without any code blocks";
      expect(hasCodeBlocks(content)).toBe(false);
    });

    it("should return false for empty content", () => {
      expect(hasCodeBlocks("")).toBe(false);
    });

    it("should return false for inline code with single backticks", () => {
      const content = "Use `const x = 1` for variable declaration";
      expect(hasCodeBlocks(content)).toBe(false);
    });
  });

  describe("parseContentWithCodeBlocks", () => {
    it("should parse a single code block with language", () => {
      const content = "```typescript\nconst x = 1;\n```";
      const result = parseContentWithCodeBlocks(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "code",
        code: "const x = 1;",
        language: "typescript",
      });
    });

    it("should parse a code block without language", () => {
      const content = "```\nconst x = 1;\n```";
      const result = parseContentWithCodeBlocks(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "code",
        code: "const x = 1;",
        language: undefined,
      });
    });

    it("should parse text before a code block", () => {
      const content = "Here is some code:\n```js\nconst x = 1;\n```";
      const result = parseContentWithCodeBlocks(content);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: "text",
        content: "Here is some code:\n",
      });
      expect(result[1]).toEqual({
        type: "code",
        code: "const x = 1;",
        language: "js",
      });
    });

    it("should parse text after a code block", () => {
      const content = "```python\nx = 1\n```\nThat was some code.";
      const result = parseContentWithCodeBlocks(content);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        type: "code",
        code: "x = 1",
        language: "python",
      });
      expect(result[1]).toEqual({
        type: "text",
        content: "\nThat was some code.",
      });
    });

    it("should parse multiple code blocks with text between", () => {
      const content =
        "First block:\n```js\nconst a = 1;\n```\nSecond block:\n```python\nx = 2\n```";
      const result = parseContentWithCodeBlocks(content);

      expect(result).toHaveLength(4);
      expect(result[0]).toEqual({ type: "text", content: "First block:\n" });
      expect(result[1]).toEqual({
        type: "code",
        code: "const a = 1;",
        language: "js",
      });
      expect(result[2]).toEqual({ type: "text", content: "\nSecond block:\n" });
      expect(result[3]).toEqual({
        type: "code",
        code: "x = 2",
        language: "python",
      });
    });

    it("should handle content without code blocks", () => {
      const content = "Just regular text";
      const result = parseContentWithCodeBlocks(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "text",
        content: "Just regular text",
      });
    });

    it("should handle empty content", () => {
      const result = parseContentWithCodeBlocks("");
      expect(result).toHaveLength(0);
    });

    it("should handle code block with multiline content", () => {
      const content =
        "```typescript\nfunction hello() {\n  console.log('hi');\n}\n```";
      const result = parseContentWithCodeBlocks(content);

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        type: "code",
        code: "function hello() {\n  console.log('hi');\n}",
        language: "typescript",
      });
    });

    it("should preserve whitespace only in code blocks", () => {
      const content = "   \n```js\n  indented code\n```\n   ";
      const result = parseContentWithCodeBlocks(content);

      // Empty text segments should be filtered out
      expect(result.some((s) => s.type === "code")).toBe(true);
    });

    it("should handle various language hints", () => {
      const languages = ["bash", "sh", "json", "yaml", "css", "html", "sql"];

      for (const lang of languages) {
        const content = `\`\`\`${lang}\ncode here\n\`\`\``;
        const result = parseContentWithCodeBlocks(content);

        expect(result).toHaveLength(1);
        expect(result[0]).toEqual({
          type: "code",
          code: "code here",
          language: lang,
        });
      }
    });
  });
});
