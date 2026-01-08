import { MessageContainer } from "./MessageContainer";

export function LoadingComponent() {
  return (
    <MessageContainer
      alignment="left"
      colorScheme="bg-slate-200 dark:bg-slate-700 text-slate-800 dark:text-slate-100"
    >
      <div className="text-xs font-semibold mb-2 opacity-90 text-slate-600 dark:text-slate-400">
        Claude
      </div>
      <div className="flex items-center gap-2 text-sm">
        <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
        <span className="animate-pulse">Thinking...</span>
      </div>
    </MessageContainer>
  );
}
