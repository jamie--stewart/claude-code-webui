import type { ChatMessage } from "../../types";
import { TimestampComponent } from "../TimestampComponent";
import { MessageContainer } from "./MessageContainer";
import { CodeBlock } from "./CodeBlock";
import { CopyButton } from "./CopyButton";
import {
  parseContentWithCodeBlocks,
  hasCodeBlocks,
} from "../../utils/codeHighlighting";

interface ChatMessageComponentProps {
  message: ChatMessage;
}

export function ChatMessageComponent({ message }: ChatMessageComponentProps) {
  const isUser = message.role === "user";
  const colorScheme = isUser
    ? "bg-blue-600 text-white"
    : "bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100";

  // Check if assistant message contains code blocks
  const shouldParseCodeBlocks = !isUser && hasCodeBlocks(message.content);
  const segments = shouldParseCodeBlocks
    ? parseContentWithCodeBlocks(message.content)
    : null;

  return (
    <MessageContainer
      alignment={isUser ? "right" : "left"}
      colorScheme={colorScheme}
    >
      <div className="group/message">
        <div className="mb-2 flex items-center justify-between gap-4">
          <div
            className={`text-xs font-semibold opacity-90 ${
              isUser ? "text-blue-100" : "text-slate-600 dark:text-slate-400"
            }`}
          >
            {isUser ? "User" : "Claude"}
          </div>
          <div className="flex items-center gap-2">
            <CopyButton
              content={message.content}
              className={`opacity-0 group-hover/message:opacity-100 transition-opacity ${
                isUser
                  ? "text-blue-200 hover:text-white hover:bg-blue-500/50"
                  : ""
              }`}
            />
            <TimestampComponent
              timestamp={message.timestamp}
              className={`text-xs opacity-70 ${
                isUser ? "text-blue-200" : "text-slate-500 dark:text-slate-500"
              }`}
            />
          </div>
        </div>
        {segments ? (
          <div className="text-sm leading-relaxed">
            {segments.map((segment, index) =>
              segment.type === "code" ? (
                <CodeBlock
                  key={index}
                  code={segment.code}
                  language={segment.language}
                />
              ) : (
                <pre
                  key={index}
                  className="whitespace-pre-wrap font-mono my-2 first:mt-0 last:mb-0"
                >
                  {segment.content}
                </pre>
              ),
            )}
          </div>
        ) : (
          <pre className="whitespace-pre-wrap text-sm font-mono leading-relaxed">
            {message.content}
          </pre>
        )}
      </div>
    </MessageContainer>
  );
}
