import type { ToolMessage } from "../../types";
import { MessageContainer } from "./MessageContainer";

interface ToolMessageComponentProps {
  message: ToolMessage;
}

export function ToolMessageComponent({ message }: ToolMessageComponentProps) {
  return (
    <MessageContainer
      alignment="left"
      colorScheme="bg-emerald-100 dark:bg-emerald-900 text-emerald-800 dark:text-emerald-100"
    >
      <div className="text-xs font-semibold mb-2 opacity-90 text-emerald-700 dark:text-emerald-300 flex items-center gap-2">
        <div className="w-4 h-4 bg-emerald-500 dark:bg-emerald-600 rounded-full flex items-center justify-center text-white text-xs">
          🔧
        </div>
        {message.content}
      </div>
    </MessageContainer>
  );
}
