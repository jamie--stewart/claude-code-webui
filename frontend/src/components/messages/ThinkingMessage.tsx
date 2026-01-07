import type { ThinkingMessage } from "../../types";
import { CollapsibleDetails } from "./CollapsibleDetails";

interface ThinkingMessageComponentProps {
  message: ThinkingMessage;
}

export function ThinkingMessageComponent({
  message,
}: ThinkingMessageComponentProps) {
  return (
    <CollapsibleDetails
      label="Claude's Reasoning"
      details={message.content}
      badge="thinking"
      icon={<span className="bg-purple-400 dark:bg-purple-500">💭</span>}
      colorScheme={{
        header: "text-purple-700 dark:text-purple-300",
        content: "text-purple-600 dark:text-purple-400 italic",
        border: "border-purple-200 dark:border-purple-700",
        bg: "bg-purple-50/60 dark:bg-purple-900/15 border border-purple-200 dark:border-purple-800",
      }}
      defaultExpanded={true}
    />
  );
}
