import { test, expect } from "@playwright/test";

/**
 * AskUserQuestion E2E Tests
 * Tests for the AskUserQuestion interaction flow including:
 * - Panel rendering and display
 * - Single-select and multi-select functionality
 * - "Other" option with custom input
 * - Submit and cancel functionality
 * - Keyboard navigation
 * - Proper toolResult format being sent to backend
 */

// Mock projects response
const mockProjects = {
  projects: [{ path: "/test/project", encodedName: "test-project" }],
};

// Create a mock AskUserQuestion SDK message
function createAskUserQuestionMessage(
  sessionId: string,
  toolUseId: string,
  questions: Array<{
    question: string;
    header: string;
    multiSelect: boolean;
    options: Array<{ label: string; description: string }>;
  }>,
) {
  return {
    type: "assistant",
    message: {
      id: "msg_test",
      type: "message",
      role: "assistant",
      content: [
        {
          type: "tool_use",
          id: toolUseId,
          name: "AskUserQuestion",
          input: { questions },
        },
      ],
      model: "claude-3-5-sonnet-20241022",
      stop_reason: "tool_use",
      stop_sequence: null,
      usage: { input_tokens: 100, output_tokens: 50 },
    },
    parent_tool_use_id: null,
    session_id: sessionId,
    uuid: "test-uuid",
  };
}

// Create mock system init message
function createSystemMessage(sessionId: string) {
  return {
    type: "system",
    subtype: "init",
    apiKeySource: "user",
    cwd: "/test/project",
    session_id: sessionId,
    uuid: "system-uuid",
    tools: ["AskUserQuestion"],
    mcp_servers: [],
    model: "claude-3-5-sonnet-20241022",
    permissionMode: "default",
    slash_commands: [],
    output_style: "default",
  };
}

test.describe("AskUserQuestion Display", () => {
  test("should display AskUserQuestion panel when Claude asks a question", async ({
    page,
  }) => {
    const sessionId = "test-session-auq";
    const toolUseId = "toolu_test123";

    // Mock the projects API
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    // Navigate to the chat page
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="project-card"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="chat-input"]', {
      timeout: 10000,
    });

    // Mock the chat API to return an AskUserQuestion message
    await page.route("**/api/chat", async (route) => {
      const systemMsg = createSystemMessage(sessionId);
      const askMsg = createAskUserQuestionMessage(sessionId, toolUseId, [
        {
          question: "Which authentication method should we use?",
          header: "Auth method",
          multiSelect: false,
          options: [
            { label: "JWT", description: "JSON Web Token authentication" },
            { label: "OAuth", description: "OAuth 2.0 authentication" },
            { label: "Session", description: "Session-based authentication" },
          ],
        },
      ]);

      const body = [
        JSON.stringify({ type: "claude_json", data: systemMsg }),
        JSON.stringify({ type: "claude_json", data: askMsg }),
        JSON.stringify({ type: "done" }),
      ].join("\n");

      await route.fulfill({
        status: 200,
        contentType: "application/x-ndjson",
        body,
      });
    });

    // Send a message to trigger the AskUserQuestion
    const messageInput = page.locator('[data-testid="chat-input"]');
    await messageInput.fill("Help me add authentication");
    await page.locator('[data-testid="chat-submit"]').click();

    // Wait for the AskUserQuestion panel to appear
    const panel = page.getByTestId("ask-user-question-panel");
    await expect(panel).toBeVisible({ timeout: 10000 });
    await expect(panel.getByText("Claude has a question")).toBeVisible();
    await expect(
      panel.getByText("Which authentication method should we use?"),
    ).toBeVisible();

    // Verify options are displayed
    await expect(panel.getByText("JWT", { exact: true })).toBeVisible();
    await expect(panel.getByText("OAuth", { exact: true })).toBeVisible();
    await expect(panel.getByText("Session", { exact: true })).toBeVisible();
    await expect(panel.getByText("Other", { exact: true })).toBeVisible();
  });
});

