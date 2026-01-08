import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useCompletions } from "./useCompletions";

const defaultSlashCommands = [
  "/help",
  "/clear",
  "/config",
  "/commit",
  "/compact",
];

describe("useCompletions", () => {
  describe("initial state", () => {
    it("should start with dropdown closed", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      expect(result.current.completionState.isOpen).toBe(false);
      expect(result.current.completionState.items).toHaveLength(0);
      expect(result.current.completionState.selectedIndex).toBe(0);
    });
  });

  describe("handleInputChange", () => {
    it("should open dropdown when / is typed at start", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      act(() => {
        result.current.handleInputChange("/", 1);
      });

      expect(result.current.completionState.isOpen).toBe(true);
      expect(result.current.completionState.items).toHaveLength(5);
      expect(result.current.completionState.triggerType).toBe("slash");
    });

    it("should filter items based on partial input", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      act(() => {
        result.current.handleInputChange("/co", 3);
      });

      expect(result.current.completionState.isOpen).toBe(true);
      expect(result.current.completionState.items).toHaveLength(3); // commit, compact, config
    });

    it("should close dropdown when no matches", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      act(() => {
        result.current.handleInputChange("/xyz", 4);
      });

      expect(result.current.completionState.isOpen).toBe(false);
    });

    it("should close dropdown when trigger is removed", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      // Open dropdown
      act(() => {
        result.current.handleInputChange("/", 1);
      });
      expect(result.current.completionState.isOpen).toBe(true);

      // Remove trigger
      act(() => {
        result.current.handleInputChange("hello", 5);
      });
      expect(result.current.completionState.isOpen).toBe(false);
    });

    it("should reset selectedIndex when input changes", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      // Open and navigate
      act(() => {
        result.current.handleInputChange("/", 1);
      });
      act(() => {
        result.current.handleKeyDown({
          key: "ArrowDown",
        } as React.KeyboardEvent);
      });
      expect(result.current.completionState.selectedIndex).toBe(1);

      // Change input - should reset selection
      act(() => {
        result.current.handleInputChange("/c", 2);
      });
      expect(result.current.completionState.selectedIndex).toBe(0);
    });

    it("should detect / after space in middle of text", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      act(() => {
        result.current.handleInputChange("hello /", 7);
      });

      expect(result.current.completionState.isOpen).toBe(true);
      expect(result.current.completionState.triggerPosition).toBe(6);
    });
  });

  describe("handleKeyDown", () => {
    it("should return false when dropdown is closed", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      let handled = false;
      act(() => {
        handled = result.current.handleKeyDown({
          key: "ArrowDown",
        } as React.KeyboardEvent);
      });

      expect(handled).toBe(false);
    });

    it("should navigate down with ArrowDown", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      act(() => {
        result.current.handleInputChange("/", 1);
      });

      let handled = false;
      act(() => {
        handled = result.current.handleKeyDown({
          key: "ArrowDown",
        } as React.KeyboardEvent);
      });

      expect(handled).toBe(true);
      expect(result.current.completionState.selectedIndex).toBe(1);
    });

    it("should navigate up with ArrowUp", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      act(() => {
        result.current.handleInputChange("/", 1);
      });

      // Move down first
      act(() => {
        result.current.handleKeyDown({
          key: "ArrowDown",
        } as React.KeyboardEvent);
      });
      expect(result.current.completionState.selectedIndex).toBe(1);

      // Move up
      act(() => {
        result.current.handleKeyDown({
          key: "ArrowUp",
        } as React.KeyboardEvent);
      });
      expect(result.current.completionState.selectedIndex).toBe(0);
    });

    it("should wrap around when navigating past end", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: ["/a", "/b"] }),
      );

      act(() => {
        result.current.handleInputChange("/", 1);
      });

      // Navigate to end and wrap
      act(() => {
        result.current.handleKeyDown({
          key: "ArrowDown",
        } as React.KeyboardEvent);
      });
      act(() => {
        result.current.handleKeyDown({
          key: "ArrowDown",
        } as React.KeyboardEvent);
      });

      expect(result.current.completionState.selectedIndex).toBe(0);
    });

    it("should wrap around when navigating past start", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: ["/a", "/b"] }),
      );

      act(() => {
        result.current.handleInputChange("/", 1);
      });

      // Navigate up from 0
      act(() => {
        result.current.handleKeyDown({
          key: "ArrowUp",
        } as React.KeyboardEvent);
      });

      expect(result.current.completionState.selectedIndex).toBe(1);
    });

    it("should return true for Enter key when open", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      act(() => {
        result.current.handleInputChange("/", 1);
      });

      let handled = false;
      act(() => {
        handled = result.current.handleKeyDown({
          key: "Enter",
        } as React.KeyboardEvent);
      });

      expect(handled).toBe(true);
    });

    it("should return true for Tab key when open", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      act(() => {
        result.current.handleInputChange("/", 1);
      });

      let handled = false;
      act(() => {
        handled = result.current.handleKeyDown({
          key: "Tab",
        } as React.KeyboardEvent);
      });

      expect(handled).toBe(true);
    });

    it("should close dropdown on Escape", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      act(() => {
        result.current.handleInputChange("/", 1);
      });
      expect(result.current.completionState.isOpen).toBe(true);

      act(() => {
        result.current.handleKeyDown({ key: "Escape" } as React.KeyboardEvent);
      });
      expect(result.current.completionState.isOpen).toBe(false);
    });

    it("should return false for unhandled keys", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      act(() => {
        result.current.handleInputChange("/", 1);
      });

      let handled = false;
      act(() => {
        handled = result.current.handleKeyDown({
          key: "a",
        } as React.KeyboardEvent);
      });

      expect(handled).toBe(false);
    });
  });

  describe("selectCompletion", () => {
    it("should return new text with completion applied", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      act(() => {
        result.current.handleInputChange("/he", 3);
      });

      let newText = "";
      act(() => {
        newText = result.current.selectCompletion(0, "/he");
      });

      expect(newText).toBe("/help ");
    });

    it("should close dropdown after selection", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      act(() => {
        result.current.handleInputChange("/", 1);
      });
      expect(result.current.completionState.isOpen).toBe(true);

      act(() => {
        result.current.selectCompletion(0, "/");
      });
      expect(result.current.completionState.isOpen).toBe(false);
    });

    it("should return original text for invalid index", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      act(() => {
        result.current.handleInputChange("/", 1);
      });

      let newText = "";
      act(() => {
        newText = result.current.selectCompletion(999, "/");
      });

      expect(newText).toBe("/");
    });
  });

  describe("closeCompletions", () => {
    it("should close the dropdown", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      act(() => {
        result.current.handleInputChange("/", 1);
      });
      expect(result.current.completionState.isOpen).toBe(true);

      act(() => {
        result.current.closeCompletions();
      });
      expect(result.current.completionState.isOpen).toBe(false);
    });
  });

  describe("setSelectedIndex", () => {
    it("should update selected index", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      act(() => {
        result.current.handleInputChange("/", 1);
      });

      act(() => {
        result.current.setSelectedIndex(2);
      });

      expect(result.current.completionState.selectedIndex).toBe(2);
    });

    it("should clamp index to valid range", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: ["/a", "/b"] }),
      );

      act(() => {
        result.current.handleInputChange("/", 1);
      });

      act(() => {
        result.current.setSelectedIndex(999);
      });

      expect(result.current.completionState.selectedIndex).toBe(1); // Max index
    });

    it("should not go below 0", () => {
      const { result } = renderHook(() =>
        useCompletions({ slashCommands: defaultSlashCommands }),
      );

      act(() => {
        result.current.handleInputChange("/", 1);
      });

      act(() => {
        result.current.setSelectedIndex(-5);
      });

      expect(result.current.completionState.selectedIndex).toBe(0);
    });
  });
});
