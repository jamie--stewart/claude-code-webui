/**
 * Integration tests for Hono API routes
 *
 * These tests hit the actual Hono application routes to verify
 * end-to-end behavior including middleware and routing.
 */
import { describe, it, expect, vi, beforeEach } from "vitest";
import { Hono } from "hono";
import { handleAbortRequest } from "./abort";
import { handleProjectsRequest } from "./projects";
import { handleHistoriesRequest } from "./histories";
import { handleConversationRequest } from "./conversations";

// Hoisted mocks for dependencies
const mocks = vi.hoisted(() => ({
  // Logger mocks
  logDebug: vi.fn(),
  logError: vi.fn(),
  // FS mocks
  readTextFile: vi.fn(),
  stat: vi.fn(),
  // OS mocks
  getHomeDir: vi.fn(),
  // Path utils mocks
  validateEncodedProjectName: vi.fn(),
  getEncodedProjectName: vi.fn(),
  // History mocks
  parseAllHistoryFiles: vi.fn(),
  groupConversations: vi.fn(),
  loadConversation: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
  logger: {
    api: { debug: mocks.logDebug, error: mocks.logError },
    history: { debug: mocks.logDebug, error: mocks.logError },
  },
}));

vi.mock("../utils/fs", () => ({
  readTextFile: mocks.readTextFile,
  stat: mocks.stat,
}));

vi.mock("../utils/os", () => ({
  getHomeDir: mocks.getHomeDir,
}));

vi.mock("../history/pathUtils", () => ({
  validateEncodedProjectName: mocks.validateEncodedProjectName,
  getEncodedProjectName: mocks.getEncodedProjectName,
}));

vi.mock("../history/parser", () => ({
  parseAllHistoryFiles: mocks.parseAllHistoryFiles,
}));

vi.mock("../history/grouping", () => ({
  groupConversations: mocks.groupConversations,
}));

vi.mock("../history/conversationLoader", () => ({
  loadConversation: mocks.loadConversation,
}));

/**
 * Creates a test Hono app with all routes configured
 */
function createTestApp() {
  const app = new Hono();
  const requestAbortControllers = new Map<string, AbortController>();

  // Configure routes matching the real app
  app.get("/api/projects", (c) => handleProjectsRequest(c));
  app.get("/api/projects/:encodedProjectName/histories", (c) =>
    handleHistoriesRequest(c),
  );
  app.get("/api/projects/:encodedProjectName/histories/:sessionId", (c) =>
    handleConversationRequest(c),
  );
  app.post("/api/abort/:requestId", (c) =>
    handleAbortRequest(c, requestAbortControllers),
  );

  return { app, requestAbortControllers };
}

describe("Integration: API Routes", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("GET /api/projects", () => {
    it("should return projects list via route", async () => {
      const { app } = createTestApp();
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.readTextFile.mockResolvedValue(
        JSON.stringify({
          projects: { "/path/to/project": {} },
        }),
      );
      mocks.getEncodedProjectName.mockResolvedValue("encoded-project");

      const res = await app.request("/api/projects");
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.projects).toHaveLength(1);
      expect(json.projects[0]).toEqual({
        path: "/path/to/project",
        encodedName: "encoded-project",
      });
    });

    it("should return 500 when home directory not found", async () => {
      const { app } = createTestApp();
      mocks.getHomeDir.mockReturnValue(null);

      const res = await app.request("/api/projects");
      const json = await res.json();

      expect(res.status).toBe(500);
      expect(json.error).toBe("Home directory not found");
    });
  });

  describe("GET /api/projects/:encodedProjectName/histories", () => {
    it("should return histories for valid project", async () => {
      const { app } = createTestApp();
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.stat.mockResolvedValue({ isDirectory: true });
      mocks.parseAllHistoryFiles.mockResolvedValue([]);
      mocks.groupConversations.mockReturnValue([
        { sessionId: "session1", messageCount: 5 },
      ]);

      const res = await app.request("/api/projects/my-project/histories");
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.conversations).toHaveLength(1);
    });

    it("should return 400 for invalid project name", async () => {
      const { app } = createTestApp();
      mocks.validateEncodedProjectName.mockReturnValue(false);

      const res = await app.request("/api/projects/invalid%20name/histories");
      const json = await res.json();

      expect(res.status).toBe(400);
      expect(json.error).toBe("Invalid encoded project name");
    });

    it("should return 404 for non-existent project", async () => {
      const { app } = createTestApp();
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.stat.mockRejectedValue(new Error("No such file or directory"));

      const res = await app.request("/api/projects/nonexistent/histories");
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe("Project not found");
    });
  });

  describe("GET /api/projects/:encodedProjectName/histories/:sessionId", () => {
    it("should return conversation for valid session", async () => {
      const { app } = createTestApp();
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.loadConversation.mockResolvedValue({
        sessionId: "session-123",
        messages: [{ type: "user", content: "Hello" }],
      });

      const res = await app.request(
        "/api/projects/my-project/histories/session-123",
      );
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.sessionId).toBe("session-123");
      expect(json.messages).toHaveLength(1);
    });

    it("should return 404 for non-existent session", async () => {
      const { app } = createTestApp();
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.loadConversation.mockResolvedValue(null);

      const res = await app.request(
        "/api/projects/my-project/histories/nonexistent",
      );
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe("Conversation not found");
    });
  });

  describe("POST /api/abort/:requestId", () => {
    it("should abort request via route", async () => {
      const { app, requestAbortControllers } = createTestApp();
      const mockAbort = vi.fn();
      requestAbortControllers.set("req-123", {
        abort: mockAbort,
      } as unknown as AbortController);

      const res = await app.request("/api/abort/req-123", { method: "POST" });
      const json = await res.json();

      expect(res.status).toBe(200);
      expect(json.success).toBe(true);
      expect(mockAbort).toHaveBeenCalled();
      expect(requestAbortControllers.has("req-123")).toBe(false);
    });

    it("should return 404 for non-existent request", async () => {
      const { app } = createTestApp();

      const res = await app.request("/api/abort/nonexistent", {
        method: "POST",
      });
      const json = await res.json();

      expect(res.status).toBe(404);
      expect(json.error).toBe("Request not found or already completed");
    });
  });

  describe("Route parameter extraction", () => {
    it("should correctly extract URL-encoded project names", async () => {
      const { app } = createTestApp();
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.getHomeDir.mockReturnValue("/home/user");
      mocks.stat.mockResolvedValue({ isDirectory: true });
      mocks.parseAllHistoryFiles.mockResolvedValue([]);
      mocks.groupConversations.mockReturnValue([]);

      await app.request("/api/projects/my%2Fproject%2Fpath/histories");

      expect(mocks.stat).toHaveBeenCalledWith(
        expect.stringContaining("my/project/path"),
      );
    });

    it("should handle special characters in session IDs", async () => {
      const { app } = createTestApp();
      mocks.validateEncodedProjectName.mockReturnValue(true);
      mocks.loadConversation.mockResolvedValue({
        sessionId: "session-with-special-chars",
        messages: [],
      });

      const res = await app.request(
        "/api/projects/project/histories/session%2Dwith%2Dspecial%2Dchars",
      );

      expect(res.status).toBe(200);
    });
  });
});
