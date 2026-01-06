import { test, expect } from "@playwright/test";
import {
  setupProjectsMock,
  setupProjectsLoadingMock,
  setupProjectsErrorMock,
  setupChatMock,
  navigateToChatPage,
  sendMessage,
  createStreamingResponse,
  createAskUserQuestionResponse,
  createPlanModeResponse,
  MOCK_PROJECTS,
} from "./helpers/visual-test-helpers";

/**
 * Visual Snapshot Tests
 *
 * These tests capture screenshots at key UI states to detect visual regressions.
 * Screenshots are captured at both desktop (1280x720) and mobile (375x667) breakpoints.
 *
 * To update snapshots after intentional UI changes:
 *   npx playwright test visual-snapshots --update-snapshots
 */

test.describe("Visual Snapshots", () => {
  // ============================================
  // PROJECT SELECTION PAGE
  // ============================================
  test.describe("Project Selection Page", () => {
    test("empty state - no projects", async ({ page }) => {
      await setupProjectsMock(page, []);
      await page.goto("/", { waitUntil: "networkidle" });

      await expect(page).toHaveScreenshot("project-selection-empty.png", {
        fullPage: true,
      });
    });

    test("with projects list", async ({ page }) => {
      await setupProjectsMock(page, MOCK_PROJECTS);
      await page.goto("/", { waitUntil: "networkidle" });

      // Wait for projects to render
      await page.waitForSelector('[data-testid="project-card"]', {
        timeout: 10000,
      });

      await expect(page).toHaveScreenshot(
        "project-selection-with-projects.png",
        {
          fullPage: true,
        },
      );
    });

    test("loading state", async ({ page }) => {
      await setupProjectsLoadingMock(page, 30000); // Long delay to capture loading
      await page.goto("/");

      // Wait for loading indicator to appear
      await expect(page.getByText("Loading projects...")).toBeVisible();

      await expect(page).toHaveScreenshot("project-selection-loading.png", {
        fullPage: true,
      });
    });

    test("error state", async ({ page }) => {
      await setupProjectsErrorMock(page);
      await page.goto("/", { waitUntil: "networkidle" });

      // Wait for error to display
      await expect(page.getByText(/Error:/)).toBeVisible();

      await expect(page).toHaveScreenshot("project-selection-error.png", {
        fullPage: true,
      });
    });
  });

  // ============================================
  // CHAT PAGE
  // ============================================
  test.describe("Chat Page", () => {
    test.beforeEach(async ({ page }) => {
      await setupProjectsMock(page);
    });

    test("empty state - no messages", async ({ page }) => {
      await navigateToChatPage(page);

      // Verify empty state message is visible
      await expect(
        page.getByText("Start a conversation with Claude"),
      ).toBeVisible();

      await expect(page).toHaveScreenshot("chat-empty.png", {
        fullPage: true,
      });
    });

    test("with user and assistant messages", async ({ page }) => {
      const response = createStreamingResponse({
        assistantText:
          "Hello! I'm Claude, an AI assistant. I can help you with coding tasks, answer questions, and more. What would you like to work on today?",
      });

      await setupChatMock(page, response);
      await navigateToChatPage(page);
      await sendMessage(page, "Hello Claude, can you help me with my project?");

      // Wait for messages to render
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot("chat-with-messages.png", {
        fullPage: true,
      });
    });

    test("with code block in message", async ({ page }) => {
      const response = createStreamingResponse({
        assistantText: "Here's an example function that calculates factorial:",
        includeCodeBlock: true,
      });

      await setupChatMock(page, response);
      await navigateToChatPage(page);
      await sendMessage(page, "Show me a code example");

      // Wait for code block to render with syntax highlighting
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot("chat-with-code-block.png", {
        fullPage: true,
      });
    });

    test("loading state - waiting for response", async ({ page }) => {
      // Setup a delayed response to capture loading state
      await setupChatMock(
        page,
        createStreamingResponse({ assistantText: "Response" }),
        30000, // Long delay
      );
      await navigateToChatPage(page);

      // Send message
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill("Test message");
      await page.locator('[data-testid="chat-submit"]').click();

      // Wait for loading state to show
      await expect(page.locator('[data-testid="chat-abort"]')).toBeVisible({
        timeout: 5000,
      });

      await expect(page).toHaveScreenshot("chat-loading.png", {
        fullPage: true,
      });
    });

    test("with tool result - collapsed", async ({ page }) => {
      const response = createStreamingResponse({
        assistantText: "I've read the file. Here's what I found:",
        includeToolUse: true,
      });

      await setupChatMock(page, response);
      await navigateToChatPage(page);
      await sendMessage(page, "Read the index.ts file");

      // Wait for tool result to render
      await page.waitForTimeout(500);

      await expect(page).toHaveScreenshot("chat-with-tool-result.png", {
        fullPage: true,
      });
    });
  });

  // ============================================
  // PERMISSION DIALOGS
  // ============================================
  test.describe("Permission Dialogs", () => {
    test.beforeEach(async ({ page }) => {
      await setupProjectsMock(page);
    });

    test("AskUserQuestion panel - single question", async ({ page }) => {
      const response = createAskUserQuestionResponse({
        questions: [
          {
            question: "Which testing framework would you prefer?",
            options: [
              { label: "Jest", description: "Popular, well-documented" },
              { label: "Vitest", description: "Fast, Vite-native" },
              { label: "Mocha", description: "Flexible, mature" },
            ],
          },
        ],
      });

      await setupChatMock(page, response);
      await navigateToChatPage(page);

      // Send message but don't wait for Claude response (AskUserQuestion doesn't have text response)
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill("Help me set up testing");
      await page.locator('[data-testid="chat-submit"]').click();

      // Wait for question panel to appear
      await page.waitForSelector('[data-testid="ask-user-question-panel"]', {
        timeout: 15000,
      });

      // Small delay to let UI stabilize
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot("ask-user-question-single.png", {
        fullPage: true,
      });
    });

    test("AskUserQuestion panel - multi-select", async ({ page }) => {
      const response = createAskUserQuestionResponse({
        questions: [
          {
            question: "Which features do you want to enable?",
            options: [
              { label: "TypeScript", description: "Type safety" },
              { label: "ESLint", description: "Code linting" },
              { label: "Prettier", description: "Code formatting" },
              { label: "Husky", description: "Git hooks" },
            ],
            multiSelect: true,
          },
        ],
      });

      await setupChatMock(page, response);
      await navigateToChatPage(page);

      // Send message but don't wait for Claude response (AskUserQuestion doesn't have text response)
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill("Set up my project");
      await page.locator('[data-testid="chat-submit"]').click();

      // Wait for question panel to appear
      await page.waitForSelector('[data-testid="ask-user-question-panel"]', {
        timeout: 15000,
      });

      // Small delay to let UI stabilize
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot("ask-user-question-multiselect.png", {
        fullPage: true,
      });
    });

    test("Plan permission panel", async ({ page }) => {
      const response = createPlanModeResponse({});

      await setupChatMock(page, response);
      await navigateToChatPage(page);

      // Send message but don't wait for completion - plan mode triggers abort
      const chatInput = page.locator('[data-testid="chat-input"]');
      await chatInput.fill("Create a plan for the feature");
      await page.locator('[data-testid="chat-submit"]').click();

      // Wait for plan permission panel to appear
      await page.waitForSelector('[data-testid="plan-permission-panel"]', {
        timeout: 15000,
      });

      // Small delay to let UI stabilize
      await page.waitForTimeout(300);

      await expect(page).toHaveScreenshot("plan-permission-panel.png", {
        fullPage: true,
      });
    });
  });

  // ============================================
  // SETTINGS
  // ============================================
  test.describe("Settings", () => {
    test("settings modal open", async ({ page }) => {
      await setupProjectsMock(page);
      await page.goto("/", { waitUntil: "networkidle" });

      // Wait for page to load
      await page.waitForSelector('[data-testid="project-card"]', {
        timeout: 10000,
      });

      // Open settings modal
      await page.locator('[data-testid="settings-button"]').click();

      // Wait for modal to open
      await page.waitForSelector('[data-testid="settings-modal"]', {
        timeout: 5000,
      });

      await expect(page).toHaveScreenshot("settings-modal.png", {
        fullPage: true,
      });
    });
  });

  // ============================================
  // DEMO PAGE
  // ============================================
  test.describe("Demo Page", () => {
    test("demo page initial state", async ({ page }) => {
      await page.goto("/demo", { waitUntil: "networkidle" });

      // Wait for demo to initialize
      await expect(page.locator('[data-demo-active="true"]')).toBeVisible({
        timeout: 10000,
      });

      await expect(page).toHaveScreenshot("demo-page.png", {
        fullPage: true,
      });
    });
  });
});
