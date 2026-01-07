import type { TodoMessage, TodoItem } from "../../types";
import { TimestampComponent } from "../TimestampComponent";
import { MessageContainer } from "./MessageContainer";

interface TodoMessageComponentProps {
  message: TodoMessage;
}

export function TodoMessageComponent({ message }: TodoMessageComponentProps) {
  const getStatusIcon = (status: TodoItem["status"]) => {
    switch (status) {
      case "completed":
        return { icon: "✅", label: "Completed" };
      case "in_progress":
        return { icon: "🔄", label: "In progress" };
      case "pending":
      default:
        return { icon: "⏳", label: "Pending" };
    }
  };

  const getStatusColor = (status: TodoItem["status"]) => {
    switch (status) {
      case "completed":
        return "text-green-700 dark:text-green-400";
      case "in_progress":
        return "text-blue-700 dark:text-blue-400";
      case "pending":
      default:
        return "text-gray-600 dark:text-gray-400";
    }
  };

  return (
    <MessageContainer
      alignment="left"
      colorScheme="bg-amber-50 dark:bg-amber-900/20 text-amber-900 dark:text-amber-100"
    >
      <div className="mb-3 flex items-center justify-between gap-4">
        <div className="text-xs font-semibold opacity-90 text-amber-700 dark:text-amber-300 flex items-center gap-2">
          <div
            className="w-4 h-4 bg-amber-500 dark:bg-amber-600 rounded-full flex items-center justify-center text-white text-xs"
            aria-hidden="true"
          >
            📋
          </div>
          Todo List Updated
        </div>
        <TimestampComponent
          timestamp={message.timestamp}
          className="text-xs opacity-70 text-amber-600 dark:text-amber-400"
        />
      </div>

      <div className="space-y-1">
        {message.todos.map((todo, index) => {
          const statusIcon = getStatusIcon(todo.status);
          return (
            <div key={index} className="flex items-start gap-2">
              <span
                className="text-sm flex-shrink-0 mt-0.5"
                aria-label={statusIcon.label}
              >
                {statusIcon.icon}
              </span>
              <div className="flex-1 min-w-0">
                <div className={`text-sm ${getStatusColor(todo.status)}`}>
                  {todo.content}
                </div>
                {todo.status === "in_progress" && (
                  <div className="text-xs text-amber-600 dark:text-amber-500 italic">
                    {todo.activeForm}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-3 text-xs text-amber-700 dark:text-amber-400">
        {message.todos.filter((t) => t.status === "completed").length} of{" "}
        {message.todos.length} completed
      </div>
    </MessageContainer>
  );
}
