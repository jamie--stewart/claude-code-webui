/**
 * Frontend Error Logger Utility
 *
 * Provides structured error logging with support for different log levels,
 * context information, and optional remote error reporting.
 */

import { isDevelopment } from "./environment";

/**
 * Log levels in order of severity
 */
export type LogLevel = "debug" | "info" | "warn" | "error";

/**
 * Context information for error logs
 */
export interface LogContext {
  /** Component or module name where the error occurred */
  component?: string;
  /** Action being performed when the error occurred */
  action?: string;
  /** Additional metadata */
  metadata?: Record<string, unknown>;
  /** User session identifier (if available) */
  sessionId?: string;
  /** Request identifier (if applicable) */
  requestId?: string;
}

/**
 * Structured log entry
 */
export interface LogEntry {
  level: LogLevel;
  message: string;
  timestamp: string;
  context?: LogContext;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

/**
 * Configuration for the error logger
 */
export interface ErrorLoggerConfig {
  /** Minimum log level to output (default: "debug" in dev, "warn" in prod) */
  minLevel?: LogLevel;
  /** Enable logging (default: true) */
  enabled?: boolean;
  /** Enable remote error reporting (default: false) */
  remoteReportingEnabled?: boolean;
  /** Remote error reporting endpoint (optional) */
  remoteEndpoint?: string;
  /** Whether to include stack traces (default: true in dev, false in prod) */
  includeStack?: boolean;
}

/**
 * Log level priority for filtering
 */
const LOG_LEVEL_PRIORITY: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/**
 * Get configuration from environment variables
 */
function getEnvConfig(): ErrorLoggerConfig {
  const config: ErrorLoggerConfig = {};

  // Check for VITE environment variables
  if (typeof import.meta !== "undefined" && import.meta.env) {
    const env = import.meta.env;

    // Enable/disable logging
    if (env.VITE_ERROR_LOGGING_ENABLED !== undefined) {
      config.enabled = env.VITE_ERROR_LOGGING_ENABLED === "true";
    }

    // Minimum log level
    if (env.VITE_ERROR_LOG_LEVEL) {
      const level = env.VITE_ERROR_LOG_LEVEL.toLowerCase();
      if (["debug", "info", "warn", "error"].includes(level)) {
        config.minLevel = level as LogLevel;
      }
    }

    // Remote reporting
    if (env.VITE_ERROR_REMOTE_REPORTING_ENABLED !== undefined) {
      config.remoteReportingEnabled =
        env.VITE_ERROR_REMOTE_REPORTING_ENABLED === "true";
    }

    if (env.VITE_ERROR_REMOTE_ENDPOINT) {
      config.remoteEndpoint = env.VITE_ERROR_REMOTE_ENDPOINT;
    }
  }

  return config;
}

/**
 * Default configuration
 */
function getDefaultConfig(): Required<ErrorLoggerConfig> {
  const isDev = isDevelopment();
  return {
    minLevel: isDev ? "debug" : "warn",
    enabled: true,
    remoteReportingEnabled: false,
    remoteEndpoint: "",
    includeStack: isDev,
  };
}

/**
 * Merge configurations with priority: explicit > env > defaults
 */
function mergeConfig(
  explicit?: ErrorLoggerConfig,
): Required<ErrorLoggerConfig> {
  const defaults = getDefaultConfig();
  const envConfig = getEnvConfig();
  return {
    ...defaults,
    ...envConfig,
    ...explicit,
  };
}

/**
 * ErrorLogger class for structured error logging
 */
class ErrorLogger {
  private config: Required<ErrorLoggerConfig>;
  private pendingRemoteLogs: LogEntry[] = [];
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor(config?: ErrorLoggerConfig) {
    this.config = mergeConfig(config);
  }

  /**
   * Update logger configuration
   */
  configure(config: ErrorLoggerConfig): void {
    this.config = mergeConfig(config);
  }

  /**
   * Check if a log level should be output
   */
  private shouldLog(level: LogLevel): boolean {
    if (!this.config.enabled) return false;
    return (
      LOG_LEVEL_PRIORITY[level] >= LOG_LEVEL_PRIORITY[this.config.minLevel]
    );
  }

  /**
   * Create a structured log entry
   */
  private createLogEntry(
    level: LogLevel,
    message: string,
    error?: Error | unknown,
    context?: LogContext,
  ): LogEntry {
    const entry: LogEntry = {
      level,
      message,
      timestamp: new Date().toISOString(),
    };

    if (context && Object.keys(context).length > 0) {
      entry.context = context;
    }

    if (error) {
      if (error instanceof Error) {
        entry.error = {
          name: error.name,
          message: error.message,
        };
        if (this.config.includeStack && error.stack) {
          entry.error.stack = error.stack;
        }
      } else {
        entry.error = {
          name: "UnknownError",
          message: String(error),
        };
      }
    }

    return entry;
  }