test.describe("AskUserQuestion Single-Select", () => {
  test.beforeEach(async ({ page }) => {
    const sessionId = "test-session-single";
    const toolUseId = "toolu_single";

    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="project-card"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="chat-input"]', {
      timeout: 10000,
    });

    // Mock chat API for single-select question
    await page.route("**/api/chat", async (route) => {
      const method = route.request().method();
      if (method === "POST") {
        const systemMsg = createSystemMessage(sessionId);
        const askMsg = createAskUserQuestionMessage(sessionId, toolUseId, [
          {
            question: "Which framework?",
            header: "Framework",
            multiSelect: false,
            options: [
              { label: "React", description: "React 18" },
              { label: "Vue", description: "Vue 3" },
              { label: "Angular", description: "Angular 17" },
            ],
          },
        ]);

        const body = [
          JSON.stringify({ type: "claude_json", data: systemMsg }),
          JSON.stringify({ type: "claude_json", data: askMsg }),
          JSON.stringify({ type: "done" }),
        ].join("\n");

        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body,
        });
      }
    });

    // Trigger question
    const messageInput = page.locator('[data-testid="chat-input"]');
    await messageInput.fill("Start project");
    await page.locator('[data-testid="chat-submit"]').click();
    await expect(page.getByText("Claude has a question")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should auto-select first option for single-select questions", async ({
    page,
  }) => {
    // First option (React) should be auto-selected
    const reactOption = page.getByRole("button", { name: /React/i });
    await expect(reactOption).toHaveClass(/bg-blue-50/);
  });

  test("should allow selecting different option", async ({ page }) => {
    // Click on Vue option
    const vueOption = page.getByRole("button", { name: /Vue/i });
    await vueOption.click();

    // Vue should now be selected
    await expect(vueOption).toHaveClass(/bg-blue-50/);

    // React should no longer be selected
    const reactOption = page.getByRole("button", { name: /React/i });
    await expect(reactOption).not.toHaveClass(/bg-blue-50/);
  });

  test("should submit selected option", async ({ page }) => {
    let capturedRequest: {
      toolResult: { tool_use_id: string; is_error: boolean; content: string };
    } | null = null;

    // Re-route to capture the answer
    await page.route("**/api/chat", async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      if (postData?.toolResult) {
        capturedRequest = postData;
        // Return a simple acknowledgment
        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body: JSON.stringify({ type: "done" }) + "\n",
        });
      } else {
        await route.continue();
      }
    });

    // Select Vue
    await page.getByRole("button", { name: /Vue/i }).click();

    // Click Submit
    await page.getByRole("button", { name: /Submit/i }).click();

    // Wait for request to be captured
    await page.waitForTimeout(500);

    // Verify toolResult was sent
    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest.toolResult).toBeDefined();
    expect(capturedRequest.toolResult.tool_use_id).toBe("toolu_single");
    expect(capturedRequest.toolResult.is_error).toBe(false);

    // The content should be JSON with the answer
    const content = JSON.parse(capturedRequest.toolResult.content);
    expect(content.Framework).toBe("Vue");
  });
});

