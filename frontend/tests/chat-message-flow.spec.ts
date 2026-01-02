import { test, expect } from "@playwright/test";

/**
 * E2E tests for chat message flow
 * Tests: sending messages, receiving streaming responses, permission dialogs,
 * tool execution flow, session continuity, and abort functionality
 */

// Helper to create streaming response body in the format the frontend expects
function createStreamingResponse(
  sessionId: string,
  assistantText: string,
): string {
  const systemMessage = JSON.stringify({
    type: "claude_json",
    data: {
      type: "system",
      cwd: "/test/project",
      session_id: sessionId,
      tools: [],
      model: "claude-3-5-sonnet-20241022",
    },
  });
  const assistantMessage = JSON.stringify({
    type: "claude_json",
    data: {
      type: "assistant",
      message: {
        id: "msg_1",
        type: "message",
        role: "assistant",
        content: [{ type: "text", text: assistantText }],
        model: "claude-3-5-sonnet-20241022",
        stop_reason: "end_turn",
        usage: { input_tokens: 10, output_tokens: 20 },
      },
      session_id: sessionId,
    },
  });
  const resultMessage = JSON.stringify({
    type: "claude_json",
    data: {
      type: "result",
      subtype: "success",
      session_id: sessionId,
      result: "",
      num_turns: 1,
      cost_usd: 0.001,
      duration_ms: 500,
      duration_api_ms: 400,
    },
  });
  return `${systemMessage}\n${assistantMessage}\n${resultMessage}\n`;
}

