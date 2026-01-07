import { useState, useCallback } from "react";
import {
  ClipboardDocumentIcon,
  ClipboardDocumentCheckIcon,
} from "@heroicons/react/24/outline";

interface CopyButtonProps {
  /** The text content to copy */
  content: string;
  /** Additional CSS classes */
  className?: string;
  /** Size variant */
  size?: "sm" | "md";
}

export function CopyButton({
  content,
  className = "",
  size = "sm",
}: CopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(content);
      setCopied(true);
      // Reset after 2 seconds
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement("textarea");
      textArea.value = content;
      textArea.style.position = "fixed";
      textArea.style.left = "-999999px";
      document.body.appendChild(textArea);
      textArea.select();
      try {
        document.execCommand("copy");
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch {
        console.error("Failed to copy text");
      }
      document.body.removeChild(textArea);
    }
  }, [content]);

  const iconSize = size === "sm" ? "w-3.5 h-3.5" : "w-4 h-4";
  const buttonSize = size === "sm" ? "p-1" : "p-1.5";

  return (
    <button
      type="button"
      onClick={handleCopy}
      className={`${buttonSize} rounded transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
        copied
          ? "text-green-600 dark:text-green-400 bg-green-100 dark:bg-green-900/30"
          : "text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700/50"
      } ${className}`}
      title={copied ? "Copied!" : "Copy to clipboard"}
      aria-label={copied ? "Copied to clipboard" : "Copy to clipboard"}
    >
      {copied ? (
        <ClipboardDocumentCheckIcon className={iconSize} />
      ) : (
        <ClipboardDocumentIcon className={iconSize} />
      )}
    </button>
  );
}