test.describe("AskUserQuestion Multi-Select", () => {
  test.beforeEach(async ({ page }) => {
    const sessionId = "test-session-multi";
    const toolUseId = "toolu_multi";

    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="project-card"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="chat-input"]', {
      timeout: 10000,
    });

    // Mock chat API for multi-select question
    await page.route("**/api/chat", async (route) => {
      const method = route.request().method();
      if (method === "POST") {
        const systemMsg = createSystemMessage(sessionId);
        const askMsg = createAskUserQuestionMessage(sessionId, toolUseId, [
          {
            question: "Which features do you want?",
            header: "Features",
            multiSelect: true,
            options: [
              { label: "Dark mode", description: "Dark theme support" },
              {
                label: "Notifications",
                description: "Push notifications",
              },
              { label: "Analytics", description: "Usage tracking" },
            ],
          },
        ]);

        const body = [
          JSON.stringify({ type: "claude_json", data: systemMsg }),
          JSON.stringify({ type: "claude_json", data: askMsg }),
          JSON.stringify({ type: "done" }),
        ].join("\n");

        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body,
        });
      }
    });

    // Trigger question
    const messageInput = page.locator('[data-testid="chat-input"]');
    await messageInput.fill("Configure features");
    await page.locator('[data-testid="chat-submit"]').click();
    await expect(page.getByText("Claude has a question")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should display multi-select indicator", async ({ page }) => {
    await expect(page.getByText("(select multiple)")).toBeVisible();
  });

  test("should not auto-select for multi-select questions", async ({
    page,
  }) => {
    // Submit button should be disabled when nothing is selected
    const submitButton = page.getByRole("button", { name: /Submit/i });
    await expect(submitButton).toBeDisabled();
  });

  test("should allow selecting multiple options", async ({ page }) => {
    // Select Dark mode and Analytics
    await page.getByRole("button", { name: /Dark mode/i }).click();
    await page.getByRole("button", { name: /Analytics/i }).click();

    // Both should be selected
    await expect(page.getByRole("button", { name: /Dark mode/i })).toHaveClass(
      /bg-blue-50/,
    );
    await expect(page.getByRole("button", { name: /Analytics/i })).toHaveClass(
      /bg-blue-50/,
    );

    // Notifications should not be selected
    await expect(
      page.getByRole("button", { name: /Notifications/i }),
    ).not.toHaveClass(/bg-blue-50/);
  });

  test("should toggle selection on click", async ({ page }) => {
    // Select Dark mode
    const darkModeButton = page.getByRole("button", { name: /Dark mode/i });
    await darkModeButton.click();
    await expect(darkModeButton).toHaveClass(/bg-blue-50/);

    // Click again to deselect
    await darkModeButton.click();
    await expect(darkModeButton).not.toHaveClass(/bg-blue-50/);
  });
});

test.describe("AskUserQuestion Other Option", () => {
  test.beforeEach(async ({ page }) => {
    const sessionId = "test-session-other";
    const toolUseId = "toolu_other";

    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="project-card"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="chat-input"]', {
      timeout: 10000,
    });

    // Mock chat API
    await page.route("**/api/chat", async (route) => {
      const method = route.request().method();
      if (method === "POST") {
        const systemMsg = createSystemMessage(sessionId);
        const askMsg = createAskUserQuestionMessage(sessionId, toolUseId, [
          {
            question: "Which database?",
            header: "Database",
            multiSelect: false,
            options: [
              { label: "PostgreSQL", description: "Relational" },
              { label: "MongoDB", description: "Document" },
            ],
          },
        ]);

        const body = [
          JSON.stringify({ type: "claude_json", data: systemMsg }),
          JSON.stringify({ type: "claude_json", data: askMsg }),
          JSON.stringify({ type: "done" }),
        ].join("\n");

        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body,
        });
      }
    });

    // Trigger question
    const messageInput = page.locator('[data-testid="chat-input"]');
    await messageInput.fill("Setup database");
    await page.locator('[data-testid="chat-submit"]').click();
    await expect(page.getByText("Claude has a question")).toBeVisible({
      timeout: 10000,
    });
  });

  test('should show text input when "Other" is selected', async ({ page }) => {
    // Click Other
    await page.getByRole("button", { name: /^Other$/i }).click();

    // Text input should appear
    await expect(page.getByPlaceholder("Enter your answer...")).toBeVisible();
  });

  test("should submit custom text for Other option", async ({ page }) => {
    let capturedRequest: {
      toolResult: { tool_use_id: string; is_error: boolean; content: string };
    } | null = null;

    // Re-route to capture the answer
    await page.route("**/api/chat", async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();
      if (postData?.toolResult) {
        capturedRequest = postData;
        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body: JSON.stringify({ type: "done" }) + "\n",
        });
      } else {
        await route.continue();
      }
    });

    // Select Other and enter custom text
    await page.getByRole("button", { name: /^Other$/i }).click();
    await page.getByPlaceholder("Enter your answer...").fill("CockroachDB");

    // Submit
    await page.getByRole("button", { name: /Submit/i }).click();

    // Wait and verify
    await page.waitForTimeout(500);
    expect(capturedRequest).not.toBeNull();
    const content = JSON.parse(capturedRequest.toolResult.content);
    expect(content.Database).toBe("CockroachDB");
  });
});

