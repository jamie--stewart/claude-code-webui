import { test, expect } from "@playwright/test";

test.describe("Slash Command Completions - Visual Snapshots", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to a project chat page
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // If we're on project selection, click the first project
    const projectLink = page.locator('[data-testid="project-link"]').first();
    if (await projectLink.isVisible({ timeout: 2000 }).catch(() => false)) {
      await projectLink.click();
      await page.waitForLoadState("networkidle");
    }
  });

  test("dropdown with multiple items - light mode", async ({ page }) => {
    // Ensure light mode
    await page.evaluate(() => {
      document.documentElement.classList.remove("dark");
    });

    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: "visible" });

    // Type "/" to show dropdown
    await chatInput.fill("/");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // Wait for any animations to complete
    await page.waitForTimeout(300);

    // Take screenshot of the dropdown area
    await expect(dropdown).toHaveScreenshot("dropdown-light-mode.png");
  });

  test("dropdown with multiple items - dark mode", async ({ page }) => {
    // Enable dark mode
    await page.evaluate(() => {
      document.documentElement.classList.add("dark");
    });

    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: "visible" });

    // Type "/" to show dropdown
    await chatInput.fill("/");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // Wait for any animations to complete
    await page.waitForTimeout(300);

    // Take screenshot of the dropdown area
    await expect(dropdown).toHaveScreenshot("dropdown-dark-mode.png");
  });

  test("dropdown with selected item highlighted", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: "visible" });

    await chatInput.fill("/");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // Navigate down to highlight second item
    await chatInput.press("ArrowDown");
    await chatInput.press("ArrowDown");

    // Wait for highlight animation
    await page.waitForTimeout(200);

    // Take screenshot showing highlighted state
    await expect(dropdown).toHaveScreenshot("dropdown-highlighted-item.png");
  });

  test("dropdown with filtered results", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: "visible" });

    // Type "/co" to filter to commit, compact, config
    await chatInput.fill("/co");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // Wait for filter to apply
    await page.waitForTimeout(200);

    // Take screenshot of filtered results
    await expect(dropdown).toHaveScreenshot("dropdown-filtered.png");
  });

  test("full input area with dropdown open", async ({ page }) => {
    const chatInput = page.locator('[data-testid="chat-input"]');
    await chatInput.waitFor({ state: "visible" });

    await chatInput.fill("/");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // Wait for any animations
    await page.waitForTimeout(300);

    // Take screenshot of the entire input area including dropdown
    const inputContainer = chatInput.locator("../..");
    await expect(inputContainer).toHaveScreenshot(
      "input-area-with-dropdown.png",
    );
  });
});

test.describe("Slash Command Completions - Visual Snapshots (Mobile)", () => {
  test.use({
    viewport: { width: 375, height: 667 },
    hasTouch: true,
    isMobile: true,
  });

  test("mobile dropdown positioning", async ({ page }) => {
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

    await chatInput.tap();
    await chatInput.fill("/");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // Wait for any animations
    await page.waitForTimeout(300);

    // Take screenshot of mobile dropdown
    await expect(dropdown).toHaveScreenshot("dropdown-mobile.png");
  });

  test("mobile full viewport with dropdown", async ({ page }) => {
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

    await chatInput.tap();
    await chatInput.fill("/");

    const dropdown = page.locator('[role="listbox"][aria-label="Completions"]');
    await expect(dropdown).toBeVisible({ timeout: 2000 });

    // Wait for any animations
    await page.waitForTimeout(300);

    // Take full page screenshot on mobile
    await expect(page).toHaveScreenshot("mobile-full-page-dropdown.png", {
      fullPage: false,
    });
  });
});
