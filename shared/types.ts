export interface StreamResponse {
  type: "claude_json" | "error" | "done" | "aborted" | "context_overflow";
  data?: unknown; // SDKMessage object for claude_json type
  error?: string;
}

/**
 * Tool result structure for responding to tool_use requests
 * (e.g., AskUserQuestion responses)
 */
export interface ToolResultContent {
  tool_use_id: string;
  content: string;
  is_error?: boolean;
}

export interface ChatRequest {
  message: string;
  sessionId?: string;
  requestId: string;
  allowedTools?: string[];
  workingDirectory?: string;
  permissionMode?: "default" | "plan" | "acceptEdits" | "bypassPermissions";
  /**
   * Optional tool result for responding to tool_use requests.
   * When provided, the backend will construct a proper SDKUserMessage
   * with tool_result content instead of sending a plain text prompt.
   */
  toolResult?: ToolResultContent;
}

export interface AbortRequest {
  requestId: string;
}

export interface ProjectInfo {
  path: string;
  encodedName: string;
}

export interface ProjectsResponse {
  projects: ProjectInfo[];
}

// Conversation history types
export interface ConversationSummary {
  sessionId: string;
  startTime: string;
  lastTime: string;
  messageCount: number;
  lastMessagePreview: string;
}

export interface HistoryListResponse {
  conversations: ConversationSummary[];
}

// Conversation history types
// Note: messages are typed as unknown[] to avoid frontend/backend dependency issues
// Frontend should cast to TimestampedSDKMessage[] (defined in frontend/src/types.ts)
export interface ConversationHistory {
  sessionId: string;
  messages: unknown[]; // TimestampedSDKMessage[] in practice, but avoiding frontend type dependency
  metadata: {
    startTime: string;
    endTime: string;
    messageCount: number;
  };
}