test.describe("AskUserQuestion Cancel Flow", () => {
  test("should send cancellation as tool_result with is_error: true", async ({
    page,
  }) => {
    const sessionId = "test-session-cancel";
    const toolUseId = "toolu_cancel";
    let capturedRequest: {
      toolResult: { tool_use_id: string; is_error: boolean; content: string };
    } | null = null;

    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="project-card"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="chat-input"]', {
      timeout: 10000,
    });

    // Mock chat API
    await page.route("**/api/chat", async (route) => {
      const request = route.request();
      const postData = request.postDataJSON();

      // Capture cancellation request
      if (postData?.toolResult) {
        capturedRequest = postData;
        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body: JSON.stringify({ type: "done" }) + "\n",
        });
        return;
      }

      // Return initial question
      const systemMsg = createSystemMessage(sessionId);
      const askMsg = createAskUserQuestionMessage(sessionId, toolUseId, [
        {
          question: "Choose option",
          header: "Option",
          multiSelect: false,
          options: [{ label: "A", description: "Option A" }],
        },
      ]);

      const body = [
        JSON.stringify({ type: "claude_json", data: systemMsg }),
        JSON.stringify({ type: "claude_json", data: askMsg }),
        JSON.stringify({ type: "done" }),
      ].join("\n");

      await route.fulfill({
        status: 200,
        contentType: "application/x-ndjson",
        body,
      });
    });

    // Trigger question
    const messageInput = page.locator('[data-testid="chat-input"]');
    await messageInput.fill("Test cancel");
    await page.locator('[data-testid="chat-submit"]').click();
    await expect(page.getByText("Claude has a question")).toBeVisible({
      timeout: 10000,
    });

    // Click Cancel
    await page.getByRole("button", { name: /Cancel/i }).click();

    // Wait and verify
    await page.waitForTimeout(500);
    expect(capturedRequest).not.toBeNull();
    expect(capturedRequest.toolResult.tool_use_id).toBe("toolu_cancel");
    expect(capturedRequest.toolResult.is_error).toBe(true);
    expect(capturedRequest.toolResult.content).toContain("cancelled");
  });
});

test.describe("AskUserQuestion Keyboard Navigation", () => {
  test.beforeEach(async ({ page }) => {
    const sessionId = "test-session-keyboard";
    const toolUseId = "toolu_keyboard";

    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="project-card"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="chat-input"]', {
      timeout: 10000,
    });

    // Mock chat API
    await page.route("**/api/chat", async (route) => {
      const method = route.request().method();
      if (method === "POST") {
        const systemMsg = createSystemMessage(sessionId);
        const askMsg = createAskUserQuestionMessage(sessionId, toolUseId, [
          {
            question: "Select option",
            header: "Option",
            multiSelect: false,
            options: [
              { label: "First", description: "First option" },
              { label: "Second", description: "Second option" },
            ],
          },
        ]);

        const body = [
          JSON.stringify({ type: "claude_json", data: systemMsg }),
          JSON.stringify({ type: "claude_json", data: askMsg }),
          JSON.stringify({ type: "done" }),
        ].join("\n");

        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body,
        });
      }
    });

    // Trigger question
    const messageInput = page.locator('[data-testid="chat-input"]');
    await messageInput.fill("Keyboard test");
    await page.locator('[data-testid="chat-submit"]').click();
    await expect(page.getByText("Claude has a question")).toBeVisible({
      timeout: 10000,
    });
  });

  test("should submit on Enter key", async ({ page }) => {
    let submitted = false;

    await page.route("**/api/chat", async (route) => {
      const postData = route.request().postDataJSON();
      if (postData?.toolResult) {
        submitted = true;
        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body: JSON.stringify({ type: "done" }) + "\n",
        });
      } else {
        await route.continue();
      }
    });

    // Press Enter to submit
    await page.keyboard.press("Enter");
    await page.waitForTimeout(500);

    expect(submitted).toBe(true);
  });

  test("should cancel on Escape key", async ({ page }) => {
    let cancelled = false;

    await page.route("**/api/chat", async (route) => {
      const postData = route.request().postDataJSON();
      if (postData?.toolResult?.is_error) {
        cancelled = true;
        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body: JSON.stringify({ type: "done" }) + "\n",
        });
      } else {
        await route.continue();
      }
    });

    // Press Escape to cancel
    await page.keyboard.press("Escape");
    await page.waitForTimeout(500);

    expect(cancelled).toBe(true);
  });
});

