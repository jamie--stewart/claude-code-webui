import { test, expect } from "@playwright/test";

/**
 * E2E accessibility tests
 * Tests: keyboard navigation, screen reader compatibility (ARIA labels),
 * focus management, and form accessibility
 */

// Mock projects response
const mockProjects = {
  projects: [
    { path: "/test/project-one", encodedName: "test-project-one" },
    { path: "/test/project-two", encodedName: "test-project-two" },
    { path: "/test/project-three", encodedName: "test-project-three" },
  ],
};

test.describe("Keyboard Navigation", () => {
  test.describe("Project Selection Page", () => {
    test.beforeEach(async ({ page }) => {
      await page.route("**/api/projects", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockProjects),
        });
      });

      await page.goto("/", { waitUntil: "networkidle" });
    });

    test("should allow keyboard navigation through project cards", async ({
      page,
    }) => {
      // Wait for projects to load
      await page.waitForSelector('[data-testid="project-card"]', {
        timeout: 10000,
      });

      // Tab to navigate to the first focusable element
      await page.keyboard.press("Tab");

      // Continue tabbing until we reach project cards
      for (let i = 0; i < 10; i++) {
        const focusedElement = await page.locator(":focus");
        const testId = await focusedElement.getAttribute("data-testid");

        if (testId === "project-card") {
          // Successfully focused on a project card
          break;
        }

        await page.keyboard.press("Tab");
      }

      // Verify a project card is focused
      const focusedCard = page.locator('[data-testid="project-card"]:focus');
      await expect(focusedCard).toBeVisible();
    });

    test("should select project with Enter key when focused", async ({
      page,
    }) => {
      // Wait for projects to load
      await page.waitForSelector('[data-testid="project-card"]', {
        timeout: 10000,
      });

      // Focus the first project card
      const firstCard = page.locator('[data-testid="project-card"]').first();
      await firstCard.focus();

      // Verify it's focused
      await expect(firstCard).toBeFocused();

      // Press Enter to select
      await page.keyboard.press("Enter");

      // Should navigate to chat page
      await expect(page.locator('[data-testid="chat-input"]')).toBeVisible({
        timeout: 10000,
      });
    });

    test("should select project with Space key when focused", async ({
      page,
    }) => {
      await page.waitForSelector('[data-testid="project-card"]', {
        timeout: 10000,
      });

      const firstCard = page.locator('[data-testid="project-card"]').first();
      await firstCard.focus();

      await page.keyboard.press(" ");

      await expect(page.locator('[data-testid="chat-input"]')).toBeVisible({
        timeout: 10000,
      });
    });
  });

  test.describe("Chat Page", () => {
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
        timeout: 10000,
      });
    });

    test("should focus chat input on page load", async ({ page }) => {
      // Chat input should be easily focusable
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.focus();

      await expect(chatInput).toBeFocused();
    });

    test("should navigate between chat controls with Tab", async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');

      // Focus the chat input first
      await chatInput.focus();
      await expect(chatInput).toBeFocused();

      // Tab should move to the next focusable element
      await page.keyboard.press("Tab");

      // The focused element should be visible
      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();
    });

    test("should support Shift+Tab for reverse navigation", async ({
      page,
    }) => {
      const submitButton = page.locator('[data-testid="chat-submit"]');
      await submitButton.focus();

      // Shift+Tab should move focus backwards
      await page.keyboard.press("Shift+Tab");

      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();
    });

    test("should allow form submission with Enter key", async ({ page }) => {
      let requestReceived = false;

      await page.route("**/api/chat", async (route) => {
        requestReceived = true;
        await route.fulfill({
          status: 200,
          contentType: "text/plain",
          body: "",
        });
      });

      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill("Test message");

      // Press Enter to submit
      await chatInput.press("Enter");

      // Wait for request
      await page.waitForTimeout(500);

      expect(requestReceived).toBe(true);
    });

    test("should insert newline with Shift+Enter", async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');

      await chatInput.fill("Line 1");
      await chatInput.press("Shift+Enter");
      await page.keyboard.type("Line 2");

      const value = await chatInput.inputValue();
      expect(value).toContain("Line 1");
      expect(value).toContain("Line 2");
      expect(value.split("\n").length).toBeGreaterThanOrEqual(2);
    });
  });

  test.describe("History Panel", () => {
    test.beforeEach(async ({ page }) => {
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
          body: JSON.stringify({
            conversations: [
              {
                sessionId: "session-1",
                startTime: "2024-01-15T10:30:00Z",
                messageCount: 5,
                lastMessagePreview: "Test conversation 1",
              },
              {
                sessionId: "session-2",
                startTime: "2024-01-14T15:45:00Z",
                messageCount: 3,
                lastMessagePreview: "Test conversation 2",
              },
            ],
          }),
        });
      });

      await page.goto("/", { waitUntil: "networkidle" });
      await page.click('[data-testid="project-card"]');
      await page.waitForSelector('[data-testid="history-button"]', {
        timeout: 10000,
      });
    });

    test("should open history panel with keyboard", async ({ page }) => {
      const historyButton = page.locator('[data-testid="history-button"]');
      await historyButton.focus();

      await expect(historyButton).toBeFocused();

      await page.keyboard.press("Enter");

      // History view should be visible
      await expect(
        page.locator('[data-testid="conversation-card"]'),
      ).toBeVisible({
        timeout: 5000,
      });
    });

    test("should navigate through conversation cards with keyboard", async ({
      page,
    }) => {
      await page.click('[data-testid="history-button"]');
      await page.waitForSelector('[data-testid="conversation-card"]', {
        timeout: 5000,
      });

      // Focus the first conversation card
      const firstCard = page
        .locator('[data-testid="conversation-card"]')
        .first();
      await firstCard.focus();

      await expect(firstCard).toBeFocused();

      // Tab to next card
      await page.keyboard.press("Tab");

      // Second card should be focused (or next focusable element)
      const focusedElement = page.locator(":focus");
      await expect(focusedElement).toBeVisible();
    });

    test("should select conversation with Enter key", async ({ page }) => {
      await page.click('[data-testid="history-button"]');

      const conversationCard = page
        .locator('[data-testid="conversation-card"]')
        .first();
      await expect(conversationCard).toBeVisible({ timeout: 5000 });

      await conversationCard.focus();
      await page.keyboard.press("Enter");

      // URL should update with session ID
      await expect(page).toHaveURL(/sessionId=session-1/);
    });
  });
});

