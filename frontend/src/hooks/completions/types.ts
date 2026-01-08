/**
 * Types for the completions system
 */

/**
 * A single completion item that can be displayed in the dropdown
 */
export interface CompletionItem {
  /** Type of completion */
  type: "slash_command" | "mention";
  /** The actual value to insert (e.g., "/help" or "@file.ts") */
  value: string;
  /** What to show in the dropdown */
  displayText: string;
  /** Optional description/tooltip */
  description?: string;
  /** For mentions: the file path (for icon display) */
  path?: string;
  /** For mentions: whether this is a directory */
  isDirectory?: boolean;
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
  triggerType: "slash" | "mention" | null;
}

/**
 * Mention item from the API or static list
 */
export interface MentionItem {
  type: "file" | "directory";
  value: string;
  displayText: string;
  path: string;
}

/**
 * Response from the mentions API
 */
export interface MentionsResponse {
  items: MentionItem[];
  truncated: boolean;
}

/**
 * Options for the useCompletions hook
 */
export interface UseCompletionsOptions {
  /** Available slash commands to suggest */
  slashCommands: string[];
  /** Working directory for mentions API */
  workingDirectory?: string;
  /** Optional callback to fetch mentions (for testing) */
  fetchMentions?: (
    cwd: string,
    query: string,
  ) => Promise<MentionsResponse | null>;
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
  type: "slash" | "mention";
  /** The partial text after the trigger (e.g., "he" for "/he" or "src" for "@src") */
  partial: string;
  /** Position where the trigger character was found */
  startPosition: number;
}
