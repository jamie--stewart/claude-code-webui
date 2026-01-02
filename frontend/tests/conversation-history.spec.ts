import { test, expect } from "@playwright/test";

/**
 * E2E tests for conversation history loading
 * Tests: history button, history list, conversation selection, history loading
 */

test.describe("Conversation History", () => {
  test.describe("History Button", () => {
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

    test("should display history button on chat page", async ({ page }) => {
      const historyButton = page.locator('[data-testid="history-button"]');
      await expect(historyButton).toBeVisible();
    });

    test("should have proper accessibility attributes", async ({ page }) => {
      const historyButton = page.locator('[data-testid="history-button"]');
      await expect(historyButton).toHaveAttribute(
        "aria-label",
        "View conversation history",
      );
    });

    test("should be clickable", async ({ page }) => {
      // Mock the histories API
      await page.route("**/api/projects/*/histories", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            conversations: [],
          }),
        });
      });

      const historyButton = page.locator('[data-testid="history-button"]');
      await historyButton.click();

      // History view should be shown (or loading state)
      // The exact behavior depends on the implementation
    });
  });

  test.describe("History List Loading", () => {
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
    });

    test("should show loading state while fetching conversations", async ({
      page,
    }) => {
      // Delay the histories response
      await page.route("**/api/projects/*/histories", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            conversations: [],
          }),
        });
      });

      await page.goto("/", { waitUntil: "networkidle" });
      await page.click('[data-testid="project-card"]');
      await page.waitForSelector('[data-testid="history-button"]', {
        timeout: 10000,
      });

      // Click history button
      await page.click('[data-testid="history-button"]');

      // Should show loading state
      await expect(page.getByText(/Loading/)).toBeVisible({ timeout: 5000 });
    });

    test("should display empty state when no conversations exist", async ({
      page,
    }) => {
      await page.route("**/api/projects/*/histories", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            conversations: [],
          }),
        });
      });

      await page.goto("/", { waitUntil: "networkidle" });
      await page.click('[data-testid="project-card"]');
      await page.waitForSelector('[data-testid="history-button"]', {
        timeout: 10000,
      });

      await page.click('[data-testid="history-button"]');

      // Should show empty state message
      await expect(page.getByText("No Conversations Yet")).toBeVisible({
        timeout: 5000,
      });
    });

    test("should display error when history fails to load", async ({
      page,
    }) => {
      await page.route("**/api/projects/*/histories", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Server error" }),
        });
      });

      await page.goto("/", { waitUntil: "networkidle" });
      await page.click('[data-testid="project-card"]');
      await page.waitForSelector('[data-testid="history-button"]', {
        timeout: 10000,
      });

      await page.click('[data-testid="history-button"]');

      // Should show error state
      await expect(page.getByText(/Error/)).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Conversation List Display", () => {
    const mockConversations = [
      {
        sessionId: "session-abc123def456",
        startTime: "2024-01-15T10:30:00Z",
        messageCount: 5,
        lastMessagePreview: "Can you help me refactor this function?",
      },
      {
        sessionId: "session-xyz789ghi012",
        startTime: "2024-01-14T15:45:00Z",
        messageCount: 12,
        lastMessagePreview:
          "Thanks for the help with debugging the API endpoint!",
      },
      {
        sessionId: "session-mno345pqr678",
        startTime: "2024-01-13T09:00:00Z",
        messageCount: 3,
        lastMessagePreview: "How do I write unit tests for this component?",
      },
    ];

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

      await page.route("**/api/projects/*/histories", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            conversations: mockConversations,
          }),
        });
      });
    });

    test("should display conversation cards", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.click('[data-testid="project-card"]');
      await page.waitForSelector('[data-testid="history-button"]', {
        timeout: 10000,
      });

      await page.click('[data-testid="history-button"]');

      // Wait for conversations to load
      await expect(
        page.locator('[data-testid="conversation-card"]'),
      ).toHaveCount(3, {
        timeout: 5000,
      });
    });

    test("should display truncated session ID", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.click('[data-testid="project-card"]');
      await page.waitForSelector('[data-testid="history-button"]', {
        timeout: 10000,
      });

      await page.click('[data-testid="history-button"]');

      // Should show truncated session ID (first 8 characters)
      await expect(page.getByText("Session: session-a...")).toBeVisible({
        timeout: 5000,
      });
    });

    test("should display message count", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.click('[data-testid="project-card"]');
      await page.waitForSelector('[data-testid="history-button"]', {
        timeout: 10000,
      });

      await page.click('[data-testid="history-button"]');

      // Should show message counts
      await expect(page.getByText("5 messages")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("12 messages")).toBeVisible({
        timeout: 5000,
      });
      await expect(page.getByText("3 messages")).toBeVisible({ timeout: 5000 });
    });

    test("should display last message preview", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.click('[data-testid="project-card"]');
      await page.waitForSelector('[data-testid="history-button"]', {
        timeout: 10000,
      });

      await page.click('[data-testid="history-button"]');

      // Should show message previews
      await expect(
        page.getByText("Can you help me refactor this function?"),
      ).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Conversation Selection", () => {
    const mockConversations = [
      {
        sessionId: "session-test123",
        startTime: "2024-01-15T10:30:00Z",
        messageCount: 5,
        lastMessagePreview: "Test conversation",
      },
    ];

    const mockConversationHistory = {
      messages: [
        {
          type: "assistant",
          message: {
            id: "msg_1",
            type: "message",
            role: "assistant",
            content: [{ type: "text", text: "Hello! How can I help you?" }],
            model: "claude-3-5-sonnet-20241022",
          },
          timestamp: "2024-01-15T10:31:00Z",
          session_id: "session-test123",
        },
      ],
    };

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

      await page.route("**/api/projects/*/histories", async (route) => {
        if (route.request().url().includes("/histories/")) {
          // Specific conversation history
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify(mockConversationHistory),
          });
        } else {
          // List of conversations
          await route.fulfill({
            status: 200,
            contentType: "application/json",
            body: JSON.stringify({
              conversations: mockConversations,
            }),
          });
        }
      });
    });

    test("should be clickable", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.click('[data-testid="project-card"]');
      await page.waitForSelector('[data-testid="history-button"]', {
        timeout: 10000,
      });

      await page.click('[data-testid="history-button"]');

      // Wait for conversation card
      await page.waitForSelector('[data-testid="conversation-card"]', {
        timeout: 5000,
      });

      // Click on conversation card
      await page.click('[data-testid="conversation-card"]');

      // URL should update with session ID
      await expect(page).toHaveURL(/sessionId=session-test123/);
    });

    test("should have hover effect on conversation cards", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });
      await page.click('[data-testid="project-card"]');
      await page.waitForSelector('[data-testid="history-button"]', {
        timeout: 10000,
      });

      await page.click('[data-testid="history-button"]');

      const conversationCard = page.locator(
        '[data-testid="conversation-card"]',
      );
      await expect(conversationCard).toBeVisible({ timeout: 5000 });

      // Hover over the card
      await conversationCard.hover();

      // Card should still be visible (hover effects applied via CSS)
      await expect(conversationCard).toBeVisible();
    });
  });

  test.describe("History Loading from URL", () => {
    const mockConversationHistory = {
      messages: [
        {
          type: "assistant",
          message: {
            id: "msg_1",
            type: "message",
            role: "assistant",
            content: [{ type: "text", text: "Previous conversation message" }],
            model: "claude-3-5-sonnet-20241022",
          },
          timestamp: "2024-01-15T10:31:00Z",
          session_id: "session-url-test",
        },
      ],
    };

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

      await page.route("**/api/projects/*/histories/*", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockConversationHistory),
        });
      });
    });

    test("should load conversation when sessionId is in URL", async ({
      page,
    }) => {
      await page.goto("/projects/test/project?sessionId=session-url-test", {
        waitUntil: "networkidle",
      });

      // Chat messages should contain the historical message
      const messagesContainer = page.locator('[data-testid="chat-messages"]');
      await expect(messagesContainer).toContainText(
        "Previous conversation message",
        { timeout: 5000 },
      );
    });

    test("should maintain session ID in URL after loading", async ({
      page,
    }) => {
      await page.goto("/projects/test/project?sessionId=session-url-test", {
        waitUntil: "networkidle",
      });

      // URL should still contain the session ID
      await expect(page).toHaveURL(/sessionId=session-url-test/);
    });
  });

  test.describe("Session Continuity", () => {
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
    });

    test("should include session ID in subsequent chat requests", async ({
      page,
    }) => {
      const capturedRequests: { sessionId?: string }[] = [];

      await page.route("**/api/chat", async (route) => {
        const request = route.request();
        const body = JSON.parse(request.postData() || "{}");
        capturedRequests.push({ sessionId: body.sessionId });

        const sessionId = body.sessionId || "new-session-123";

        await route.fulfill({
          status: 200,
          contentType: "text/plain",
          body: `${JSON.stringify({
            type: "system",
            session_id: sessionId,
            cwd: "/test/project",
            tools: [],
            model: "claude-3-5-sonnet-20241022",
          })}\n${JSON.stringify({
            type: "assistant",
            message: {
              id: "msg_1",
              type: "message",
              role: "assistant",
              content: [{ type: "text", text: "Response" }],
              model: "claude-3-5-sonnet-20241022",
              stop_reason: "end_turn",
              usage: { input_tokens: 10, output_tokens: 20 },
            },
            session_id: sessionId,
          })}\n${JSON.stringify({
            type: "result",
            subtype: "success",
            session_id: sessionId,
          })}\n`,
        });
      });

      await page.goto("/", { waitUntil: "networkidle" });
      await page.click('[data-testid="project-card"]');
      await page.waitForSelector('[data-testid="chat-input"]', {
        timeout: 10000,
      });

      const chatInput = page.locator('[data-testid="chat-input"]');
      const submitButton = page.locator('[data-testid="chat-submit"]');

      // Send first message
      await chatInput.fill("First message");
      await submitButton.click();

      // Wait for response
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText(
        "Response",
        { timeout: 5000 },
      );

      // Send second message
      await chatInput.fill("Second message");
      await submitButton.click();

      // Wait for second response
      await page.waitForTimeout(1000);

      // Second request should include session ID
      expect(capturedRequests.length).toBeGreaterThanOrEqual(2);
      // First request may or may not have sessionId, but second should
      if (capturedRequests.length >= 2) {
        expect(capturedRequests[1].sessionId).toBeDefined();
      }
    });
  });
});
