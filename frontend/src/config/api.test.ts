import { describe, it, expect, afterEach } from "vitest";
import {
  getApiUrl,
  getAbortUrl,
  getChatUrl,
  getProjectsUrl,
  getHistoriesUrl,
  getConversationUrl,
  getMentionsUrl,
} from "./api";

describe("API configuration", () => {
  afterEach(() => {
    delete window.__BASE_PATH__;
  });

  describe("getApiUrl", () => {
    it("should return endpoint as-is when base path is /", () => {
      const result = getApiUrl("/api/test");
      expect(result).toBe("/api/test");
    });

    it("should prepend base path to endpoint", () => {
      window.__BASE_PATH__ = "/s/session-123/";
      const result = getApiUrl("/api/test");
      expect(result).toBe("/s/session-123/api/test");
    });

    it("should handle base path without trailing slash", () => {
      window.__BASE_PATH__ = "/s/session-123";
      const result = getApiUrl("/api/test");
      expect(result).toBe("/s/session-123/api/test");
    });
  });

  describe("getChatUrl", () => {
    it("should return /api/chat by default", () => {
      const result = getChatUrl();
      expect(result).toBe("/api/chat");
    });

    it("should prepend base path", () => {
      window.__BASE_PATH__ = "/s/abc/";
      const result = getChatUrl();
      expect(result).toBe("/s/abc/api/chat");
    });
  });

  describe("getProjectsUrl", () => {
    it("should return /api/projects by default", () => {
      const result = getProjectsUrl();
      expect(result).toBe("/api/projects");
    });

    it("should prepend base path", () => {
      window.__BASE_PATH__ = "/s/abc/";
      const result = getProjectsUrl();
      expect(result).toBe("/s/abc/api/projects");
    });
  });

  describe("getAbortUrl", () => {
    it("should return /api/abort/:requestId by default", () => {
      const result = getAbortUrl("req-123");
      expect(result).toBe("/api/abort/req-123");
    });

    it("should prepend base path", () => {
      window.__BASE_PATH__ = "/s/abc/";
      const result = getAbortUrl("req-123");
      expect(result).toBe("/s/abc/api/abort/req-123");
    });
  });

  describe("getHistoriesUrl", () => {
    it("should encode project path and return histories URL", () => {
      const result = getHistoriesUrl("/home/user/project");
      expect(result).toBe("/api/projects/%2Fhome%2Fuser%2Fproject/histories");
    });

    it("should prepend base path", () => {
      window.__BASE_PATH__ = "/s/abc/";
      const result = getHistoriesUrl("/home/user/project");
      expect(result).toBe(
        "/s/abc/api/projects/%2Fhome%2Fuser%2Fproject/histories",
      );
    });
  });

  describe("getConversationUrl", () => {
    it("should return conversation URL with encoded project and session", () => {
      const result = getConversationUrl("encoded-project", "session-123");
      expect(result).toBe(
        "/api/projects/encoded-project/histories/session-123",
      );
    });

    it("should prepend base path", () => {
      window.__BASE_PATH__ = "/s/abc/";
      const result = getConversationUrl("encoded-project", "session-123");
      expect(result).toBe(
        "/s/abc/api/projects/encoded-project/histories/session-123",
      );
    });
  });

  describe("getMentionsUrl", () => {
    it("should return mentions URL with cwd param", () => {
      const result = getMentionsUrl("/home/user", "");
      expect(result).toBe("/api/mentions?cwd=%2Fhome%2Fuser");
    });

    it("should include query param when provided", () => {
      const result = getMentionsUrl("/home/user", "test");
      expect(result).toBe("/api/mentions?cwd=%2Fhome%2Fuser&query=test");
    });

    it("should prepend base path", () => {
      window.__BASE_PATH__ = "/s/abc/";
      const result = getMentionsUrl("/home/user", "");
      expect(result).toBe("/s/abc/api/mentions?cwd=%2Fhome%2Fuser");
    });
  });
});
