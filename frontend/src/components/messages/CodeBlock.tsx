import { useEffect, useRef } from "react";
import hljs from "highlight.js/lib/core";
// Import highlight.js styles for both light and dark themes
import "highlight.js/styles/github.css";
// Import commonly used languages
import typescript from "highlight.js/lib/languages/typescript";
import javascript from "highlight.js/lib/languages/javascript";
import python from "highlight.js/lib/languages/python";
import bash from "highlight.js/lib/languages/bash";
import json from "highlight.js/lib/languages/json";
import xml from "highlight.js/lib/languages/xml"; // Also covers HTML
import css from "highlight.js/lib/languages/css";
import sql from "highlight.js/lib/languages/sql";
import yaml from "highlight.js/lib/languages/yaml";
import markdown from "highlight.js/lib/languages/markdown";
import diff from "highlight.js/lib/languages/diff";
import go from "highlight.js/lib/languages/go";
import rust from "highlight.js/lib/languages/rust";

// Register languages
hljs.registerLanguage("typescript", typescript);
hljs.registerLanguage("ts", typescript);
hljs.registerLanguage("tsx", typescript);
hljs.registerLanguage("javascript", javascript);
hljs.registerLanguage("js", javascript);
hljs.registerLanguage("jsx", javascript);
hljs.registerLanguage("python", python);
hljs.registerLanguage("py", python);
hljs.registerLanguage("bash", bash);
hljs.registerLanguage("sh", bash);
hljs.registerLanguage("shell", bash);
hljs.registerLanguage("zsh", bash);
hljs.registerLanguage("json", json);
hljs.registerLanguage("jsonc", json);
hljs.registerLanguage("xml", xml);
hljs.registerLanguage("html", xml);
hljs.registerLanguage("css", css);
hljs.registerLanguage("sql", sql);
hljs.registerLanguage("yaml", yaml);
hljs.registerLanguage("yml", yaml);
hljs.registerLanguage("markdown", markdown);
hljs.registerLanguage("md", markdown);
hljs.registerLanguage("diff", diff);
hljs.registerLanguage("go", go);
hljs.registerLanguage("golang", go);
hljs.registerLanguage("rust", rust);
hljs.registerLanguage("rs", rust);

interface CodeBlockProps {
  code: string;
  language?: string;
}

export function CodeBlock({ code, language }: CodeBlockProps) {
  const codeRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (codeRef.current) {
      // Reset any previous highlighting
      codeRef.current.removeAttribute("data-highlighted");

      try {
        if (language && hljs.getLanguage(language)) {
          // Use specified language
          const result = hljs.highlight(code, { language });
          codeRef.current.innerHTML = result.value;
        } else if (language) {
          // Language specified but not supported, try auto-detection
          const result = hljs.highlightAuto(code);
          codeRef.current.innerHTML = result.value;
        } else {
          // No language specified, auto-detect
          const result = hljs.highlightAuto(code);
          codeRef.current.innerHTML = result.value;
        }
      } catch {
        // If highlighting fails, just show plain text
        codeRef.current.textContent = code;
      }
    }
  }, [code, language]);

  return (
    <div className="relative group my-2">
      {language && (
        <div className="absolute top-0 right-0 px-2 py-1 text-xs text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 rounded-bl font-mono">
          {language}
        </div>
      )}
      <pre className="overflow-x-auto rounded-lg bg-slate-100 dark:bg-slate-800 p-4 text-sm">
        <code
          ref={codeRef}
          className={`hljs ${language ? `language-${language}` : ""}`}
        >
          {code}
        </code>
      </pre>
    </div>
  );
}
