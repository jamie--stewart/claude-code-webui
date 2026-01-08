import { describe, it, expect } from "vitest";
import {
  detectCompletionTrigger,
  filterCompletions,
  applyCompletion,
  slashCommandsToCompletionItems,
} from "./completionUtils";
import type { CompletionItem } from "../hooks/completions/types";

describe("detectCompletionTrigger", () => {
  describe("slash command triggers", () => {
    it("should detect / at the start of input", () => {
      const result = detectCompletionTrigger("/", 1);
      expect(result).toEqual({
        type: "slash",
        partial: "",
        startPosition: 0,
      });
    });

    it("should detect / with partial text", () => {
      const result = detectCompletionTrigger("/help", 5);
      expect(result).toEqual({
        type: "slash",
        partial: "help",
        startPosition: 0,
      });
    });

    it("should detect / after a space", () => {
      const result = detectCompletionTrigger("hello /com", 10);
      expect(result).toEqual({
        type: "slash",
        partial: "com",
        startPosition: 6,
      });
    });

    it("should detect / after a newline", () => {
      const result = detectCompletionTrigger("line1\n/test", 11);
      expect(result).toEqual({
        type: "slash",
        partial: "test",
        startPosition: 6,
      });
    });

    it("should return null when cursor is at position 0", () => {
      const result = detectCompletionTrigger("/hello", 0);
      expect(result).toBeNull();
    });

    it("should return null for / in the middle of a word", () => {
      // e.g., "path/to/file" - the "/" is not after whitespace
      const result = detectCompletionTrigger("path/to", 7);
      expect(result).toBeNull();
    });

    it("should return null when no trigger is present", () => {
      const result = detectCompletionTrigger("hello world", 11);
      expect(result).toBeNull();
    });

    it("should handle empty input", () => {
      const result = detectCompletionTrigger("", 0);
      expect(result).toBeNull();
    });

    it("should handle cursor in middle of slash command", () => {
      const result = detectCompletionTrigger("/hello world", 4);
      expect(result).toEqual({
        type: "slash",
        partial: "hel",
        startPosition: 0,
      });
    });
  });
});

describe("filterCompletions", () => {
  const testItems: CompletionItem[] = [
    { type: "slash_command", value: "/help", displayText: "/help" },
    { type: "slash_command", value: "/hello", displayText: "/hello" },
    { type: "slash_command", value: "/clear", displayText: "/clear" },
    { type: "slash_command", value: "/config", displayText: "/config" },
    { type: "slash_command", value: "/commit", displayText: "/commit" },
  ];

  it("should return all items when partial is empty", () => {
    const result = filterCompletions(testItems, "");
    expect(result).toHaveLength(5);
  });

  it("should filter by prefix (case-insensitive)", () => {
    const result = filterCompletions(testItems, "he");
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.value)).toContain("/help");
    expect(result.map((i) => i.value)).toContain("/hello");
  });

  it("should handle uppercase partial", () => {
    const result = filterCompletions(testItems, "HE");
    expect(result).toHaveLength(2);
  });

  it("should filter by prefix for co", () => {
    const result = filterCompletions(testItems, "co");
    expect(result).toHaveLength(2);
    expect(result.map((i) => i.value)).toContain("/config");
    expect(result.map((i) => i.value)).toContain("/commit");
  });

  it("should return empty array when no matches", () => {
    const result = filterCompletions(testItems, "xyz");
    expect(result).toHaveLength(0);
  });

  it("should put exact match first", () => {
    const items: CompletionItem[] = [
      { type: "slash_command", value: "/helper", displayText: "/helper" },
      { type: "slash_command", value: "/help", displayText: "/help" },
      { type: "slash_command", value: "/helping", displayText: "/helping" },
    ];
    const result = filterCompletions(items, "help");
    expect(result[0].value).toBe("/help");
  });

  it("should sort alphabetically after exact match", () => {
    const result = filterCompletions(testItems, "c");
    // Should be: clear, commit, config (alphabetical)
    expect(result[0].value).toBe("/clear");
    expect(result[1].value).toBe("/commit");
    expect(result[2].value).toBe("/config");
  });
});

describe("applyCompletion", () => {
  it("should replace trigger at start with completion + space", () => {
    const result = applyCompletion("/he", 0, 3, "/help");
    expect(result.newText).toBe("/help ");
    expect(result.newCursorPosition).toBe(6);
  });

  it("should replace partial in middle of text", () => {
    const result = applyCompletion("hello /co world", 6, 9, "/commit");
    expect(result.newText).toBe("hello /commit  world");
    expect(result.newCursorPosition).toBe(14);
  });

  it("should preserve text before and after", () => {
    const result = applyCompletion("start /test end", 6, 11, "/testing");
    expect(result.newText).toBe("start /testing  end");
  });

  it("should handle completion at end of text", () => {
    const result = applyCompletion("hello /", 6, 7, "/help");
    expect(result.newText).toBe("hello /help ");
    expect(result.newCursorPosition).toBe(12);
  });

  it("should handle empty text before trigger", () => {
    const result = applyCompletion("/conf", 0, 5, "/config");
    expect(result.newText).toBe("/config ");
    expect(result.newCursorPosition).toBe(8);
  });
});

describe("slashCommandsToCompletionItems", () => {
  it("should convert string array to CompletionItem array", () => {
    const commands = ["/help", "/clear", "/config"];
    const result = slashCommandsToCompletionItems(commands);

    expect(result).toHaveLength(3);
    expect(result[0]).toEqual({
      type: "slash_command",
      value: "/help",
      displayText: "/help",
    });
  });

  it("should handle empty array", () => {
    const result = slashCommandsToCompletionItems([]);
    expect(result).toHaveLength(0);
  });

  it("should preserve order", () => {
    const commands = ["/z", "/a", "/m"];
    const result = slashCommandsToCompletionItems(commands);
    expect(result.map((i) => i.value)).toEqual(["/z", "/a", "/m"]);
  });
});
