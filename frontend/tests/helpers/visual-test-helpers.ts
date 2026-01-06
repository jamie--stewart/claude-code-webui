import { Page, Route } from "@playwright/test";

/**
 * Visual snapshot test helpers
 * Provides mock API responses and utilities for consistent screenshot generation
 */

// Fixed data for deterministic snapshots
export const MOCK_PROJECTS = [
  { path: "/workspace/project-alpha" },
  { path: "/workspace/project-beta" },
  { path: "/workspace/project-gamma" },
];

export const MOCK_SESSION_ID = "test-session-visual-001";

/**
 * Create a streaming response body in the format the frontend expects
 */
export function createStreamingResponse(options: {
  sessionId?: string;
  assistantText: string;
  cwd?: string;
  includeCodeBlock?: boolean;
  includeToolUse?: boolean;
}): string {
  const {
    sessionId = MOCK_SESSION_ID,
    assistantText,
    cwd = "/workspace/project-alpha",
    includeCodeBlock = false,
    includeToolUse = false,
  } = options;

  const messages: string[] = [];

  // System message
  messages.push(
    JSON.stringify({
      type: "claude_json",
      data: {
        type: "system",
        cwd,
        session_id: sessionId,
        tools: ["Read", "Write", "Edit", "Bash", "Glob", "Grep"],
        model: "claude-sonnet-4-20250514",
      },
    }),
  );

  // Tool use message (optional)
  if (includeToolUse) {
    messages.push(
      JSON.stringify({
        type: "claude_json",
        data: {
          type: "assistant",
          message: {
            id: "msg_tool",
            type: "message",
            role: "assistant",
            content: [
              {
                type: "tool_use",
                id: "tool_001",
                name: "Read",
                input: { file_path: "/workspace/src/index.ts" },
              },
            ],
            model: "claude-sonnet-4-20250514",
          },
          session_id: sessionId,
        },
      }),
    );

    // Tool result
    messages.push(
      JSON.stringify({
        type: "claude_json",
        data: {
          type: "user",
          message: {
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: "tool_001",
                content: 'export function main() {\n  console.log("Hello");\n}',
              },
            ],
          },
          session_id: sessionId,
        },
      }),
    );
  }

  // Assistant message with optional code block
  let content = assistantText;
  if (includeCodeBlock) {
    content +=
      '\n\n```typescript\nfunction example() {\n  return "Hello, World!";\n}\n```';
  }

  messages.push(
    JSON.stringify({
      type: "claude_json",
      data: {
        type: "assistant",
        message: {
          id: "msg_response",
          type: "message",
          role: "assistant",
          content: [{ type: "text", text: content }],
          model: "claude-sonnet-4-20250514",
          stop_reason: "end_turn",
          usage: { input_tokens: 100, output_tokens: 50 },
        },
        session_id: sessionId,
      },
    }),
  );

  // Result message
  messages.push(
    JSON.stringify({
      type: "claude_json",
      data: {
        type: "result",
        subtype: "success",
        session_id: sessionId,
        result: "",
        num_turns: 1,
        total_cost_usd: 0.002,
        duration_ms: 1500,
        duration_api_ms: 1200,
        usage: {
          input_tokens: 100,
          output_tokens: 50,
        },
      },
    }),
  );

  return messages.join("\n") + "\n";
}

/**
 * Create a permission request response
 */
export function createPermissionResponse(options: {
  sessionId?: string;
  toolName: string;
  command?: string;
}): string {
  const { sessionId = MOCK_SESSION_ID, toolName, command } = options;

  const messages: string[] = [];

  // System message
  messages.push(
    JSON.stringify({
      type: "claude_json",
      data: {
        type: "system",
        cwd: "/workspace/project-alpha",
        session_id: sessionId,
        tools: ["Read", "Write", "Edit", "Bash"],
        model: "claude-sonnet-4-20250514",
      },
    }),
  );

  // Assistant message with tool use requiring permission
  messages.push(
    JSON.stringify({
      type: "claude_json",
      data: {
        type: "assistant",
        message: {
          id: "msg_permission",
          type: "message",
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "tool_perm_001",
              name: toolName,
              input: command
                ? { command }
                : { file_path: "/workspace/src/test.ts" },
            },
          ],
          model: "claude-sonnet-4-20250514",
        },
        session_id: sessionId,
      },
    }),
  );

  return messages.join("\n") + "\n";
}

/**
 * Create an AskUserQuestion response
 */
export function createAskUserQuestionResponse(options: {
  sessionId?: string;
  questions: Array<{
    question: string;
    options: Array<{ label: string; description: string }>;
    multiSelect?: boolean;
  }>;
}): string {
  const { sessionId = MOCK_SESSION_ID, questions } = options;

  const messages: string[] = [];

  // System message
  messages.push(
    JSON.stringify({
      type: "claude_json",
      data: {
        type: "system",
        cwd: "/workspace/project-alpha",
        session_id: sessionId,
        tools: ["AskUserQuestion"],
        model: "claude-sonnet-4-20250514",
      },
    }),
  );

  // Assistant message with AskUserQuestion tool use
  messages.push(
    JSON.stringify({
      type: "claude_json",
      data: {
        type: "assistant",
        message: {
          id: "msg_ask",
          type: "message",
          role: "assistant",
          content: [
            {
              type: "tool_use",
              id: "tool_ask_001",
              name: "AskUserQuestion",
              input: {
                questions: questions.map((q) => ({
                  question: q.question,
                  header: "Choice",
                  options: q.options,
                  multiSelect: q.multiSelect ?? false,
                })),
              },
            },
          ],
          model: "claude-sonnet-4-20250514",
        },
        session_id: sessionId,
      },
    }),
  );

  return messages.join("\n") + "\n";
}

