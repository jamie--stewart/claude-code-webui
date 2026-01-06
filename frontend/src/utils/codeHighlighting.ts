/**
 * Represents a segment of parsed content
 */
export type ContentSegment =
  | { type: "text"; content: string }
  | { type: "code"; code: string; language?: string };

/**
 * Regex to match fenced code blocks with optional language hint
 * Matches: ```language\ncode\n``` or ```\ncode\n```
 */
const CODE_BLOCK_REGEX = /```(\w+)?\n([\s\S]*?)```/g;

/**
 * Parses content and extracts code blocks from markdown-style fenced code blocks
 *
 * @param content - The raw content string to parse
 * @returns An array of content segments (text or code blocks)
 */
export function parseContentWithCodeBlocks(content: string): ContentSegment[] {
  const segments: ContentSegment[] = [];
  let lastIndex = 0;

  // Reset regex state
  CODE_BLOCK_REGEX.lastIndex = 0;

  let match;
  while ((match = CODE_BLOCK_REGEX.exec(content)) !== null) {
    // Add any text before this code block
    if (match.index > lastIndex) {
      const textContent = content.slice(lastIndex, match.index);
      if (textContent.trim()) {
        segments.push({ type: "text", content: textContent });
      }
    }

    // Add the code block
    const language = match[1] || undefined;
    const code = match[2];

    segments.push({
      type: "code",
      code: code.trim(),
      language,
    });

    lastIndex = match.index + match[0].length;
  }

  // Add any remaining text after the last code block
  if (lastIndex < content.length) {
    const textContent = content.slice(lastIndex);
    if (textContent.trim()) {
      segments.push({ type: "text", content: textContent });
    }
  }

  // If no code blocks found, return the original content as a single text segment
  if (segments.length === 0 && content.trim()) {
    segments.push({ type: "text", content });
  }

  return segments;
}

/**
 * Checks if content contains any fenced code blocks
 *
 * @param content - The content to check
 * @returns true if content contains at least one code block
 */
export function hasCodeBlocks(content: string): boolean {
  CODE_BLOCK_REGEX.lastIndex = 0;
  return CODE_BLOCK_REGEX.test(content);
}
