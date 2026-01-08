import { useState, useCallback, useMemo, useRef, useEffect } from "react";
import type {
  CompletionState,
  UseCompletionsOptions,
  UseCompletionsReturn,
  CompletionItem,
  MentionsResponse,
} from "./types";
import {
  detectCompletionTrigger,
  filterCompletions,
  filterMentionCompletions,
  applyCompletion,
  slashCommandsToCompletionItems,
  mentionItemsToCompletionItems,
} from "../../utils/completionUtils";
import { getMentionsUrl } from "../../config/api";

const initialState: CompletionState = {
  isOpen: false,
  items: [],
  selectedIndex: 0,
  triggerPosition: 0,
  triggerType: null,
};

// Default fetch function for mentions API
const defaultFetchMentions = async (
  cwd: string,
  query: string,
): Promise<MentionsResponse | null> => {
  try {
    const response = await fetch(getMentionsUrl(cwd, query));
    if (!response.ok) {
      return null;
    }
    return response.json();
  } catch {
    return null;
  }
};

// Debounce delay for mention API calls (ms)
const MENTION_DEBOUNCE_MS = 150;

/**
 * Hook for managing completion state and interactions.
 * Handles trigger detection, filtering, keyboard navigation, and completion application.
 * Supports both slash commands (/) and @ mentions.
 *
 * @param options - Configuration options including available slash commands and working directory
 * @returns Object with completion state and handler functions
 */
export function useCompletions(
  options: UseCompletionsOptions,
): UseCompletionsReturn {
  const [state, setState] = useState<CompletionState>(initialState);

  // Cached mention items from API
  const [mentionItems, setMentionItems] = useState<CompletionItem[]>([]);

  // Refs for debouncing and cleanup
  const debounceTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastMentionQueryRef = useRef<string>("");

  // Use provided fetchMentions or default
  const fetchMentionsFn = options.fetchMentions || defaultFetchMentions;

  // Convert slash commands to CompletionItems (memoized)
  const slashCommandItems: CompletionItem[] = useMemo(
    () => slashCommandsToCompletionItems(options.slashCommands),
    [options.slashCommands],
  );

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  /**
   * Fetch mention suggestions from the API
   */
  const fetchMentions = useCallback(
    async (query: string, triggerStartPosition: number) => {
      if (!options.workingDirectory) {
        return;
      }

      // Cancel any pending request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      abortControllerRef.current = new AbortController();

      try {
        const response = await fetchMentionsFn(options.workingDirectory, query);

        if (response && response.items.length > 0) {
          const completionItems = mentionItemsToCompletionItems(response.items);
          setMentionItems(completionItems);

          // Filter and show results
          const filtered = filterMentionCompletions(completionItems, query);
          if (filtered.length > 0) {
            setState({
              isOpen: true,
              items: filtered,
              selectedIndex: 0,
              triggerPosition: triggerStartPosition,
              triggerType: "mention",
            });
          } else {
            setState(initialState);
          }
        } else {
          setState(initialState);
        }
      } catch {
        // Ignore abort errors, close dropdown on other errors
        setState(initialState);
      }
    },
    [options.workingDirectory, fetchMentionsFn],
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
      } else if (trigger?.type === "mention") {
        // Clear any pending debounce
        if (debounceTimeoutRef.current) {
          clearTimeout(debounceTimeoutRef.current);
        }

        // If we have cached mentions, filter locally for immediate feedback
        if (mentionItems.length > 0) {
          const filtered = filterMentionCompletions(
            mentionItems,
            trigger.partial,
          );
          if (filtered.length > 0) {
            setState({
              isOpen: true,
              items: filtered,
              selectedIndex: 0,
              triggerPosition: trigger.startPosition,
              triggerType: "mention",
            });
          }
        }

        // Debounce API call for fresh results
        if (trigger.partial !== lastMentionQueryRef.current) {
          lastMentionQueryRef.current = trigger.partial;
          debounceTimeoutRef.current = setTimeout(() => {
            fetchMentions(trigger.partial, trigger.startPosition);
          }, MENTION_DEBOUNCE_MS);
        }
      } else {
        // No trigger, close dropdown
        setState(initialState);
      }
    },
    [slashCommandItems, mentionItems, fetchMentions],
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