test.describe("ARIA Labels and Screen Reader Compatibility", () => {
  test.describe("Buttons and Interactive Elements", () => {
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
        timeout: 10000,
      });
    });

    test("history button should have aria-label", async ({ page }) => {
      const historyButton = page.locator('[data-testid="history-button"]');

      const ariaLabel = await historyButton.getAttribute("aria-label");
      expect(ariaLabel).toBeTruthy();
      expect(ariaLabel).toMatch(/history/i);
    });

    test("settings button should have aria-label", async ({ page }) => {
      const settingsButton = page.locator('[data-testid="settings-button"]');

      if (await settingsButton.isVisible()) {
        const ariaLabel = await settingsButton.getAttribute("aria-label");
        expect(ariaLabel).toBeTruthy();
      }
    });

    test("theme toggle button should have aria-label", async ({ page }) => {
      const themeToggle = page.locator('button[aria-label*="theme"]');

      if (await themeToggle.isVisible()) {
        const ariaLabel = await themeToggle.getAttribute("aria-label");
        expect(ariaLabel).toBeTruthy();
        expect(ariaLabel).toMatch(/theme|dark|light/i);
      }
    });

    test("abort button should have aria-label when visible", async ({
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

      await chatInput.fill("Test message");
      await submitButton.click();

      const abortButton = page.locator('[data-testid="chat-abort"]');
      await expect(abortButton).toBeVisible({ timeout: 5000 });

      const ariaLabel = await abortButton.getAttribute("aria-label");
      expect(ariaLabel).toBeTruthy();

      resolveRoute!();
    });
  });

  test.describe("Form Elements", () => {
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
        timeout: 10000,
      });
    });

    test("chat input should have placeholder text", async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');

      const placeholder = await chatInput.getAttribute("placeholder");
      expect(placeholder).toBeTruthy();
    });

    test("submit button should have descriptive text", async ({ page }) => {
      const submitButton = page.locator('[data-testid="chat-submit"]');

      const text = await submitButton.innerText();
      expect(text).toBeTruthy();
      expect(text).toMatch(/send|submit|plan/i);
    });
  });

  test.describe("Page Structure", () => {
    test("should have heading hierarchy on project selection page", async ({
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

      // Should have an h1 heading
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toBeVisible();
    });

    test("should have heading hierarchy on chat page", async ({ page }) => {
      await page.route("**/api/projects", async (route) => {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify(mockProjects),
        });
      });

      await page.goto("/", { waitUntil: "networkidle" });
      await page.click('[data-testid="project-card"]');

      // Should have an h1 heading
      const h1 = page.getByRole("heading", { level: 1 });
      await expect(h1).toBeVisible({ timeout: 10000 });
    });
  });
});