test.describe("AskUserQuestion Multiple Questions", () => {
  test("should handle multiple questions in a single panel", async ({
    page,
  }) => {
    const sessionId = "test-session-multiple";
    const toolUseId = "toolu_multiple";
    let capturedRequest: {
      toolResult: { tool_use_id: string; is_error: boolean; content: string };
    } | null = null;

    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="project-card"]', {
      timeout: 10000,
    });
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="chat-input"]', {
      timeout: 10000,
    });

    // Mock chat API with multiple questions
    await page.route("**/api/chat", async (route) => {
      const postData = route.request().postDataJSON();

      if (postData?.toolResult) {
        capturedRequest = postData;
        await route.fulfill({
          status: 200,
          contentType: "application/x-ndjson",
          body: JSON.stringify({ type: "done" }) + "\n",
        });
        return;
      }

      const systemMsg = createSystemMessage(sessionId);
      const askMsg = createAskUserQuestionMessage(sessionId, toolUseId, [
        {
          question: "Frontend framework?",
          header: "Frontend",
          multiSelect: false,
          options: [
            { label: "React", description: "React 18" },
            { label: "Vue", description: "Vue 3" },
          ],
        },
        {
          question: "Backend framework?",
          header: "Backend",
          multiSelect: false,
          options: [
            { label: "Express", description: "Node.js" },
            { label: "Django", description: "Python" },
          ],
        },
      ]);

      const body = [
        JSON.stringify({ type: "claude_json", data: systemMsg }),
        JSON.stringify({ type: "claude_json", data: askMsg }),
        JSON.stringify({ type: "done" }),
      ].join("\n");

      await route.fulfill({
        status: 200,
        contentType: "application/x-ndjson",
        body,
      });
    });

    // Trigger question
    const messageInput = page.locator('[data-testid="chat-input"]');
    await messageInput.fill("Setup full stack");
    await page.locator('[data-testid="chat-submit"]').click();

    // Wait for panel to appear
    const panel = page.getByTestId("ask-user-question-panel");
    await expect(panel).toBeVisible({ timeout: 10000 });

    // Both questions should be visible
    await expect(panel.getByText("Frontend framework?")).toBeVisible();
    await expect(panel.getByText("Backend framework?")).toBeVisible();

    // Select Vue for frontend and Django for backend
    await page.getByRole("button", { name: /Vue/i }).click();
    await page.getByRole("button", { name: /Django/i }).click();

    // Submit
    await page.getByRole("button", { name: /Submit/i }).click();

    // Wait and verify
    await page.waitForTimeout(500);
    expect(capturedRequest).not.toBeNull();
    const content = JSON.parse(capturedRequest.toolResult.content);
    expect(content.Frontend).toBe("Vue");
    expect(content.Backend).toBe("Django");
  });
});