/**
 * Create a plan mode response
 * Simulates the ExitPlanMode flow that triggers the plan permission panel
 */
export function createPlanModeResponse(options: {
  sessionId?: string;
}): string {
  const { sessionId = MOCK_SESSION_ID } = options;
  const toolUseId = "plan_tool_001";

  const messages: string[] = [];

  // System message
  messages.push(
    JSON.stringify({
      type: "claude_json",
      data: {
        type: "system",
        cwd: "/workspace/project-alpha",
        session_id: sessionId,
        tools: ["Read", "Write", "Edit", "ExitPlanMode"],
        model: "claude-sonnet-4-20250514",
      },
    }),
  );

  // Assistant message with ExitPlanMode tool use
  messages.push(
    JSON.stringify({
      type: "claude_json",
      data: {
        type: "assistant",
        message: {
          id: "msg_plan",
          type: "message",
          role: "assistant",
          content: [
            {
              type: "text",
              text: "I'll create a plan for implementing this feature.\n\n## Implementation Plan\n\n1. Create the new component\n2. Add unit tests\n3. Update documentation",
            },
            {
              type: "tool_use",
              id: toolUseId,
              name: "ExitPlanMode",
              input: {},
            },
          ],
          model: "claude-sonnet-4-20250514",
          stop_reason: "tool_use",
        },
        session_id: sessionId,
      },
    }),
  );

  // User message with tool_result that triggers permission error
  messages.push(
    JSON.stringify({
      type: "claude_json",
      data: {
        type: "user",
        message: {
          role: "user",
          content: [
            {
              type: "tool_result",
              tool_use_id: toolUseId,
              content: "Exit plan mode?",
              is_error: true,
            },
          ],
        },
        session_id: sessionId,
      },
    }),
  );

  return messages.join("\n") + "\n";
}

/**
 * Setup common API mocks for visual tests
 */
export async function setupProjectsMock(
  page: Page,
  projects: Array<{ path: string }> = MOCK_PROJECTS,
): Promise<void> {
  await page.route("**/api/projects", async (route: Route) => {
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ projects }),
    });
  });
}

/**
 * Setup a delayed projects response for loading state
 */
export async function setupProjectsLoadingMock(
  page: Page,
  delayMs: number = 5000,
): Promise<void> {
  await page.route("**/api/projects", async (route: Route) => {
    await new Promise((resolve) => setTimeout(resolve, delayMs));
    await route.fulfill({
      status: 200,
      contentType: "application/json",
      body: JSON.stringify({ projects: MOCK_PROJECTS }),
    });
  });
}

/**
 * Setup an error response for projects
 */
export async function setupProjectsErrorMock(page: Page): Promise<void> {
  await page.route("**/api/projects", async (route: Route) => {
    await route.fulfill({
      status: 500,
      contentType: "application/json",
      body: JSON.stringify({ error: "Internal server error" }),
    });
  });
}

/**
 * Setup chat API mock with custom response
 */
export async function setupChatMock(
  page: Page,
  responseBody: string,
  delayMs: number = 0,
): Promise<void> {
  await page.route("**/api/chat", async (route: Route) => {
    if (delayMs > 0) {
      await new Promise((resolve) => setTimeout(resolve, delayMs));
    }
    await route.fulfill({
      status: 200,
      contentType: "text/plain",
      body: responseBody,
    });
  });
}

/**
 * Navigate to chat page with project selected
 */
export async function navigateToChatPage(page: Page): Promise<void> {
  await page.goto("/", { waitUntil: "networkidle" });
  await page.waitForSelector('[data-testid="project-card"]', {
    timeout: 10000,
  });
  await page.click('[data-testid="project-card"]');
  await page.waitForSelector('[data-testid="chat-input"]', { timeout: 10000 });
}

/**
 * Send a message without waiting for response completion
 * Used when we want to capture specific UI states during/after response
 */
export async function sendMessageNoWait(
  page: Page,
  message: string,
): Promise<void> {
  const chatInput = page.locator('[data-testid="chat-input"]');
  await chatInput.fill(message);
  await page.locator('[data-testid="chat-submit"]').click();
}

/**
 * Send a message and wait for response to complete
 * Waits for either Claude response or submit button to be re-enabled
 */
export async function sendMessage(page: Page, message: string): Promise<void> {
  await sendMessageNoWait(page, message);

  // Wait for either:
  // 1. Claude's name label to appear (indicates assistant message rendered)
  // 2. Or submit button to be re-enabled (stream ended)
  // Use Promise.race to handle both cases
  await Promise.race([
    page
      .locator('[data-testid="chat-messages"]')
      .getByText("Claude", { exact: true })
      .first()
      .waitFor({ timeout: 15000 }),
    page.waitForSelector('[data-testid="chat-submit"]:not(:disabled)', {
      timeout: 15000,
    }),
  ]);

  // Give a moment for UI to stabilize
  await page.waitForTimeout(300);
}