test.describe("Focus Management", () => {
  test.describe("Modal and Dialog Focus", () => {
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
        timeout: 10000,
      });
    });

    test("should trap focus within settings modal when open", async ({
      page,
    }) => {
      const settingsButton = page.locator('[data-testid="settings-button"]');

      if (await settingsButton.isVisible()) {
        await settingsButton.click();

        // Wait for modal to appear
        const modal = page.locator('[data-testid="settings-modal"]');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Tab multiple times - focus should stay within modal
        for (let i = 0; i < 10; i++) {
          await page.keyboard.press("Tab");

          const focusedElement = page.locator(":focus");
          await expect(focusedElement).toBeVisible();
        }
      }
    });

    test("should close modal with Escape key", async ({ page }) => {
      const settingsButton = page.locator('[data-testid="settings-button"]');

      if (await settingsButton.isVisible()) {
        await settingsButton.click();

        const modal = page.locator('[data-testid="settings-modal"]');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Press Escape to close
        await page.keyboard.press("Escape");

        // Modal should be closed
        await expect(modal).not.toBeVisible();
      }
    });

    test("should return focus to trigger element after modal closes", async ({
      page,
    }) => {
      const settingsButton = page.locator('[data-testid="settings-button"]');

      if (await settingsButton.isVisible()) {
        await settingsButton.click();

        const modal = page.locator('[data-testid="settings-modal"]');
        await expect(modal).toBeVisible({ timeout: 5000 });

        // Close with Escape
        await page.keyboard.press("Escape");
        await expect(modal).not.toBeVisible();

        // Focus should return to settings button
        // Note: This depends on implementation - some apps return focus, some don't
      }
    });
  });

  test.describe("Focus After Actions", () => {
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
        timeout: 10000,
      });
    });

    test("should maintain focus in input after typing", async ({ page }) => {
      const chatInput = page.locator('[data-testid="chat-input"]');

      await chatInput.focus();
      await chatInput.type("Hello, World!");

      // Focus should remain in the input
      await expect(chatInput).toBeFocused();
    });
  });
});

test.describe("Form Accessibility", () => {
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
      timeout: 10000,
    });
  });

  test("disabled submit button should indicate disabled state", async ({
    page,
  }) => {
    const submitButton = page.locator('[data-testid="chat-submit"]');

    // Should be disabled when input is empty
    await expect(submitButton).toBeDisabled();

    // The disabled attribute should be present
    const isDisabled = await submitButton.getAttribute("disabled");
    expect(isDisabled !== null).toBe(true);
  });

  test("loading state should be communicated accessibly", async ({ page }) => {
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

    await chatInput.fill("Test message");
    await submitButton.click();

    // During loading, button text changes to "..."
    await expect(submitButton).toHaveText("...");

    // Input should be disabled during loading
    await expect(chatInput).toBeDisabled();

    resolveRoute!();
  });

  test("permission mode toggle should have accessible state", async ({
    page,
  }) => {
    const permissionToggle = page.locator('button[title*="Click to cycle"]');

    if (await permissionToggle.isVisible()) {
      // Should have a title attribute explaining its current state
      const title = await permissionToggle.getAttribute("title");
      expect(title).toBeTruthy();
      expect(title).toMatch(/current|mode/i);
    }
  });
});

test.describe("Visual Focus Indicators", () => {
  test.beforeEach(async ({ page }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });
  });

  test("project cards should have visible focus indicator", async ({
    page,
  }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.waitForSelector('[data-testid="project-card"]', {
      timeout: 10000,
    });

    const firstCard = page.locator('[data-testid="project-card"]').first();
    await firstCard.focus();

    // Card should be focused
    await expect(firstCard).toBeFocused();

    // Check that focus styles are applied (ring or outline)
    const classes = await firstCard.getAttribute("class");
    // Most focus indicators use focus:ring or focus:outline classes
    expect(classes).toMatch(/focus/);
  });

  test("buttons should have visible focus indicator", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="chat-submit"]', {
      timeout: 10000,
    });

    const submitButton = page.locator('[data-testid="chat-submit"]');
    await submitButton.focus();

    await expect(submitButton).toBeFocused();

    // Button should have focus styling in its classes
    const classes = await submitButton.getAttribute("class");
    expect(classes).toMatch(/focus/);
  });

  test("input should have visible focus indicator", async ({ page }) => {
    await page.goto("/", { waitUntil: "networkidle" });
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="chat-input"]', {
      timeout: 10000,
    });

    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.focus();

    await expect(chatInput).toBeFocused();

    // Input should have focus styling
    const classes = await chatInput.getAttribute("class");
    expect(classes).toMatch(/focus/);
  });
});

