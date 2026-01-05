import { describe, it, expect, vi, beforeEach } from "vitest";
import { handleAbortRequest } from "./abort";
import { createMockContext } from "./test-utils";

// Hoisted mocks for clean module mocking
const mocks = vi.hoisted(() => ({
  logDebug: vi.fn(),
  logError: vi.fn(),
}));

vi.mock("../utils/logger", () => ({
  logger: {
    api: {
      debug: mocks.logDebug,
      error: mocks.logError,
    },
  },
}));

describe("Abort Handler", () => {
  let requestAbortControllers: Map<string, AbortController>;

  beforeEach(() => {
    requestAbortControllers = new Map();
    vi.clearAllMocks();
  });

  describe("handleAbortRequest", () => {
    it("should return 400 if request ID is missing", () => {
      const mockContext = createMockContext({
        params: { requestId: undefined },
      });

      const result = handleAbortRequest(mockContext, requestAbortControllers);

      expect(result).toEqual({
        data: { error: "Request ID is required" },
        status: 400,
      });
    });

    it("should return 404 if request ID is not found in controllers map", () => {
      const mockContext = createMockContext({
        params: { requestId: "non-existent-id" },
      });

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

      const mockContext = createMockContext({
        params: { requestId: "test-request-id" },
      });

      const result = handleAbortRequest(mockContext, requestAbortControllers);

      expect(mockAbort).toHaveBeenCalled();
      expect(requestAbortControllers.has("test-request-id")).toBe(false);
      expect(result).toEqual({
        data: { success: true, message: "Request aborted" },
        status: 200,
      });
    });

    it("should remove the request ID from the controllers map after aborting", () => {
      const abortController = new AbortController();
      requestAbortControllers.set("test-request-id", abortController);

      expect(requestAbortControllers.size).toBe(1);

      const mockContext = createMockContext({
        params: { requestId: "test-request-id" },
      });

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

      const mockContext = createMockContext({
        params: { requestId: "request-1" },
      });

      handleAbortRequest(mockContext, requestAbortControllers);

      expect(abortController1.abort).toHaveBeenCalled();
      expect(abortController2.abort).not.toHaveBeenCalled();
      expect(requestAbortControllers.has("request-1")).toBe(false);
      expect(requestAbortControllers.has("request-2")).toBe(true);
    });

    it("should handle concurrent abort requests for different IDs", () => {
      const abortController1 = { abort: vi.fn() } as unknown as AbortController;
      const abortController2 = { abort: vi.fn() } as unknown as AbortController;
      const abortController3 = { abort: vi.fn() } as unknown as AbortController;

      requestAbortControllers.set("request-1", abortController1);
      requestAbortControllers.set("request-2", abortController2);
      requestAbortControllers.set("request-3", abortController3);

      // Simulate concurrent abort requests
      const context1 = createMockContext({
        params: { requestId: "request-1" },
      });
      const context2 = createMockContext({
        params: { requestId: "request-3" },
      });

      const result1 = handleAbortRequest(context1, requestAbortControllers);
      const result2 = handleAbortRequest(context2, requestAbortControllers);

      expect(result1).toEqual({
        data: { success: true, message: "Request aborted" },
        status: 200,
      });
      expect(result2).toEqual({
        data: { success: true, message: "Request aborted" },
        status: 200,
      });

      expect(abortController1.abort).toHaveBeenCalled();
      expect(abortController2.abort).not.toHaveBeenCalled();
      expect(abortController3.abort).toHaveBeenCalled();

      expect(requestAbortControllers.size).toBe(1);
      expect(requestAbortControllers.has("request-2")).toBe(true);
    });

    it("should handle aborting the same request twice", () => {
      const abortController = { abort: vi.fn() } as unknown as AbortController;
      requestAbortControllers.set("request-1", abortController);

      const context1 = createMockContext({
        params: { requestId: "request-1" },
      });
      const context2 = createMockContext({
        params: { requestId: "request-1" },
      });

      const result1 = handleAbortRequest(context1, requestAbortControllers);
      const result2 = handleAbortRequest(context2, requestAbortControllers);

      expect(result1).toEqual({
        data: { success: true, message: "Request aborted" },
        status: 200,
      });
      expect(result2).toEqual({
        data: { error: "Request not found or already completed" },
        status: 404,
      });

      expect(abortController.abort).toHaveBeenCalledTimes(1);
    });

    it("should log abort attempts", () => {
      requestAbortControllers.set("test-id", {
        abort: vi.fn(),
      } as unknown as AbortController);

      const mockContext = createMockContext({
        params: { requestId: "test-id" },
      });

      handleAbortRequest(mockContext, requestAbortControllers);

      expect(mocks.logDebug).toHaveBeenCalledWith(
        "Abort attempt for request: test-id",
      );
      expect(mocks.logDebug).toHaveBeenCalledWith("Aborted request: test-id");
    });
  });
});
