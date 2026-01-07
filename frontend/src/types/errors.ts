/**
 * Custom error types for structured error handling
 */

/**
 * Base application error with common properties
 */
export class AppError extends Error {
  readonly timestamp: number;
  readonly retryable: boolean;

  constructor(message: string, options?: { retryable?: boolean }) {
    super(message);
    this.name = "AppError";
    this.timestamp = Date.now();
    this.retryable = options?.retryable ?? false;
  }
}

/**
 * API/Network errors for HTTP request failures
 */
export class ApiError extends AppError {
  readonly status?: number;
  readonly statusText?: string;
  readonly endpoint: string;

  constructor(
    message: string,
    options: {
      status?: number;
      statusText?: string;
      endpoint: string;
      retryable?: boolean;
    },
  ) {
    // Determine retryability based on status code if not explicitly set
    const retryable =
      options.retryable ??
      (options.status !== undefined &&
        (options.status >= 500 || options.status === 429));

    super(message, { retryable });
    this.name = "ApiError";
    this.status = options.status;
    this.statusText = options.statusText;
    this.endpoint = options.endpoint;
  }

  static fromResponse(response: Response, endpoint: string): ApiError {
    return new ApiError(
      `API request failed: ${response.status} ${response.statusText}`,
      {
        status: response.status,
        statusText: response.statusText,
        endpoint,
        retryable: response.status >= 500 || response.status === 429,
      },
    );
  }
}

/**
 * Validation errors for input/format validation failures
 */
export class ValidationError extends AppError {
  readonly field?: string;
  readonly reason: string;
  readonly value?: unknown;

  constructor(
    message: string,
    options: {
      field?: string;
      reason: string;
      value?: unknown;
    },
  ) {
    super(message, { retryable: false });
    this.name = "ValidationError";
    this.field = options.field;
    this.reason = options.reason;
    this.value = options.value;
  }
}

/**
 * Stream errors for stream parsing/processing failures
 */
export class StreamError extends AppError {
  readonly line?: string;
  readonly parseError?: unknown;

  constructor(
    message: string,
    options?: {
      line?: string;
      parseError?: unknown;
      retryable?: boolean;
    },
  ) {
    super(message, { retryable: options?.retryable ?? true });
    this.name = "StreamError";
    this.line = options?.line;
    this.parseError = options?.parseError;
  }
}

/**
 * Context errors for context limit issues
 */
export class ContextError extends AppError {
  readonly contextType: "overflow" | "malformed" | "missing";

  constructor(
    message: string,
    options: {
      contextType: "overflow" | "malformed" | "missing";
    },
  ) {
    super(message, { retryable: options.contextType === "overflow" });
    this.name = "ContextError";
    this.contextType = options.contextType;
  }
}

/**
 * Type guards for error types
 */
export function isAppError(error: unknown): error is AppError {
  return error instanceof AppError;
}

export function isApiError(error: unknown): error is ApiError {
  return error instanceof ApiError;
}

export function isValidationError(error: unknown): error is ValidationError {
  return error instanceof ValidationError;
}

export function isStreamError(error: unknown): error is StreamError {
  return error instanceof StreamError;
}

export function isContextError(error: unknown): error is ContextError {
  return error instanceof ContextError;
}

/**
 * Extract error message from unknown error
 */
export function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }
  if (typeof error === "string") {
    return error;
  }
  return "An unexpected error occurred";
}

/**
 * Determine if an error is retryable
 */
export function isRetryable(error: unknown): boolean {
  if (isAppError(error)) {
    return error.retryable;
  }
  // Network errors are generally retryable
  if (error instanceof TypeError && error.message.includes("fetch")) {
    return true;
  }
  return false;
}

/**
 * Error info for ErrorBoundary display
 */
export interface ErrorInfo {
  error: Error;
  errorInfo?: React.ErrorInfo;
  timestamp: number;
}
