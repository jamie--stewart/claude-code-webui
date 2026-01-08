import type {
  AskUserQuestionMessage,
  AskUserQuestionOption,
} from "../../types";
import { TimestampComponent } from "../TimestampComponent";
import { MessageContainer } from "./MessageContainer";

interface AskUserQuestionMessageComponentProps {
  message: AskUserQuestionMessage;
}

export function AskUserQuestionMessageComponent({
  message,
}: AskUserQuestionMessageComponentProps) {
  return (
    <MessageContainer
      alignment="left"
      colorScheme="bg-blue-50 dark:bg-blue-900/20 text-blue-900 dark:text-blue-100"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="text-xs font-semibold opacity-90 text-blue-700 dark:text-blue-300 flex items-center gap-2">
          <div className="w-4 h-4 bg-blue-500 dark:bg-blue-600 rounded-full flex items-center justify-center text-white text-xs">
            ?
          </div>
          Claude is asking a question
        </div>
        <TimestampComponent
          timestamp={message.timestamp}
          className="text-xs opacity-70 text-blue-600 dark:text-blue-400"
        />
      </div>

      <div className="space-y-4">
        {message.questions.map((question, idx) => (
          <div key={idx} className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 text-xs font-medium bg-blue-100 dark:bg-blue-800/30 text-blue-600 dark:text-blue-300 rounded">
                {question.header}
              </span>
              {question.multiSelect && (
                <span className="text-xs text-blue-500 dark:text-blue-400">
                  (multiple choice)
                </span>
              )}
            </div>
            <p className="text-sm font-medium text-blue-800 dark:text-blue-200">
              {question.question}
            </p>
            <div className="flex flex-wrap gap-2">
              {question.options.map(
                (option: AskUserQuestionOption, optIdx: number) => (
                  <div
                    key={optIdx}
                    className="px-3 py-1 text-xs bg-blue-100/50 dark:bg-blue-800/20 text-blue-700 dark:text-blue-300 rounded-full"
                  >
                    {option.label}
                  </div>
                ),
              )}
            </div>
          </div>
        ))}
      </div>
    </MessageContainer>
  );
}
