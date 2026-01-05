import { describe, it, expect, vi, beforeEach } from "vitest";
import { Context } from "hono";
import { handleAbortRequest } from "./abort";

// Mock logger
vi.mock("../utils/logger", () => ({
  logger: {
    api: {
      debug: vi.fn(),
      error: vi.fn(),
    },
  },
}));

describe("Abort Handler", () => {
  let mockContext: Context;
  let requestAbortControllers: Map<string, AbortController>;

  beforeEach(() => {
    requestAbortControllers = new Map();
    vi.clearAllMocks();
  });

  describe("handleAbortRequest", () => {
    it("should return 400 if request ID is missing", () => {
      mockContext = {
        req: {
          param: vi.fn().mockReturnValue(undefined),
        },
        json: vi.fn().mockImplementation((data, status) => ({
          data,
          status,
        })),
      } as any;

      const result = handleAbortRequest(mockContext, requestAbortControllers);

      expect(result).toEqual({
        data: { error: "Request ID is required" },
        status: 400,
      });
    });

    it("should return 404 if request ID is not found in controllers map", () => {
      mockContext = {
        req: {
          param: vi.fn().mockReturnValue("non-existent-id"),
        },
        json: vi.fn().mockImplementation((data, status) => ({
          data,
          status,
        })),
      } as any;

      const result = handleAbortRequest(mockContext, requestAbortControllers);

      expect(result).toEqual({
        data: { error: "Request not found or already completed" },
        status: 404,
      });
    });

    it("should abort the request and return success when valid request ID is provided", () => {
      const mockAbort = vi.fn();
      const abortController = {
        abort: mockAbort,
      } as unknown as AbortController;
      requestAbortControllers.set("test-request-id", abortController);

      mockContext = {
        req: {
          param: vi.fn().mockReturnValue("test-request-id"),
        },
        json: vi.fn().mockImplementation((data, status) => ({
          data,
          status,
        })),
      } as any;

      const result = handleAbortRequest(mockContext, requestAbortControllers);

      expect(mockAbort).toHaveBeenCalled();
      expect(requestAbortControllers.has("test-request-id")).toBe(false);
      expect(result).toEqual({
        data: { success: true, message: "Request aborted" },
        status: undefined,
      });
    });

    it("should remove the request ID from the controllers map after aborting", () => {
      const abortController = new AbortController();
      requestAbortControllers.set("test-request-id", abortController);

      expect(requestAbortControllers.size).toBe(1);

      mockContext = {
        req: {
          param: vi.fn().mockReturnValue("test-request-id"),
        },
        json: vi.fn().mockImplementation((data) => data),
      } as any;

      handleAbortRequest(mockContext, requestAbortControllers);

      expect(requestAbortControllers.size).toBe(0);
    });

    it("should handle multiple requests independently", () => {
      const abortController1 = {
        abort: vi.fn(),
      } as unknown as AbortController;
      const abortController2 = {
        abort: vi.fn(),
      } as unknown as AbortController;

      requestAbortControllers.set("request-1", abortController1);
      requestAbortControllers.set("request-2", abortController2);

      mockContext = {
        req: {
          param: vi.fn().mockReturnValue("request-1"),
        },
        json: vi.fn().mockImplementation((data) => data),
      } as any;

      handleAbortRequest(mockContext, requestAbortControllers);

      expect(abortController1.abort).toHaveBeenCalled();
      expect(abortController2.abort).not.toHaveBeenCalled();
      expect(requestAbortControllers.has("request-1")).toBe(false);
      expect(requestAbortControllers.has("request-2")).toBe(true);
    });
  });
});
