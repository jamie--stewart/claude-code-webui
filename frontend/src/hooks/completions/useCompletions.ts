import { useState, useCallback, useMemo } from "react";
import type {
  CompletionState,
  UseCompletionsOptions,
  UseCompletionsReturn,
  CompletionItem,
} from "./types";
import {
  detectCompletionTrigger,
  filterCompletions,
  applyCompletion,
  slashCommandsToCompletionItems,
} from "../../utils/completionUtils";

const initialState: CompletionState = {
  isOpen: false,
  items: [],
  selectedIndex: 0,
  triggerPosition: 0,
  triggerType: null,
};

/**
 * Hook for managing completion state and interactions.
 * Handles trigger detection, filtering, keyboard navigation, and completion application.
 *
 * @param options - Configuration options including available slash commands
 * @returns Object with completion state and handler functions
 */
export function useCompletions(
  options: UseCompletionsOptions,
): UseCompletionsReturn {
  const [state, setState] = useState<CompletionState>(initialState);

  // Convert slash commands to CompletionItems (memoized)
  const slashCommandItems: CompletionItem[] = useMemo(
    () => slashCommandsToCompletionItems(options.slashCommands),
    [options.slashCommands],
  );

  /**
   * Handle input changes to detect triggers and filter completions
   */
  const handleInputChange = useCallback(
    (value: string, cursorPosition: number) => {
      const trigger = detectCompletionTrigger(value, cursorPosition);

      if (trigger?.type === "slash") {
        const filtered = filterCompletions(slashCommandItems, trigger.partial);

        if (filtered.length > 0) {
          setState({
            isOpen: true,
            items: filtered,
            selectedIndex: 0,
            triggerPosition: trigger.startPosition,
            triggerType: "slash",
          });
        } else {
          // No matches, close dropdown
          setState(initialState);
        }
      } else {
        // No trigger, close dropdown
        setState(initialState);
      }
    },
    [slashCommandItems],
  );

  /**
   * Handle keyboard events for navigation.
   * Returns true if the event was handled (should preventDefault).
   */
  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent): boolean => {
      if (!state.isOpen || state.items.length === 0) {
        return false;
      }

      switch (e.key) {
        case "ArrowDown": {
          setState((prev) => ({
            ...prev,
            selectedIndex: (prev.selectedIndex + 1) % prev.items.length,
          }));
          return true;
        }

        case "ArrowUp": {
          setState((prev) => ({
            ...prev,
            selectedIndex:
              prev.selectedIndex === 0
                ? prev.items.length - 1
                : prev.selectedIndex - 1,
          }));
          return true;
        }

        case "Enter":
        case "Tab": {
          // Selection is handled by the caller after getting the new text
          return true;
        }

        case "Escape": {
          setState(initialState);
          return true;
        }

        default:
          return false;
      }
    },
    [state.isOpen, state.items.length],
  );

  /**
   * Select a completion at the given index.
   * Returns the new input value with the completion applied.
   */
  const selectCompletion = useCallback(
    (index: number, currentInput: string): string => {
      if (index < 0 || index >= state.items.length) {
        return currentInput;
      }

      const item = state.items[index];
      const { newText } = applyCompletion(
        currentInput,
        state.triggerPosition,
        // Estimate cursor position as trigger position + "/" + partial length
        state.triggerPosition + 1 + (item.value.length - 1),
        item.value,
      );

      // Close the dropdown after selection
      setState(initialState);

      return newText;
    },
    [state.items, state.triggerPosition],
  );

  /**
   * Close the completions dropdown
   */
  const closeCompletions = useCallback(() => {
    setState(initialState);
  }, []);

  /**
   * Update selected index (for mouse hover)
   */
  const setSelectedIndex = useCallback((index: number) => {
    setState((prev) => ({
      ...prev,
      selectedIndex: Math.max(0, Math.min(index, prev.items.length - 1)),
    }));
  }, []);

  return {
    completionState: state,
    handleInputChange,
    handleKeyDown,
    selectCompletion,
    closeCompletions,
    setSelectedIndex,
  };
}
