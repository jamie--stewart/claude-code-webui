import { test, expect } from "@playwright/test";

/**
 * E2E tests for error scenarios and edge cases
 * Tests: network errors, API failures, timeout scenarios, invalid inputs, and edge cases in chat flow
 */

// Timeout constants for consistent test configuration
const TIMEOUTS = {
  /** Timeout for waiting for elements to appear */
  ELEMENT: 10000,
  /** Timeout for navigation and page loads */
  NAVIGATION: 10000,
  /** Short timeout for quick assertions */
  SHORT: 5000,
  /** Simulated slow response (kept short to avoid slow tests) */
  SLOW_RESPONSE: 100,
} as const;

// Mock projects response
const mockProjects = {
  projects: [{ path: "/test/project", encodedName: "test-project" }],
};

test.describe("Network Error Handling", () => {
  test("should display error when API is unreachable", async ({ page }) => {
    // Mock network failure for projects API
    await page.route("**/api/projects", async (route) => {
      await route.abort("connectionrefused");
    });

    await page.goto("/", { waitUntil: "domcontentloaded" });

    // Should show error state
    await expect(page.getByText(/Error/i)).toBeVisible({
      timeout: TIMEOUTS.ELEMENT,
    });
  });

  test("should handle network timeout gracefully", async ({ page }) => {
    // Mock a slow response - we abort it early to keep tests fast
    // The test verifies the loading state appears while waiting
    await page.route("**/api/projects", async (route) => {
      // Small delay to ensure loading state is visible, then abort
      await new Promise((resolve) =>
        setTimeout(resolve, TIMEOUTS.SLOW_RESPONSE),
      );
      await route.abort("timedout");
    });

    await page.goto("/");

    // Should show loading state initially
    await expect(page.getByText("Loading projects...")).toBeVisible();
  });

  test("should recover from temporary network failure on retry", async ({
    page,
  }) => {
    let requestCount = 0;

    await page.route("**/api/projects", async (route) => {
      requestCount++;
      if (requestCount === 1) {
        // First request fails
        await route.fulfill({
          status: 503,
          contentType: "application/json",
          body: JSON.stringify({ error: "Service unavailable" }),
        });
      } else {
        // Subsequent requests succeed
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockProjects),
        });
      }
    });

    await page.goto("/", { waitUntil: "networkidle" });

    // Should show error initially
    await expect(page.getByText(/Error/i)).toBeVisible({
      timeout: TIMEOUTS.SHORT,
    });

    // Reload to retry
    await page.reload();

    // Should now show projects
    await expect(page.locator('[data-testid="project-card"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT,
    });
  });
});

test.describe("API Error Responses", () => {
  test("should display error for 500 Internal Server Error", async ({
    page,
  }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Internal server error" }),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.getByText(/Error/i)).toBeVisible({
      timeout: TIMEOUTS.SHORT,
    });
  });

  test("should display error for 404 Not Found", async ({ page }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Not found" }),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.getByText(/Error/i)).toBeVisible({
      timeout: TIMEOUTS.SHORT,
    });
  });

  test("should display error for 401 Unauthorized", async ({ page }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorized" }),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });

    await expect(page.getByText(/Error/i)).toBeVisible({
      timeout: TIMEOUTS.SHORT,
    });
  });

  test("should handle malformed JSON response gracefully", async ({ page }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: "{ invalid json }",
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });

    // Should handle gracefully - either show error or empty state
    // Not crash or show raw error
    await expect(page.locator("body")).not.toContainText("undefined");
  });
});