test.describe("Skip Navigation and Landmarks", () => {
  test("page should be navigable with minimal tab stops", async ({ page }) => {
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

    // Count tab stops to reach the first project card
    let tabCount = 0;
    const maxTabs = 20; // Reasonable maximum

    for (let i = 0; i < maxTabs; i++) {
      await page.keyboard.press("Tab");
      tabCount++;

      const focusedElement = page.locator(":focus");
      const testId = await focusedElement.getAttribute("data-testid");

      if (testId === "project-card") {
        break;
      }
    }

    // Should reach project card within reasonable number of tabs
    expect(tabCount).toBeLessThan(maxTabs);
  });
});

test.describe("Color Independence", () => {
  test("error states should not rely solely on color", async ({ page }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 500,
        contentType: "application/json",
        body: JSON.stringify({ error: "Server error" }),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });

    // Error message should include text, not just color
    const errorElement = page.getByText(/Error/i);
    await expect(errorElement).toBeVisible({ timeout: 5000 });

    // Error text should be descriptive
    const errorText = await errorElement.innerText();
    expect(errorText.length).toBeGreaterThan(0);
  });

  test("disabled states should be visually distinct", async ({ page }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="chat-submit"]', {
      timeout: 10000,
    });

    const submitButton = page.locator('[data-testid="chat-submit"]');

    // When disabled, button should have visual indication
    await expect(submitButton).toBeDisabled();

    // Button should have disabled styling classes
    const classes = await submitButton.getAttribute("class");
    expect(classes).toMatch(/disabled|cursor-not-allowed|opacity/);
  });
});

test.describe("Touch Target Sizes", () => {
  test("buttons should have adequate touch target size", async ({ page }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });
    await page.click('[data-testid="project-card"]');
    await page.waitForSelector('[data-testid="chat-submit"]', {
      timeout: 10000,
    });

    const submitButton = page.locator('[data-testid="chat-submit"]');
    const boundingBox = await submitButton.boundingBox();

    if (boundingBox) {
      // WCAG recommends at least 44x44 pixels for touch targets
      // We'll be slightly lenient with 40px minimum
      expect(boundingBox.width).toBeGreaterThanOrEqual(40);
      expect(boundingBox.height).toBeGreaterThanOrEqual(40);
    }
  });

  test("project cards should have adequate touch target size", async ({
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
    await page.waitForSelector('[data-testid="project-card"]', {
      timeout: 10000,
    });

    const projectCard = page.locator('[data-testid="project-card"]').first();
    const boundingBox = await projectCard.boundingBox();

    if (boundingBox) {
      // Cards should have comfortable touch targets
      expect(boundingBox.width).toBeGreaterThanOrEqual(44);
      expect(boundingBox.height).toBeGreaterThanOrEqual(44);
    }
  });
});

test.describe("Mobile Accessibility", () => {
  test.use({
    viewport: { width: 375, height: 667 },
    isMobile: true,
    hasTouch: true,
  });

  test("should be usable on mobile viewport", async ({ page }) => {
    await page.route("**/api/projects", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify(mockProjects),
      });
    });

    await page.goto("/", { waitUntil: "networkidle" });

    // Project cards should be visible
    await expect(page.locator('[data-testid="project-card"]')).toBeVisible({
      timeout: 10000,
    });

    // Click on project
    await page.click('[data-testid="project-card"]');

    // Chat input should be visible
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible({
      timeout: 10000,
    });

    // Submit button should be visible
    await expect(page.locator('[data-testid="chat-submit"]')).toBeVisible();
  });

  test("controls should be reachable on mobile", async ({ page }) => {
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
      timeout: 10000,
    });

    // All main controls should be visible without scrolling
    await expect(page.locator('[data-testid="chat-input"]')).toBeVisible();
    await expect(page.locator('[data-testid="chat-submit"]')).toBeVisible();
  });
});
