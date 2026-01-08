/**
 * Utility functions for completion handling
 */

import type {
  CompletionItem,
  TriggerDetectionResult,
} from "../hooks/completions/types";

/**
 * Detect if cursor is in a completion trigger context.
 * Returns trigger info if a trigger is found, null otherwise.
 *
 * A "/" trigger is valid when:
 * - It's at the start of the input
 * - It's preceded by whitespace (space or newline)
 *
 * @param text - The current input text
 * @param cursorPosition - The current cursor position
 * @returns Trigger info or null if no trigger is active
 */
export function detectCompletionTrigger(
  text: string,
  cursorPosition: number,
): TriggerDetectionResult | null {
  // Look backwards from cursor to find a potential trigger
  if (cursorPosition === 0) {
    return null;
  }

  // Find the start of the current "word" (bounded by whitespace)
  let wordStart = cursorPosition;
  while (wordStart > 0 && !/\s/.test(text[wordStart - 1])) {
    wordStart--;
  }

  // Check if this word starts with a trigger character
  const word = text.slice(wordStart, cursorPosition);

  // Slash command trigger: "/" at start of word
  if (word.startsWith("/")) {
    return {
      type: "slash",
      partial: word.slice(1), // Remove the "/" prefix
      startPosition: wordStart,
    };
  }

  return null;
}

/**
 * Filter completion items based on partial input.
 * Uses case-insensitive prefix matching and sorts by relevance.
 *
 * @param items - All available completion items
 * @param partial - The partial text to match against
 * @returns Filtered and sorted completion items
 */
export function filterCompletions(
  items: CompletionItem[],
  partial: string,
): CompletionItem[] {
  const lowerPartial = partial.toLowerCase();

  // Filter items that match the partial text (case-insensitive)
  const filtered = items.filter((item) => {
    // Match against the value without the leading "/"
    const valueWithoutSlash = item.value.slice(1).toLowerCase();
    return valueWithoutSlash.startsWith(lowerPartial);
  });

  // Sort: exact matches first, then alphabetically
  return filtered.sort((a, b) => {
    const aValue = a.value.slice(1).toLowerCase();
    const bValue = b.value.slice(1).toLowerCase();

    // Exact match comes first
    if (aValue === lowerPartial && bValue !== lowerPartial) return -1;
    if (bValue === lowerPartial && aValue !== lowerPartial) return 1;

    // Otherwise sort alphabetically
    return aValue.localeCompare(bValue);
  });
}

/**
 * Apply a selected completion to the input text.
 * Replaces the trigger and partial text with the full completion value.
 *
 * @param text - The current input text
 * @param triggerPosition - Position where the trigger started
 * @param cursorPosition - Current cursor position
 * @param completion - The completion value to insert
 * @returns Object with new text and new cursor position
 */
export function applyCompletion(
  text: string,
  triggerPosition: number,
  cursorPosition: number,
  completion: string,
): { newText: string; newCursorPosition: number } {
  // Replace from trigger position to cursor position with completion + space
  const before = text.slice(0, triggerPosition);
  const after = text.slice(cursorPosition);
  const completionWithSpace = completion + " ";

  const newText = before + completionWithSpace + after;
  const newCursorPosition = triggerPosition + completionWithSpace.length;

  return { newText, newCursorPosition };
}

/**
 * Convert an array of slash command strings to CompletionItem objects.
 *
 * @param commands - Array of slash command strings (e.g., ["/help", "/clear"])
 * @returns Array of CompletionItem objects
 */
export function slashCommandsToCompletionItems(
  commands: string[],
): CompletionItem[] {
  return commands.map((cmd) => ({
    type: "slash_command" as const,
    value: cmd,
    displayText: cmd,
  }));
}
