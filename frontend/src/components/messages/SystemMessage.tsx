import type { SystemMessage, HooksMessage } from "../../types";
import { CollapsibleDetails } from "./CollapsibleDetails";
import { MESSAGE_CONSTANTS } from "../../utils/constants";

// ANSI escape sequence regex for cleaning hooks messages
const ANSI_REGEX = new RegExp(`${String.fromCharCode(27)}\\[[0-9;]*m`, "g");

// Type guard to check if the message is a hooks message
function isHooksMessage(
  msg: SystemMessage,
): msg is HooksMessage & { timestamp: number } {
  return (
    msg.type === "system" &&
    "content" in msg &&
    typeof msg.content === "string" &&
    !("subtype" in msg)
  );
}

interface SystemMessageComponentProps {
  message: SystemMessage;
  onStartNewConversation?: () => void;
}

export function SystemMessageComponent({
  message,
  onStartNewConversation,
}: SystemMessageComponentProps) {
  // Check if this is a context overflow message
  const isContextOverflow =
    message.type === "system" &&
    "subtype" in message &&
    message.subtype === "context_overflow";

  // Generate details based on message type and subtype
  const getDetails = () => {
    if (
      message.type === "system" &&
      "subtype" in message &&
      message.subtype === "init"
    ) {
      return [
        `Model: ${message.model}`,
        `Session: ${message.session_id.substring(0, MESSAGE_CONSTANTS.SESSION_ID_DISPLAY_LENGTH)}`,
        `Tools: ${message.tools.length} available`,
        `CWD: ${message.cwd}`,
        `Permission Mode: ${message.permissionMode}`,
        `API Key Source: ${message.apiKeySource}`,
      ].join("\n");
    } else if (isContextOverflow && "message" in message) {
      return message.message;
    } else if (message.type === "result") {
      const details = [
        `Duration: ${message.duration_ms}ms`,
        `Cost: $${message.total_cost_usd.toFixed(4)}`,
        `Tokens: ${message.usage.input_tokens} in, ${message.usage.output_tokens} out`,
      ];
      return details.join("\n");
    } else if (message.type === "error") {
      return message.message;
    } else if (isHooksMessage(message)) {
      // This is a hooks message - show only the content
      // Remove ANSI escape sequences for cleaner display
      return message.content.replace(ANSI_REGEX, "");
    }
    return JSON.stringify(message, null, 2);
  };

  // Get label based on message type
  const getLabel = () => {
    if (isContextOverflow) return "Context Limit Reached";
    if (message.type === "system") return "System";
    if (message.type === "result") return "Result";
    if (message.type === "error") return "Error";
    return "Message";
  };

  const details = getDetails();

  // Use warning colors for context overflow
  if (isContextOverflow) {
    return (
      <div className="space-y-3">
        <CollapsibleDetails
          label={getLabel()}
          details={details}
          badge="overflow"
          icon={<span className="bg-amber-400 dark:bg-amber-500">⚠</span>}
          colorScheme={{
            header: "text-amber-800 dark:text-amber-300",
            content: "text-amber-700 dark:text-amber-300",
            border: "border-amber-200 dark:border-amber-700",
            bg: "bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800",
          }}
          defaultExpanded={true}
        />
        {onStartNewConversation && (
          <button
            onClick={onStartNewConversation}
            className="px-4 py-2 bg-amber-500 hover:bg-amber-600 text-white text-sm font-medium rounded-lg transition-colors duration-200 shadow-sm hover:shadow-md"
          >
            Start New Conversation
          </button>
        )}
      </div>
    );
  }

  return (
    <CollapsibleDetails
      label={getLabel()}
      details={details}
      badge={"subtype" in message ? message.subtype : undefined}
      icon={<span className="bg-blue-400 dark:bg-blue-500">⚙</span>}
      colorScheme={{
        header: "text-blue-800 dark:text-blue-300",
        content: "text-blue-700 dark:text-blue-300",
        border: "border-blue-200 dark:border-blue-700",
        bg: "bg-blue-50/80 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800",
      }}
    />
  );
}
