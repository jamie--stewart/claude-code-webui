import type { ToolResultMessage } from "../../types";
import { ToolResultDisplay } from "./ToolResultDisplay";

interface ToolResultMessageComponentProps {
  message: ToolResultMessage;
}

export function ToolResultMessageComponent({
  message,
}: ToolResultMessageComponentProps) {
  return (
    <ToolResultDisplay
      toolName={message.toolName}
      content={message.content}
      summary={message.summary}
      toolUseResult={message.toolUseResult}
    />
  );
}
