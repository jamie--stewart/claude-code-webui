import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { Hono } from "hono";
import { handleMentionsRequest } from "./mentions.ts";

// Mock the fs module
vi.mock("../utils/fs.ts", () => ({
  exists: vi.fn(),
  stat: vi.fn(),
  readDir: vi.fn(),
}));

// Import mocked modules
import { exists, stat, readDir } from "../utils/fs.ts";

const mockedExists = vi.mocked(exists);
const mockedStat = vi.mocked(stat);
const mockedReadDir = vi.mocked(readDir);

describe("handleMentionsRequest", () => {
  let app: Hono;

  beforeEach(() => {
    app = new Hono();
    app.get("/api/mentions", (c) => handleMentionsRequest(c));
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("parameter validation", () => {
    it("returns 400 if cwd parameter is missing", async () => {
      const response = await app.request("/api/mentions");

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Missing required 'cwd' parameter");
    });

    it("returns 404 if directory does not exist", async () => {
      mockedExists.mockResolvedValue(false);

      const response = await app.request("/api/mentions?cwd=/nonexistent");

      expect(response.status).toBe(404);
      const body = await response.json();
      expect(body.error).toBe("Directory not found");
    });

    it("returns 400 if path is not a directory", async () => {
      mockedExists.mockResolvedValue(true);
      mockedStat.mockResolvedValue({
        isDirectory: false,
        isFile: true,
        isSymlink: false,
        size: 100,
        mtime: new Date(),
      });

      const response = await app.request("/api/mentions?cwd=/some/file.txt");

      expect(response.status).toBe(400);
      const body = await response.json();
      expect(body.error).toBe("Path is not a directory");
    });
  });

  describe("file listing", () => {
    beforeEach(() => {
      mockedExists.mockResolvedValue(true);
      mockedStat.mockResolvedValue({
        isDirectory: true,
        isFile: false,
        isSymlink: false,
        size: 0,
        mtime: new Date(),
      });
    });

    it("returns empty items for empty directory", async () => {
      mockedReadDir.mockImplementation(async function* () {
        // Empty generator
      });

      const response = await app.request("/api/mentions?cwd=/project");

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.items).toEqual([]);
      expect(body.truncated).toBe(false);
    });

    it("returns files and directories", async () => {
      // Mock only returns items for root path, empty for subdirectories
      mockedReadDir.mockImplementation(async function* (path: string) {
        if (path === "/project") {
          yield {
            name: "src",
            isFile: false,
            isDirectory: true,
            isSymlink: false,
          };
          yield {
            name: "README.md",
            isFile: true,
            isDirectory: false,
            isSymlink: false,
          };
          yield {
            name: "package.json",
            isFile: true,
            isDirectory: false,
            isSymlink: false,
          };
        }
        // Empty generator for subdirectories
      });

      const response = await app.request("/api/mentions?cwd=/project");

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.items).toHaveLength(3);
      expect(body.items).toContainEqual({
        type: "directory",
        value: "src",
        displayText: "src",
        path: "src",
      });
      expect(body.items).toContainEqual({
        type: "file",
        value: "README.md",
        displayText: "README.md",
        path: "README.md",
      });
    });

    it("filters hidden files", async () => {
      mockedReadDir.mockImplementation(async function* (path: string) {
        if (path === "/project") {
          yield {
            name: ".git",
            isFile: false,
            isDirectory: true,
            isSymlink: false,
          };
          yield {
            name: ".hidden",
            isFile: true,
            isDirectory: false,
            isSymlink: false,
          };
          yield {
            name: "visible.txt",
            isFile: true,
            isDirectory: false,
            isSymlink: false,
          };
        }
      });

      const response = await app.request("/api/mentions?cwd=/project");

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.items).toHaveLength(1);
      expect(body.items[0].displayText).toBe("visible.txt");
    });

    it("includes .env files", async () => {
      mockedReadDir.mockImplementation(async function* (path: string) {
        if (path === "/project") {
          yield {
            name: ".env",
            isFile: true,
            isDirectory: false,
            isSymlink: false,
          };
          yield {
            name: ".envrc",
            isFile: true,
            isDirectory: false,
            isSymlink: false,
          };
        }
      });

      const response = await app.request("/api/mentions?cwd=/project");

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.items).toHaveLength(2);
    });

    it("skips ignored directories like node_modules", async () => {
      mockedReadDir.mockImplementation(async function* (path: string) {
        if (path === "/project") {
          yield {
            name: "node_modules",
            isFile: false,
            isDirectory: true,
            isSymlink: false,
          };
          yield {
            name: "src",
            isFile: false,
            isDirectory: true,
            isSymlink: false,
          };
        }
        // Empty for all subdirectories
      });

      const response = await app.request("/api/mentions?cwd=/project");

      expect(response.status).toBe(200);
      const body = await response.json();
      // node_modules should be skipped entirely (not included in results)
      expect(body.items).toHaveLength(1);
      expect(body.items[0].displayText).toBe("src");
    });
  });

  describe("query filtering", () => {
    beforeEach(() => {
      mockedExists.mockResolvedValue(true);
      mockedStat.mockResolvedValue({
        isDirectory: true,
        isFile: false,
        isSymlink: false,
        size: 0,
        mtime: new Date(),
      });
      mockedReadDir.mockImplementation(async function* (path: string) {
        if (path === "/project") {
          yield {
            name: "index.ts",
            isFile: true,
            isDirectory: false,
            isSymlink: false,
          };
          yield {
            name: "index.test.ts",
            isFile: true,
            isDirectory: false,
            isSymlink: false,
          };
          yield {
            name: "utils.ts",
            isFile: true,
            isDirectory: false,
            isSymlink: false,
          };
          yield {
            name: "README.md",
            isFile: true,
            isDirectory: false,
            isSymlink: false,
          };
        }
      });
    });

    it("filters by query parameter", async () => {
      const response = await app.request(
        "/api/mentions?cwd=/project&query=index",
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.items).toHaveLength(2);
      expect(
        body.items.every((item: { path: string }) =>
          item.path.includes("index"),
        ),
      ).toBe(true);
    });

    it("filters case-insensitively", async () => {
      const response = await app.request(
        "/api/mentions?cwd=/project&query=INDEX",
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.items).toHaveLength(2);
    });

    it("sorts exact matches first", async () => {
      mockedReadDir.mockImplementation(async function* (path: string) {
        if (path === "/project") {
          yield {
            name: "utils.ts",
            isFile: true,
            isDirectory: false,
            isSymlink: false,
          };
          yield {
            name: "util-helper.ts",
            isFile: true,
            isDirectory: false,
            isSymlink: false,
          };
          yield {
            name: "utils",
            isFile: false,
            isDirectory: true,
            isSymlink: false,
          };
        }
      });

      const response = await app.request(
        "/api/mentions?cwd=/project&query=utils",
      );

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.items).toHaveLength(2);
      // Shorter path (utils) should come before utils.ts
      expect(body.items[0].displayText).toBe("utils");
    });

    it("returns all items when no query provided", async () => {
      const response = await app.request("/api/mentions?cwd=/project");

      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.items).toHaveLength(4);
    });
  });

  describe("error handling", () => {
    it("handles directory read errors gracefully", async () => {
      mockedExists.mockResolvedValue(true);
      mockedStat.mockResolvedValue({
        isDirectory: true,
        isFile: false,
        isSymlink: false,
        size: 0,
        mtime: new Date(),
      });
      mockedReadDir.mockImplementation(async function* () {
        throw new Error("Permission denied");
      });

      const response = await app.request("/api/mentions?cwd=/project");

      // Should return empty results, not error
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.items).toEqual([]);
    });
  });
});
