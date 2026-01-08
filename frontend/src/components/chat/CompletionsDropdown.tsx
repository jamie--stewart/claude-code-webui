import React, { useRef, useEffect } from "react";
import type { CompletionItem } from "../../hooks/completions/types";

interface CompletionsDropdownProps {
  /** List of completion items to display */
  items: CompletionItem[];
  /** Currently selected item index */
  selectedIndex: number;
  /** Callback when an item is selected (clicked) */
  onSelect: (index: number) => void;
  /** Callback when mouse hovers over an item */
  onHover: (index: number) => void;
}

/**
 * Dropdown component for displaying completion suggestions.
 * Supports keyboard navigation highlighting and click selection.
 * Positioned above the input by the parent component.
 */
export function CompletionsDropdown({
  items,
  selectedIndex,
  onSelect,
  onHover,
}: CompletionsDropdownProps) {
  const listRef = useRef<HTMLUListElement>(null);
  const selectedRef = useRef<HTMLLIElement>(null);

  // Auto-scroll selected item into view
  useEffect(() => {
    if (selectedRef.current && listRef.current) {
      const list = listRef.current;
      const selected = selectedRef.current;

      const listRect = list.getBoundingClientRect();
      const selectedRect = selected.getBoundingClientRect();

      // Check if selected item is above visible area
      if (selectedRect.top < listRect.top) {
        selected.scrollIntoView({ block: "nearest" });
      }
      // Check if selected item is below visible area
      else if (selectedRect.bottom > listRect.bottom) {
        selected.scrollIntoView({ block: "nearest" });
      }
    }
  }, [selectedIndex]);

  if (items.length === 0) {
    return null;
  }

  return (
    <div
      className="absolute bottom-full left-0 right-0 mb-1 z-50 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg shadow-lg max-h-48 overflow-hidden"
      role="listbox"
      aria-label="Completions"
    >
      <ul ref={listRef} className="overflow-y-auto max-h-48">
        {items.map((item, index) => (
          <li
            key={item.value}
            ref={index === selectedIndex ? selectedRef : null}
            role="option"
            aria-selected={index === selectedIndex}
            className={`px-3 py-2.5 cursor-pointer transition-colors ${
              index === selectedIndex
                ? "bg-blue-100 dark:bg-blue-900/40 text-blue-900 dark:text-blue-100"
                : "hover:bg-slate-100 dark:hover:bg-slate-700/50 text-slate-800 dark:text-slate-200"
            }`}
            onClick={() => onSelect(index)}
            onMouseEnter={() => onHover(index)}
          >
            <span className="font-mono text-sm">{item.displayText}</span>
            {item.description && (
              <span className="ml-2 text-xs text-slate-500 dark:text-slate-400">
                {item.description}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