  /**
   * Output log entry to console
   */
  private outputToConsole(entry: LogEntry): void {
    const prefix = `[${entry.timestamp}] [${entry.level.toUpperCase()}]`;
    const contextStr = entry.context
      ? ` [${entry.context.component || "unknown"}${entry.context.action ? `:${entry.context.action}` : ""}]`
      : "";

    const formattedMessage = `${prefix}${contextStr} ${entry.message}`;

    switch (entry.level) {
      case "debug":
        console.debug(formattedMessage, entry.error || "");
        break;
      case "info":
        console.info(formattedMessage, entry.error || "");
        break;
      case "warn":
        console.warn(formattedMessage, entry.error || "");
        break;
      case "error":
        console.error(formattedMessage, entry.error || "");
        break;
    }
  }

  /**
   * Queue log entry for remote reporting
   */
  private queueForRemoteReporting(entry: LogEntry): void {
    if (!this.config.remoteReportingEnabled || !this.config.remoteEndpoint) {
      return;
    }

    this.pendingRemoteLogs.push(entry);

    // Debounce flush
    if (this.flushTimeout) {
      clearTimeout(this.flushTimeout);
    }
    this.flushTimeout = setTimeout(() => this.flushRemoteLogs(), 1000);
  }

  /**
   * Flush pending logs to remote endpoint
   */
  private async flushRemoteLogs(): Promise<void> {
    if (this.pendingRemoteLogs.length === 0 || !this.config.remoteEndpoint) {
      return;
    }

    const logsToSend = [...this.pendingRemoteLogs];
    this.pendingRemoteLogs = [];

    try {
      await fetch(this.config.remoteEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ logs: logsToSend }),
      });
    } catch {
      // Silently fail remote logging to avoid infinite loops
      // In production, you might want to use a fallback mechanism
      if (isDevelopment()) {
        console.warn("Failed to send logs to remote endpoint");
      }
    }
  }

  /**
   * Log a message at the specified level
   */
  private log(
    level: LogLevel,
    message: string,
    error?: Error | unknown,
    context?: LogContext,
  ): void {
    if (!this.shouldLog(level)) return;

    const entry = this.createLogEntry(level, message, error, context);
    this.outputToConsole(entry);

    // Only send errors and warnings to remote
    if (level === "error" || level === "warn") {
      this.queueForRemoteReporting(entry);
    }
  }

  /**
   * Log a debug message
   */
  debug(message: string, context?: LogContext): void {
    this.log("debug", message, undefined, context);
  }

  /**
   * Log an info message
   */
  info(message: string, context?: LogContext): void {
    this.log("info", message, undefined, context);
  }

  /**
   * Log a warning message
   */
  warn(message: string, error?: Error | unknown, context?: LogContext): void {
    this.log("warn", message, error, context);
  }

  /**
   * Log an error message
   */
  error(message: string, error?: Error | unknown, context?: LogContext): void {
    this.log("error", message, error, context);
  }

  /**
   * Create a child logger with preset context
   */
  child(context: LogContext): ChildLogger {
    return new ChildLogger(this, context);
  }

  /**
   * Check if logging is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Get current configuration (for testing)
   */
  getConfig(): Required<ErrorLoggerConfig> {
    return { ...this.config };
  }
}

/**
 * Child logger with preset context
 */
class ChildLogger {
  constructor(
    private parent: ErrorLogger,
    private context: LogContext,
  ) {}

  private mergeContext(additionalContext?: LogContext): LogContext {
    return {
      ...this.context,
      ...additionalContext,
      metadata: {
        ...this.context.metadata,
        ...additionalContext?.metadata,
      },
    };
  }

  debug(message: string, context?: LogContext): void {
    this.parent.debug(message, this.mergeContext(context));
  }

  info(message: string, context?: LogContext): void {
    this.parent.info(message, this.mergeContext(context));
  }

  warn(message: string, error?: Error | unknown, context?: LogContext): void {
    this.parent.warn(message, error, this.mergeContext(context));
  }

  error(message: string, error?: Error | unknown, context?: LogContext): void {
    this.parent.error(message, error, this.mergeContext(context));
  }

  child(context: LogContext): ChildLogger {
    return new ChildLogger(this.parent, this.mergeContext(context));
  }
}

// Create and export a singleton instance
export const errorLogger = new ErrorLogger();

// Export the class for custom instances
export { ErrorLogger, ChildLogger };

// Convenience functions that use the singleton
export const logDebug = (message: string, context?: LogContext): void =>
  errorLogger.debug(message, context);

export const logInfo = (message: string, context?: LogContext): void =>
  errorLogger.info(message, context);

export const logWarn = (
  message: string,
  error?: Error | unknown,
  context?: LogContext,
): void => errorLogger.warn(message, error, context);

export const logError = (
  message: string,
  error?: Error | unknown,
  context?: LogContext,
): void => errorLogger.error(message, error, context);
