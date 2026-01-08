import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import {
  ErrorLogger,
  errorLogger,
  logDebug,
  logInfo,
  logWarn,
  logError,
  type LogContext,
  type LogLevel,
} from "./errorLogger";

describe("ErrorLogger", () => {
  let consoleSpy: {
    debug: ReturnType<typeof vi.spyOn>;
    info: ReturnType<typeof vi.spyOn>;
    warn: ReturnType<typeof vi.spyOn>;
    error: ReturnType<typeof vi.spyOn>;
  };

  beforeEach(() => {
    consoleSpy = {
      debug: vi.spyOn(console, "debug").mockImplementation(() => {}),
      info: vi.spyOn(console, "info").mockImplementation(() => {}),
      warn: vi.spyOn(console, "warn").mockImplementation(() => {}),
      error: vi.spyOn(console, "error").mockImplementation(() => {}),
    };
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe("ErrorLogger class", () => {
    it("should create an instance with default configuration", () => {
      const logger = new ErrorLogger();
      expect(logger.isEnabled()).toBe(true);
    });

    it("should respect enabled configuration", () => {
      const logger = new ErrorLogger({ enabled: false });
      expect(logger.isEnabled()).toBe(false);

      logger.error("test error");
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });

    it("should log error messages", () => {
      const logger = new ErrorLogger({ minLevel: "error" });
      logger.error("Test error message");

      expect(consoleSpy.error).toHaveBeenCalled();
      const call = consoleSpy.error.mock.calls[0][0] as string;
      expect(call).toContain("[ERROR]");
      expect(call).toContain("Test error message");
    });

    it("should log warn messages", () => {
      const logger = new ErrorLogger({ minLevel: "warn" });
      logger.warn("Test warning message");

      expect(consoleSpy.warn).toHaveBeenCalled();
      const call = consoleSpy.warn.mock.calls[0][0] as string;
      expect(call).toContain("[WARN]");
      expect(call).toContain("Test warning message");
    });

    it("should log info messages", () => {
      const logger = new ErrorLogger({ minLevel: "info" });
      logger.info("Test info message");

      expect(consoleSpy.info).toHaveBeenCalled();
      const call = consoleSpy.info.mock.calls[0][0] as string;
      expect(call).toContain("[INFO]");
      expect(call).toContain("Test info message");
    });

    it("should log debug messages", () => {
      const logger = new ErrorLogger({ minLevel: "debug" });
      logger.debug("Test debug message");

      expect(consoleSpy.debug).toHaveBeenCalled();
      const call = consoleSpy.debug.mock.calls[0][0] as string;
      expect(call).toContain("[DEBUG]");
      expect(call).toContain("Test debug message");
    });

    it("should filter messages below minimum level", () => {
      const logger = new ErrorLogger({ minLevel: "error" });

      logger.debug("debug message");
      logger.info("info message");
      logger.warn("warn message");
      logger.error("error message");

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).not.toHaveBeenCalled();
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it("should include context in log message", () => {
      const logger = new ErrorLogger({ minLevel: "error" });
      const context: LogContext = {
        component: "TestComponent",
        action: "testAction",
      };

      logger.error("Test error", undefined, context);

      const call = consoleSpy.error.mock.calls[0][0] as string;
      expect(call).toContain("[TestComponent:testAction]");
    });

    it("should include error details", () => {
      const logger = new ErrorLogger({ minLevel: "error", includeStack: true });
      const error = new Error("Test error");

      logger.error("An error occurred", error);

      expect(consoleSpy.error).toHaveBeenCalled();
      // The error object is passed as second argument
      const errorArg = consoleSpy.error.mock.calls[0][1] as {
        name: string;
        message: string;
      };
      expect(errorArg).toBeDefined();
      expect(errorArg.name).toBe("Error");
      expect(errorArg.message).toBe("Test error");
    });

    it("should handle non-Error objects in error field", () => {
      const logger = new ErrorLogger({ minLevel: "error" });

      logger.error("An error occurred", "string error");

      expect(consoleSpy.error).toHaveBeenCalled();
      const errorArg = consoleSpy.error.mock.calls[0][1] as {
        name: string;
        message: string;
      };
      expect(errorArg).toBeDefined();
      expect(errorArg.name).toBe("UnknownError");
      expect(errorArg.message).toBe("string error");
    });

    it("should allow reconfiguration", () => {
      const logger = new ErrorLogger({ enabled: true, minLevel: "error" });

      logger.configure({ enabled: false });
      expect(logger.isEnabled()).toBe(false);

      logger.error("test error");
      expect(consoleSpy.error).not.toHaveBeenCalled();
    });
  });

  describe("ChildLogger", () => {
    it("should create a child logger with preset context", () => {
      const logger = new ErrorLogger({ minLevel: "error" });
      const childLogger = logger.child({
        component: "ChildComponent",
      });

      childLogger.error("Child error");

      const call = consoleSpy.error.mock.calls[0][0] as string;
      expect(call).toContain("[ChildComponent]");
    });

    it("should merge context from parent and call", () => {
      const logger = new ErrorLogger({ minLevel: "error" });
      const childLogger = logger.child({
        component: "ChildComponent",
      });

      childLogger.error("Child error", undefined, {
        action: "childAction",
      });

      const call = consoleSpy.error.mock.calls[0][0] as string;
      expect(call).toContain("[ChildComponent:childAction]");
    });

    it("should support nested child loggers", () => {
      const logger = new ErrorLogger({ minLevel: "error" });
      const childLogger = logger.child({
        component: "ParentComponent",
      });
      const grandchildLogger = childLogger.child({
        action: "grandchildAction",
      });

      grandchildLogger.error("Grandchild error");

      const call = consoleSpy.error.mock.calls[0][0] as string;
      expect(call).toContain("[ParentComponent:grandchildAction]");
    });

    it("should merge metadata correctly", () => {
      const logger = new ErrorLogger({ minLevel: "error" });
      const childLogger = logger.child({
        component: "TestComponent",
        metadata: { parentKey: "parentValue" },
      });

      childLogger.error("Test error", undefined, {
        metadata: { childKey: "childValue" },
      });

      // Verify the call was made (metadata is included in the log entry)
      expect(consoleSpy.error).toHaveBeenCalled();
    });
  });

  describe("Convenience functions", () => {
    it("should provide logDebug function", () => {
      // errorLogger uses default config which may filter debug in production
      // For this test, we verify the function exists and doesn't throw
      expect(() => logDebug("test debug")).not.toThrow();
    });

    it("should provide logInfo function", () => {
      expect(() => logInfo("test info")).not.toThrow();
    });

    it("should provide logWarn function", () => {
      logWarn("test warn");
      // In default config, warn should be logged
      expect(consoleSpy.warn).toHaveBeenCalled();
    });

    it("should provide logError function", () => {
      logError("test error");
      expect(consoleSpy.error).toHaveBeenCalled();
    });

    it("should allow context with convenience functions", () => {
      logError("test error", undefined, {
        component: "TestComponent",
        action: "testAction",
      });

      const call = consoleSpy.error.mock.calls[0][0] as string;
      expect(call).toContain("[TestComponent:testAction]");
    });
  });

  describe("Log levels", () => {
    const levels: LogLevel[] = ["debug", "info", "warn", "error"];

    levels.forEach((level) => {
      it(`should respect ${level} as minimum level`, () => {
        const logger = new ErrorLogger({ minLevel: level });
        const config = logger.getConfig();
        expect(config.minLevel).toBe(level);
      });
    });

    it("should log all levels when minLevel is debug", () => {
      const logger = new ErrorLogger({ minLevel: "debug" });

      logger.debug("debug");
      logger.info("info");
      logger.warn("warn");
      logger.error("error");

      expect(consoleSpy.debug).toHaveBeenCalledTimes(1);
      expect(consoleSpy.info).toHaveBeenCalledTimes(1);
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });

    it("should only log warn and error when minLevel is warn", () => {
      const logger = new ErrorLogger({ minLevel: "warn" });

      logger.debug("debug");
      logger.info("info");
      logger.warn("warn");
      logger.error("error");

      expect(consoleSpy.debug).not.toHaveBeenCalled();
      expect(consoleSpy.info).not.toHaveBeenCalled();
      expect(consoleSpy.warn).toHaveBeenCalledTimes(1);
      expect(consoleSpy.error).toHaveBeenCalledTimes(1);
    });
  });

  describe("Timestamp formatting", () => {
    it("should include ISO timestamp in log messages", () => {
      const logger = new ErrorLogger({ minLevel: "error" });
      logger.error("Test error");

      const call = consoleSpy.error.mock.calls[0][0] as string;
      // Check for ISO date pattern
      expect(call).toMatch(/\[\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);
    });
  });

  describe("Singleton instance", () => {
    it("should export a singleton errorLogger instance", () => {
      expect(errorLogger).toBeDefined();
      expect(errorLogger.isEnabled).toBeDefined();
    });
  });

  describe("Configuration", () => {
    it("should get current configuration", () => {
      const logger = new ErrorLogger({
        enabled: true,
        minLevel: "warn",
        includeStack: false,
      });

      const config = logger.getConfig();
      expect(config.enabled).toBe(true);
      expect(config.minLevel).toBe("warn");
      expect(config.includeStack).toBe(false);
    });

    it("should use defaults for unspecified options", () => {
      const logger = new ErrorLogger({});
      const config = logger.getConfig();

      expect(config.enabled).toBe(true);
      expect(config.remoteReportingEnabled).toBe(false);
      expect(config.remoteEndpoint).toBe("");
    });
  });
});
