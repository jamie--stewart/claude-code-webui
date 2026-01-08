import type { PlanMessage } from "../../types";
import { TimestampComponent } from "../TimestampComponent";
import { MessageContainer } from "./MessageContainer";

interface PlanMessageComponentProps {
  message: PlanMessage;
}

export function PlanMessageComponent({ message }: PlanMessageComponentProps) {
  return (
    <MessageContainer
      alignment="left"
      colorScheme="bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="text-xs font-semibold opacity-90 text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">
            📋
          </div>
          Ready to code?
        </div>
        <TimestampComponent
          timestamp={message.timestamp}
          className="text-xs opacity-70 text-blue-600 dark:text-blue-400"
        />
      </div>

      <div className="mb-3">
        <p className="text-sm font-medium text-blue-800 dark:text-blue-200 mb-2">
          Here is Claude's plan:
        </p>
        <div className="bg-blue-100/50 dark:bg-blue-800/30 border border-blue-200 dark:border-blue-700 rounded-lg p-3">
          <pre className="text-sm text-blue-900 dark:text-blue-100 whitespace-pre-wrap font-mono leading-relaxed">
            {message.plan}
          </pre>
        </div>
      </div>
    </MessageContainer>
  );
}
