/**
 * Types for the completions system
 */

/**
 * A single completion item that can be displayed in the dropdown
 */
export interface CompletionItem {
  /** Type of completion - currently only slash_command supported */
  type: "slash_command";
  /** The actual value to insert (e.g., "/help") */
  value: string;
  /** What to show in the dropdown */
  displayText: string;
  /** Optional description/tooltip */
  description?: string;
}

/**
 * Current state of the completions dropdown
 */
export interface CompletionState {
  /** Whether the dropdown is currently visible */
  isOpen: boolean;
  /** Filtered list of completion items to display */
  items: CompletionItem[];
  /** Currently selected item index (for keyboard navigation) */
  selectedIndex: number;
  /** Cursor position where the trigger character was found */
  triggerPosition: number;
  /** Type of trigger that opened the dropdown */
  triggerType: "slash" | null;
}

/**
 * Options for the useCompletions hook
 */
export interface UseCompletionsOptions {
  /** Available slash commands to suggest */
  slashCommands: string[];
}

/**
 * Return type for the useCompletions hook
 */
export interface UseCompletionsReturn {
  /** Current state of the completions dropdown */
  completionState: CompletionState;
  /** Handle input changes to detect triggers and filter completions */
  handleInputChange: (value: string, cursorPosition: number) => void;
  /** Handle keyboard events for navigation. Returns true if event was handled. */
  handleKeyDown: (e: React.KeyboardEvent) => boolean;
  /** Select a completion at the given index. Returns the new input value. */
  selectCompletion: (index: number, currentInput: string) => string;
  /** Close the completions dropdown */
  closeCompletions: () => void;
  /** Update selected index (for mouse hover) */
  setSelectedIndex: (index: number) => void;
}

/**
 * Result of detecting a completion trigger in the input
 */
export interface TriggerDetectionResult {
  /** Type of trigger found */
  type: "slash";
  /** The partial text after the trigger (e.g., "he" for "/he") */
  partial: string;
  /** Position where the trigger character was found */
  startPosition: number;
}
