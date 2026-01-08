import { test, expect } from "@playwright/test";

test.describe("Slash Command Completions", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a project chat page
    // Note: This assumes the app is running and has at least one project
    await page.goto("/");

    // Wait for the page to load
    await page.waitForLoadState("networkidle");

    // If we're on project selection, click the first project
    const projectLink = page.locator('[data-testid="project-link"]').first();
    if (await projectLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projectLink.click();
      await page.waitForLoadState("networkidle");
    }
  });

  test("should show dropdown when typing /", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: "visible" });

    // Type "/" to trigger completions
    await chatInput.fill("/");

    // Wait for dropdown to appear
    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // Should show some completion items
    const options = dropdown.locator('[role="option"]');
    await expect(options.first()).toBeVisible();
  });

  test("should filter completions as user types", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: "visible" });

    // Type "/he" to filter to help-related commands
    await chatInput.fill("/he");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // Should show filtered results containing "he"
    const helpOption = dropdown.locator('[role="option"]', {
      hasText: "/help",
    });
    await expect(helpOption).toBeVisible();
  });

  test("should navigate with arrow keys", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: "visible" });

    await chatInput.fill("/");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // First item should be selected initially
    const options = dropdown.locator('[role="option"]');
    await expect(options.first()).toHaveAttribute("aria-selected", "true");

    // Press ArrowDown to move selection
    await chatInput.press("ArrowDown");

    // Second item should now be selected
    await expect(options.nth(1)).toHaveAttribute("aria-selected", "true");
    await expect(options.first()).toHaveAttribute("aria-selected", "false");

    // Press ArrowUp to move back
    await chatInput.press("ArrowUp");
    await expect(options.first()).toHaveAttribute("aria-selected", "true");
  });

  test("should insert completion on Enter", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: "visible" });

    // Type "/" and wait for dropdown
    await chatInput.fill("/");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // Get the first option text
    const firstOption = dropdown.locator('[role="option"]').first();
    const optionText = await firstOption.textContent();

    // Press Enter to select
    await chatInput.press("Enter");

    // Dropdown should close
    await expect(dropdown).not.toBeVisible();

    // Input should contain the selected command with a space
    const inputValue = await chatInput.inputValue();
    expect(inputValue).toContain(optionText?.trim());
    expect(inputValue.endsWith(" ")).toBe(true);
  });

  test("should close dropdown on Escape", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: "visible" });

    await chatInput.fill("/");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // Press Escape to close
    await chatInput.press("Escape");

    // Dropdown should close
    await expect(dropdown).not.toBeVisible();

    // Input should still have the original text
    await expect(chatInput).toHaveValue("/");
  });

  test("should insert completion on click", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: "visible" });

    await chatInput.fill("/");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // Click on an option
    const helpOption = dropdown.locator('[role="option"]', {
      hasText: "/help",
    });
    if (await helpOption.isVisible().catch(() => false)) {
      await helpOption.click();

      // Dropdown should close
      await expect(dropdown).not.toBeVisible();

      // Input should contain the selected command
      await expect(chatInput).toHaveValue(/\/help\s/);
    }
  });

  test("should show dropdown after space in middle of text", async ({
    page,
  }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: "visible" });

    // Type some text then a slash
    await chatInput.fill("hello /");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');
    await expect(dropdown).toBeVisible({ timeout: 2000 });
  });

  test("should not show dropdown for / in middle of word", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: "visible" });

    // Type a path-like string where / is not a trigger
    await chatInput.fill("path/to/file");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');

    // Dropdown should not appear
    await expect(dropdown).not.toBeVisible({ timeout: 1000 });
  });

  test("should close dropdown when no matches", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: "visible" });

    // Type a command that doesn't exist
    await chatInput.fill("/xyz123nonexistent");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');

    // Dropdown should not be visible when there are no matches
    await expect(dropdown).not.toBeVisible({ timeout: 1000 });
  });

  test("should update selection on mouse hover", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: "visible" });

    await chatInput.fill("/");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    const options = dropdown.locator('[role="option"]');
    const secondOption = options.nth(1);

    // Hover over second option
    await secondOption.hover();

    // Second option should become selected
    await expect(secondOption).toHaveAttribute("aria-selected", "true");
  });
});

test.describe("Slash Command Completions - Mobile", () => {
  test.use({
    viewport: { width: 375, height: 667 },
    hasTouch: true,
    isMobile: true,
  });

  test("should work with touch on mobile", async ({ page }) => {
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // If we're on project selection, tap the first project
    const projectLink = page.locator('[data-testid="project-link"]').first();
    if (await projectLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projectLink.tap();
      await page.waitForLoadState("networkidle");
    }

    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: "visible" });

    // Focus and type (simulating mobile keyboard)
    await chatInput.tap();
    await chatInput.fill("/");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // Tap on an option
    const firstOption = dropdown.locator('[role="option"]').first();
    await firstOption.tap();

    // Dropdown should close and input should have the completion
    await expect(dropdown).not.toBeVisible();
    const inputValue = await chatInput.inputValue();
    expect(inputValue.length).toBeGreaterThan(1);
  });
});