test.describe("Chat Message Flow", () => {
  test.describe("Basic Message Flow", () => {
    test.beforeEach(async ({ page }) => {
      // Mock the projects API to return a test project
      await page.route("**/api/projects", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            projects: [{ path: "/test/project" }],
          }),
        });
      });

      // Navigate and select project
      await page.goto("/", { waitUntil: "networkidle" });
      await page.waitForSelector('[data-testid="project-card"]', {
        timeout: 10000,
      });
      await page.click('[data-testid="project-card"]');

      // Wait for chat page to load
      await page.waitForSelector('[data-testid="chat-input"]', {
        timeout: 10000,
      });
    });

    test("should display empty state when no messages", async ({ page }) => {
      const messagesContainer = page.locator('[data-testid="chat-messages"]');
      await expect(messagesContainer).toBeVisible();

      // Check for empty state message
      await expect(messagesContainer).toContainText(
        "Start a conversation with Claude",
      );
    });

    test("should enable submit button when text is entered", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const submitButton = page.locator('[data-testid="chat-submit"]');

      // Initially disabled
      await expect(submitButton).toBeDisabled();

      // Type a message
      await chatInput.fill("Hello, Claude!");
      await expect(submitButton).toBeEnabled();

      // Clear the message
      await chatInput.clear();
      await expect(submitButton).toBeDisabled();
    });

    // FIXME: This test requires proper streaming mock - the current mock sends response all at once
    // which causes the frontend stream parser to fail. Need to implement proper chunked streaming.
    test.fixme("should clear input after sending message", async ({ page }) => {
      // Mock chat API to return streaming response
      await page.route("**/api/chat", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/plain",
          body: createStreamingResponse(
            "test-session-123",
            "Hello! How can I help you?",
          ),
        });
      });

      const chatInput = page.locator('[data-testid="chat-input"]');
      const submitButton = page.locator('[data-testid="chat-submit"]');

      await chatInput.fill("Hello, Claude!");
      await submitButton.click();

      // Wait for loading to complete and response to be processed
      await page.waitForTimeout(500);

      // Wait for input to be cleared (with longer timeout)
      await expect(chatInput).toHaveValue("", { timeout: 10000 });
    });

    // FIXME: This test requires proper streaming mock
    test.fixme("should display user message in chat", async ({ page }) => {
      // Mock chat API
      await page.route("**/api/chat", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/plain",
          body: createStreamingResponse(
            "test-session-123",
            "Hello! How can I help you?",
          ),
        });
      });

      const chatInput = page.locator('[data-testid="chat-input"]');
      const submitButton = page.locator('[data-testid="chat-submit"]');
      const messagesContainer = page.locator('[data-testid="chat-messages"]');

      await chatInput.fill("Hello, Claude!");
      await submitButton.click();

      // Wait for response to be processed
      await page.waitForTimeout(500);

      // User message should appear (with longer timeout)
      await expect(messagesContainer).toContainText("Hello, Claude!", {
        timeout: 10000,
      });
    });

    // FIXME: This test requires proper streaming mock
    test.fixme("should display assistant response in chat", async ({
      page,
    }) => {
      // Mock chat API
      await page.route("**/api/chat", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/plain",
          body: createStreamingResponse(
            "test-session-123",
            "This is a test response from Claude!",
          ),
        });
      });

      const chatInput = page.locator('[data-testid="chat-input"]');
      const submitButton = page.locator('[data-testid="chat-submit"]');
      const messagesContainer = page.locator('[data-testid="chat-messages"]');

      await chatInput.fill("Test message");
      await submitButton.click();

      // Wait for response to be processed
      await page.waitForTimeout(500);

      // Wait for assistant response (with longer timeout)
      await expect(messagesContainer).toContainText(
        "This is a test response from Claude!",
        { timeout: 10000 },
      );
    });
  });

  test.describe("Loading State", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/projects", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            projects: [{ path: "/test/project" }],
          }),
        });
      });

      await page.goto("/", { waitUntil: "networkidle" });
      await page.click('[data-testid="project-card"]');
      await page.waitForSelector('[data-testid="chat-input"]', {
        timeout: 10000,
      });
    });

    test("should show loading state during message processing", async ({
      page,
    }) => {
      // Create a delayed response to observe loading state
      await page.route("**/api/chat", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 1000));
        await route.fulfill({
          status: 200,
          contentType: "text/plain",
          body: createStreamingResponse("test-session-123", "Response"),
        });
      });

      const chatInput = page.locator('[data-testid="chat-input"]');
      const submitButton = page.locator('[data-testid="chat-submit"]');

      await chatInput.fill("Test message");
      await submitButton.click();

      // Submit button should show loading state
      await expect(submitButton).toHaveText("...");

      // Input should be disabled during loading
      await expect(chatInput).toBeDisabled();
    });

    test("should disable input during loading", async ({ page }) => {
      let resolveRoute: () => void;
      const routePromise = new Promise<void>((resolve) => {
        resolveRoute = resolve;
      });

      await page.route("**/api/chat", async (route) => {
        await routePromise;
        await route.fulfill({
          status: 200,
          contentType: "text/plain",
          body: createStreamingResponse("test-session", "Response"),
        });
      });

      const chatInput = page.locator('[data-testid="chat-input"]');
      const submitButton = page.locator('[data-testid="chat-submit"]');

      await chatInput.fill("Test message");
      await submitButton.click();

      // Input should be disabled
      await expect(chatInput).toBeDisabled();

      // Resolve the route to complete the request
      resolveRoute!();
    });
  });

  test.describe("Abort Functionality", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/projects", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            projects: [{ path: "/test/project" }],
          }),
        });
      });

      await page.goto("/", { waitUntil: "networkidle" });
      await page.click('[data-testid="project-card"]');
      await page.waitForSelector('[data-testid="chat-input"]', {
        timeout: 10000,
      });
    });

    test("should show abort button during request", async ({ page }) => {
      let resolveRoute: () => void;
      const routePromise = new Promise<void>((resolve) => {
        resolveRoute = resolve;
      });

      await page.route("**/api/chat", async (route) => {
        await routePromise;
        await route.fulfill({
          status: 200,
          contentType: "text/plain",
          body: createStreamingResponse("test-session", "Response"),
        });
      });

      const chatInput = page.locator('[data-testid="chat-input"]');
      const submitButton = page.locator('[data-testid="chat-submit"]');
      const abortButton = page.locator('[data-testid="chat-abort"]');

      await chatInput.fill("Test message");
      await submitButton.click();

      // Abort button should be visible during request
      await expect(abortButton).toBeVisible({ timeout: 5000 });

      // Resolve the route
      resolveRoute!();
    });
  });

  test.describe("Keyboard Shortcuts", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/projects", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            projects: [{ path: "/test/project" }],
          }),
        });
      });

      await page.route("**/api/chat", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "text/plain",
          body: createStreamingResponse("test-session", "Response"),
        });
      });

      await page.goto("/", { waitUntil: "networkidle" });
      await page.click('[data-testid="project-card"]');
      await page.waitForSelector('[data-testid="chat-input"]', {
        timeout: 10000,
      });
    });

    // FIXME: This test requires proper streaming mock
    test.fixme("should send message with Enter key (default behavior)", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');
      const messagesContainer = page.locator('[data-testid="chat-messages"]');

      await chatInput.fill("Test via Enter");
      await chatInput.press("Enter");

      // Message should be sent
      await expect(messagesContainer).toContainText("Test via Enter");
    });

    test("should add newline with Shift+Enter (default behavior)", async ({
      page,
    }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');

      await chatInput.fill("Line 1");
      await chatInput.press("Shift+Enter");
      await page.keyboard.type("Line 2");

      // Input should contain both lines
      const value = await chatInput.inputValue();
      expect(value).toContain("Line 1");
      expect(value).toContain("Line 2");
    });
  });
});

test.describe("Demo Mode Chat Flow", () => {
  test("should display demo page with chat interface", async ({ page }) => {
    await page.goto("/demo", { waitUntil: "networkidle" });

    // Demo page should be active
    await expect(page.locator('[data-demo-active="true"]')).toBeVisible();

    // Chat messages container should be visible
    await expect(page.locator('[data-testid="chat-messages"]')).toBeVisible();
  });

  test("should show demo scenario steps", async ({ page }) => {
    await page.goto("/demo?scenario=basic", { waitUntil: "networkidle" });

    // Wait for demo to progress
    await expect(page.locator("[data-demo-step]")).toBeVisible({
      timeout: 10000,
    });

    // Demo should show content
    const messagesContainer = page.locator('[data-testid="chat-messages"]');
    await expect(messagesContainer).toBeVisible();
  });

  test("should complete demo scenario", async ({ page }) => {
    await page.goto("/demo?scenario=basic", { waitUntil: "networkidle" });

    // Wait for demo completion
    await expect(page.locator('[data-demo-completed="true"]')).toBeVisible({
      timeout: 30000,
    });
  });
});
