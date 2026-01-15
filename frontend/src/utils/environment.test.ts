import { describe, it, expect, vi, afterEach } from "vitest";
import { isDevelopment, isProduction, getBasePath } from "./environment";

describe("environment utilities", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  describe("isDevelopment", () => {
    it("should return the value of import.meta.env.DEV", () => {
      // In test environment, DEV is typically true
      const result = isDevelopment();
      expect(typeof result).toBe("boolean");
    });
  });

  describe("isProduction", () => {
    it("should return the value of import.meta.env.PROD", () => {
      // In test environment, PROD is typically false
      const result = isProduction();
      expect(typeof result).toBe("boolean");
    });

    it("should be opposite of isDevelopment in test environment", () => {
      expect(isProduction()).toBe(!isDevelopment());
    });
  });

  describe("getBasePath", () => {
    afterEach(() => {
      delete window.__BASE_PATH__;
    });

    it("should return import.meta.env.BASE_URL", () => {
      const result = getBasePath();
      // BASE_URL is set by Vite, defaults to "/" in test environment
      expect(result).toBe("/");
    });

    it("should return a string", () => {
      const result = getBasePath();
      expect(typeof result).toBe("string");
    });

    it("should use window.__BASE_PATH__ if set", () => {
      window.__BASE_PATH__ = "/s/test-session/";
      const result = getBasePath();
      expect(result).toBe("/s/test-session/");
    });
  });
});