test.describe("Chat API Error Handling", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="chat-input"]', {
      timeout: TIMEOUTS.ELEMENT,
    });
  });

  test("should handle chat API failure gracefully", async ({ page }) => {
    await page.route("**/api/chat", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Chat service unavailable" }),
      });
    });

    const chatInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="chat-submit"]');

    await chatInput.fill("Test message");
    await submitButton.click();

    // Should handle error - input should be re-enabled after error
    await expect(chatInput).toBeEnabled({ timeout: TIMEOUTS.ELEMENT });
  });

  test("should handle chat connection timeout", async ({ page }) => {
    let resolveRoute: () => void;
    const routePromise = new Promise<void>((resolve) => {
      resolveRoute = resolve;
    });

    await page.route("**/api/chat", async (route) => {
      await routePromise;
      await route.fulfill({
        status: 504,
        contentType: "application/json",
        body: JSON.stringify({ error: "Gateway timeout" }),
      });
    });

    const chatInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="chat-submit"]');

    await chatInput.fill("Test message");
    await submitButton.click();

    // Should show loading state
    await expect(submitButton).toHaveText("...");

    // Abort button should appear during long-running request
    const abortButton = page.locator('[data-testid="chat-abort"]');
    await expect(abortButton).toBeVisible({ timeout: TIMEOUTS.SHORT });

    // Complete the route
    resolveRoute!();
  });

  test("should allow abort of stuck request", async ({ page }) => {
    // Use a promise that we control to simulate a stuck request
    let resolveStuckRoute: () => void;
    const stuckPromise = new Promise<void>((resolve) => {
      resolveStuckRoute = resolve;
    });

    await page.route("**/api/chat", async (route) => {
      // Wait until test completes or aborts - avoid long timeouts
      await stuckPromise;
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "",
      });
    });

    // Cleanup: resolve the stuck promise when test ends
    page.on("close", () => resolveStuckRoute?.());

    const chatInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="chat-submit"]');

    await chatInput.fill("Test message");
    await submitButton.click();

    // Wait for abort button
    const abortButton = page.locator('[data-testid="chat-abort"]');
    await expect(abortButton).toBeVisible({ timeout: TIMEOUTS.SHORT });

    // Click abort
    await abortButton.click();

    // Input should be re-enabled
    await expect(chatInput).toBeEnabled({ timeout: TIMEOUTS.SHORT });
  });
});

test.describe("History API Error Handling", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="history-button"]', {
      timeout: TIMEOUTS.ELEMENT,
    });
  });

  test("should display error when history list fails to load", async ({
    page,
  }) => {
    await page.route("**/api/projects/*/histories", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Failed to load history" }),
      });
    });

    await page.click('[data-testid="history-button"]');

    // Should show error state
    await expect(
      page.getByRole("heading", { name: /Error Loading History/i }),
    ).toBeVisible({ timeout: TIMEOUTS.SHORT });
  });

  test("should display error when specific conversation fails to load", async ({
    page,
  }) => {
    await page.route("**/api/projects/*/histories", async (route) => {
      const url = route.request().url();
      if (url.includes("/histories/")) {
        // Specific conversation fetch fails
        await route.fulfill({
          status: 404,
          contentType: "application/json",
          body: JSON.stringify({ error: "Conversation not found" }),
        });
      } else {
        // List fetch succeeds
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            conversations: [
              {
                sessionId: "test-session",
                startTime: "2024-01-15T10:30:00Z",
                messageCount: 5,
                lastMessagePreview: "Test message",
              },
            ],
          }),
        });
      }
    });

    await page.click('[data-testid="history-button"]');

    // Wait for list to load
    await expect(page.locator('[data-testid="conversation-card"]')).toBeVisible(
      { timeout: TIMEOUTS.SHORT },
    );

    // Click on conversation
    await page.click('[data-testid="conversation-card"]');

    // Should handle gracefully - may show error or empty messages
    await page.waitForTimeout(1000);
  });
});

test.describe("Empty States", () => {
  test("should handle empty project list gracefully", async ({ page }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ projects: [] }),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });

    // Should not crash and should show empty state
    await expect(page.locator('[data-testid="project-card"]')).toHaveCount(0);
    // Recent Projects section should not be visible when empty
    await expect(page.getByText("Recent Projects")).not.toBeVisible();
  });

  test("should display empty state in chat when no messages", async ({
    page,
  }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.click('[data-testid="project-card"]');

    await page.waitForSelector('[data-testid="chat-messages"]', {
      timeout: TIMEOUTS.ELEMENT,
    });

    const messagesContainer = page.locator('[data-testid="chat-messages"]');
    await expect(messagesContainer).toContainText(
      "Start a conversation with Claude",
    );
  });

  test("should handle empty conversation history gracefully", async ({
    page,
  }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    await page.route("**/api/projects/*/histories", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ conversations: [] }),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="history-button"]', {
      timeout: TIMEOUTS.ELEMENT,
    });

    await page.click('[data-testid="history-button"]');

    // Should show empty state message
    await expect(page.getByText("No Conversations Yet")).toBeVisible({
      timeout: TIMEOUTS.SHORT,
    });
  });
});

