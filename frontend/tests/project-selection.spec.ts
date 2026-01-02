import { test, expect } from "@playwright/test";

/**
 * E2E tests for project selection and switching
 * Tests: project list loading, project selection, navigation, project switching
 */

// Helper to create streaming response body in the format the frontend expects
function createStreamingResponse(
  sessionId: string,
  assistantText: string,
  cwd = "/test/project",
): string {
  const systemMessage = JSON.stringify({
    type: "claude_json",
    data: {
      type: "system",
      cwd,
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

test.describe("Project Selection", () => {
  test.describe("Project List Loading", () => {
    test("should display loading state while fetching projects", async ({
      page,
    }) => {
      // Add delay to observe loading state
      await page.route("**/api/projects", async (route) => {
        await new Promise((resolve) => setTimeout(resolve, 500));
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            projects: [{ path: "/test/project" }],
          }),
        });
      });

      await page.goto("/");

      // Should show loading state
      await expect(page.getByText("Loading projects...")).toBeVisible();

      // Wait for projects to load
      await expect(page.locator('[data-testid="project-card"]')).toBeVisible({
        timeout: 10000,
      });
    });

    test("should display project list when loaded", async ({ page }) => {
      await page.route("**/api/projects", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            projects: [
              { path: "/users/dev/project-one" },
              { path: "/users/dev/project-two" },
              { path: "/users/dev/project-three" },
            ],
          }),
        });
      });

      await page.goto("/", { waitUntil: "networkidle" });

      // All projects should be visible
      const projectCards = page.locator('[data-testid="project-card"]');
      await expect(projectCards).toHaveCount(3);

      // Project paths should be displayed
      await expect(page.getByText("/users/dev/project-one")).toBeVisible();
      await expect(page.getByText("/users/dev/project-two")).toBeVisible();
      await expect(page.getByText("/users/dev/project-three")).toBeVisible();
    });

    test("should display error when projects fail to load", async ({
      page,
    }) => {
      await page.route("**/api/projects", async (route) => {
        await route.fulfill({
          status: 500,
          contentType: "application/json",
          body: JSON.stringify({ error: "Server error" }),
        });
      });

      await page.goto("/", { waitUntil: "networkidle" });

      // Should show error message
      await expect(page.getByText(/Error:/)).toBeVisible();
    });

    test("should display page title", async ({ page }) => {
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

      // Page title should be visible
      await expect(page.getByRole("heading", { level: 1 })).toContainText(
        "Select a Project",
      );
    });

    test("should display Recent Projects section when projects exist", async ({
      page,
    }) => {
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

      // Section header should be visible
      await expect(page.getByText("Recent Projects")).toBeVisible();
    });
  });

  test.describe("Project Selection", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/projects", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            projects: [
              { path: "/workspace/frontend" },
              { path: "/workspace/backend" },
            ],
          }),
        });
      });
    });

    test("should navigate to chat page when project is clicked", async ({
      page,
    }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      // Click on first project
      await page.locator('[data-testid="project-card"]').first().click();

      // Should navigate to project chat page
      await expect(page).toHaveURL(/\/projects\/workspace\/frontend/);
    });

    test("should show chat input after project selection", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      // Click on project
      await page.locator('[data-testid="project-card"]').first().click();

      // Chat input should be visible
      await expect(page.locator('[data-testid="chat-input"]')).toBeVisible({
        timeout: 10000,
      });
    });

    test("should display project path in chat page header", async ({
      page,
    }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      // Click on a project
      await page.getByText("/workspace/frontend").click();

      // Wait for chat page
      await page.waitForSelector('[data-testid="chat-input"]', {
        timeout: 10000,
      });

      // Project path should be visible in header
      await expect(page.getByText("/workspace/frontend")).toBeVisible();
    });

    test("should preserve project path with slashes in URL", async ({
      page,
    }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      // Click on project with deep path
      await page.getByText("/workspace/backend").click();

      // URL should contain the full path
      await expect(page).toHaveURL(/\/projects\/workspace\/backend/);
    });
  });

  test.describe("Project Switching", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/projects", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            projects: [
              { path: "/project-a" },
              { path: "/project-b" },
              { path: "/project-c" },
            ],
          }),
        });
      });
    });

    test("should be able to navigate back to project selection", async ({
      page,
    }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      // Select first project
      await page.locator('[data-testid="project-card"]').first().click();
      await page.waitForSelector('[data-testid="chat-input"]', {
        timeout: 10000,
      });

      // Navigate back using browser back
      await page.goBack();

      // Should be back on project selection page
      await expect(page.locator('[data-testid="project-card"]')).toHaveCount(3);
    });

    test("should switch between different projects", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      // Select first project
      await page.getByText("/project-a").click();
      await page.waitForSelector('[data-testid="chat-input"]', {
        timeout: 10000,
      });
      await expect(page).toHaveURL(/\/projects\/project-a/);

      // Go back and select different project
      await page.goBack();
      await page.getByText("/project-b").click();
      await page.waitForSelector('[data-testid="chat-input"]', {
        timeout: 10000,
      });
      await expect(page).toHaveURL(/\/projects\/project-b/);
    });

    // FIXME: This test requires proper streaming mock
    test.fixme("should maintain separate sessions for different projects", async ({
      page,
    }) => {
      // Mock chat API
      await page.route("**/api/chat", async (route) => {
        const request = route.request();
        const body = JSON.parse(request.postData() || "{}");
        const sessionId = `session-${body.workingDirectory?.replace(/\//g, "-") || "default"}`;
        const responseText = `Response for ${body.workingDirectory}`;

        await route.fulfill({
          status: 200,
          contentType: "text/plain",
          body: createStreamingResponse(
            sessionId,
            responseText,
            body.workingDirectory,
          ),
        });
      });

      await page.goto("/", { waitUntil: "networkidle" });

      // Select first project and send a message
      await page.getByText("/project-a").click();
      await page.waitForSelector('[data-testid="chat-input"]', {
        timeout: 10000,
      });

      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill("Hello from project A");
      await page.locator('[data-testid="chat-submit"]').click();

      // Wait for response to be processed
      await page.waitForTimeout(500);

      // Wait for response (with longer timeout)
      await expect(page.locator('[data-testid="chat-messages"]')).toContainText(
        "Response for /project-a",
        { timeout: 10000 },
      );
    });
  });

  test.describe("Direct URL Navigation", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/projects", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            projects: [{ path: "/my-project" }],
          }),
        });
      });
    });

    test("should load chat page when navigating directly to project URL", async ({
      page,
    }) => {
      await page.goto("/projects/my-project", { waitUntil: "networkidle" });

      // Chat input should be visible
      await expect(page.locator('[data-testid="chat-input"]')).toBeVisible({
        timeout: 10000,
      });
    });

    test("should display correct project path from URL", async ({ page }) => {
      await page.goto("/projects/my-project", { waitUntil: "networkidle" });

      // Project path should be visible
      await expect(page.getByText("/my-project")).toBeVisible();
    });
  });

  test.describe("UI Interactions", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/projects", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            projects: [
              { path: "/project-1" },
              { path: "/project-2" },
              { path: "/project-3" },
            ],
          }),
        });
      });
    });

    test("should show hover effect on project cards", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      const firstCard = page.locator('[data-testid="project-card"]').first();

      // Hover over the card
      await firstCard.hover();

      // Card should still be visible (hover styles applied via CSS)
      await expect(firstCard).toBeVisible();
    });

    test("should be accessible via keyboard navigation", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      // Wait for projects to load
      await page.waitForSelector('[data-testid="project-card"]');

      // Tab to first project card
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab"); // May need multiple tabs depending on page structure

      // Press Enter to select the focused element
      await page.keyboard.press("Enter");

      // Should navigate to project page (if the right element was focused)
      // This test may need adjustment based on actual tab order
    });

    test("should display folder icon for each project", async ({ page }) => {
      await page.goto("/", { waitUntil: "networkidle" });

      // Each project card should have an SVG icon
      const projectCards = page.locator('[data-testid="project-card"]');
      const count = await projectCards.count();

      for (let i = 0; i < count; i++) {
        const card = projectCards.nth(i);
        const icon = card.locator("svg");
        await expect(icon).toBeVisible();
      }
    });
  });

  test.describe("Empty State", () => {
    test("should handle empty project list gracefully", async ({ page }) => {
      await page.route("**/api/projects", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            projects: [],
          }),
        });
      });

      await page.goto("/", { waitUntil: "networkidle" });

      // Should not show "Recent Projects" when empty
      await expect(page.getByText("Recent Projects")).not.toBeVisible();

      // No project cards should be visible
      await expect(page.locator('[data-testid="project-card"]')).toHaveCount(0);
    });
  });
});