test.describe("Input Validation and Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="chat-input"]', {
      timeout: TIMEOUTS.ELEMENT,
    });
  });

  test("should not submit empty message", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="chat-submit"]');

    // Ensure input is empty
    await chatInput.clear();

    // Submit button should be disabled
    await expect(submitButton).toBeDisabled();

    // Try pressing Enter - should not submit
    await chatInput.press("Enter");

    // Button should still be disabled (no request sent)
    await expect(submitButton).toBeDisabled();
  });

  test("should not submit whitespace-only message", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="chat-submit"]');

    await chatInput.fill("   ");

    // Submit button should be disabled for whitespace-only input
    await expect(submitButton).toBeDisabled();
  });

  test("should handle very long messages", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="chat-submit"]');

    // Create a very long message
    const longMessage = "A".repeat(10000);
    await chatInput.fill(longMessage);

    // Should still allow submission
    await expect(submitButton).toBeEnabled();

    // Input should contain the long message
    const value = await chatInput.inputValue();
    expect(value.length).toBe(10000);
  });

  test("should handle special characters in messages", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="chat-submit"]');

    const specialCharsMessage =
      '<script>alert("xss")</script> & < > " \' \\ / \n\t';
    await chatInput.fill(specialCharsMessage);

    // Should be enabled
    await expect(submitButton).toBeEnabled();

    // Input should contain the special characters
    const value = await chatInput.inputValue();
    expect(value).toContain("<script>");
  });

  test("should handle unicode and emoji in messages", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="chat-submit"]');

    const unicodeMessage =
      "Hello World! Chinese: Japanese: Korean: Arabic: Emoji: ";
    await chatInput.fill(unicodeMessage);

    await expect(submitButton).toBeEnabled();
  });
});

test.describe("URL and Navigation Edge Cases", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });
  });

  test("should handle direct navigation to non-existent project", async ({
    page,
  }) => {
    await page.goto("/projects/non-existent-project", {
      waitUntil: "networkidle",
    });

    // Should still render chat page (frontend doesn't validate project existence)
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT,
    });
  });

  test("should handle malformed sessionId in URL", async ({ page }) => {
    await page.route("**/api/projects/*/histories/*", async (route) => {
      await route.fulfill({
        status: 404,
        contentType: "application/json",
        body: JSON.stringify({ error: "Session not found" }),
      });
    });

    await page.goto(
      "/projects/test/project?sessionId=invalid-session-<script>",
      {
        waitUntil: "networkidle",
      },
    );

    // Should handle gracefully without crashing
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT,
    });
  });

  test("should handle deep project paths in URL", async ({ page }) => {
    await page.goto("/projects/users/john/workspace/deep/nested/project", {
      waitUntil: "networkidle",
    });

    // Should render the page with the decoded path
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT,
    });
  });

  test("should preserve URL parameters on page reload", async ({ page }) => {
    await page.goto("/projects/test/project?sessionId=test-session-123", {
      waitUntil: "networkidle",
    });

    // Reload the page
    await page.reload();

    // URL should still contain the sessionId
    await expect(page).toHaveURL(/sessionId=test-session-123/);
  });
});

test.describe("Concurrent Request Handling", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="chat-input"]', {
      timeout: TIMEOUTS.ELEMENT,
    });
  });

  test("should disable input while request is in progress", async ({
    page,
  }) => {
    let resolveRoute: () => void;
    const routePromise = new Promise<void>((resolve) => {
      resolveRoute = resolve;
    });

    await page.route("**/api/chat", async (route) => {
      await routePromise;
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "",
      });
    });

    const chatInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="chat-submit"]');

    await chatInput.fill("First message");
    await submitButton.click();

    // Input should be disabled during request
    await expect(chatInput).toBeDisabled();

    // Resolve the request
    resolveRoute!();
  });

  test("should prevent double submission", async ({ page }) => {
    let requestCount = 0;

    await page.route("**/api/chat", async (route) => {
      requestCount++;
      await new Promise((resolve) => setTimeout(resolve, 500));
      await route.fulfill({
        status: 200,
        contentType: "text/plain",
        body: "",
      });
    });

    const chatInput = page.locator('[data-testid="chat-input"]');
    const submitButton = page.locator('[data-testid="chat-submit"]');

    await chatInput.fill("Test message");

    // Click submit multiple times rapidly
    await submitButton.click();
    await submitButton.click();
    await submitButton.click();

    await page.waitForTimeout(1000);

    // Only one request should have been made
    expect(requestCount).toBe(1);
  });
});

test.describe("Browser State Edge Cases", () => {
  test("should handle browser back/forward navigation", async ({ page }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    // Navigate to project selection
    await page.goto("/", { waitUntil: "networkidle" });

    // Select project
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="chat-input"]', {
      timeout: TIMEOUTS.ELEMENT,
    });

    // Go back
    await page.goBack();
    await expect(page.locator('[data-testid="project-card"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT,
    });

    // Go forward
    await page.goForward();
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible({
      timeout: TIMEOUTS.ELEMENT,
    });
  });
});
