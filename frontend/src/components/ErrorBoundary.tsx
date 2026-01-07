import { Component, type ReactNode, type ErrorInfo } from "react";
import {
  isAppError,
  isApiError,
  isRetryable,
  getErrorMessage,
} from "../types/errors";

interface ErrorBoundaryProps {
  children: ReactNode;
  fallback?: ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  onReset?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

/**
 * ErrorBoundary component that catches JavaScript errors in child components,
 * logs them, and displays a fallback UI with recovery options.
 */
export class ErrorBoundary extends Component<
  ErrorBoundaryProps,
  ErrorBoundaryState
> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<ErrorBoundaryState> {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo): void {
    this.setState({ errorInfo });

    // Log error details
    console.error("ErrorBoundary caught an error:", error);
    console.error("Component stack:", errorInfo.componentStack);

    // Call optional error handler
    this.props.onError?.(error, errorInfo);
  }

  handleReset = (): void => {
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
    });
    this.props.onReset?.();
  };

  handleReload = (): void => {
    window.location.reload();
  };

  render(): ReactNode {
    if (this.state.hasError) {
      // Use custom fallback if provided
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <ErrorRecoveryUI
          error={this.state.error}
          errorInfo={this.state.errorInfo}
          onRetry={this.handleReset}
          onReload={this.handleReload}
        />
      );
    }

    return this.props.children;
  }
}

/**
 * Props for the ErrorRecoveryUI component
 */
interface ErrorRecoveryUIProps {
  error: Error | null;
  errorInfo: ErrorInfo | null;
  onRetry: () => void;
  onReload: () => void;
}

/**
 * ErrorRecoveryUI displays error information with recovery options
 */
function ErrorRecoveryUI({
  error,
  errorInfo,
  onRetry,
  onReload,
}: ErrorRecoveryUIProps) {
  const isDev = import.meta.env.DEV;
  const canRetry = error ? isRetryable(error) : false;
  const errorMessage = error ? getErrorMessage(error) : "An error occurred";

  // Get error type for display
  const getErrorType = (): string => {
    if (!error) return "Unknown Error";
    if (isApiError(error)) return "API Error";
    if (isAppError(error)) return error.name;
    return "Application Error";
  };

  // Get error details for dev mode
  const getErrorDetails = (): string | null => {
    if (!error || !isDev) return null;

    const details: string[] = [];

    if (isApiError(error)) {
      if (error.status) details.push(`Status: ${error.status}`);
      if (error.endpoint) details.push(`Endpoint: ${error.endpoint}`);
    }

    if (isAppError(error)) {
      details.push(`Retryable: ${error.retryable ? "Yes" : "No"}`);
      details.push(`Timestamp: ${new Date(error.timestamp).toISOString()}`);
    }

    return details.length > 0 ? details.join(" | ") : null;
  };

  const errorDetails = getErrorDetails();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50 dark:bg-slate-900 p-4">
      <div className="max-w-lg w-full">
        <div className="bg-white dark:bg-slate-800 rounded-xl shadow-lg border border-slate-200 dark:border-slate-700 overflow-hidden">
          {/* Header */}
          <div className="bg-red-50 dark:bg-red-900/20 px-6 py-4 border-b border-red-100 dark:border-red-900/30">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-100 dark:bg-red-900/40 rounded-full flex items-center justify-center flex-shrink-0">
                <svg
                  className="w-5 h-5 text-red-600 dark:text-red-400"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-lg font-semibold text-red-800 dark:text-red-200">
                  {getErrorType()}
                </h1>
                <p className="text-sm text-red-600 dark:text-red-400">
                  Something went wrong
                </p>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="px-6 py-5">
            <p className="text-slate-700 dark:text-slate-300 mb-4">
              {errorMessage}
            </p>

            {/* Error details in dev mode */}
            {isDev && errorDetails && (
              <div className="mb-4 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg">
                <p className="text-xs font-mono text-slate-600 dark:text-slate-400">
                  {errorDetails}
                </p>
              </div>
            )}

            {/* Stack trace in dev mode */}
            {isDev && errorInfo?.componentStack && (
              <details className="mb-4">
                <summary className="text-sm text-slate-500 dark:text-slate-400 cursor-pointer hover:text-slate-700 dark:hover:text-slate-200">
                  Component Stack (Dev Only)
                </summary>
                <pre className="mt-2 p-3 bg-slate-100 dark:bg-slate-700/50 rounded-lg text-xs font-mono text-slate-600 dark:text-slate-400 overflow-x-auto max-h-48 overflow-y-auto">
                  {errorInfo.componentStack}
                </pre>
              </details>
            )}

            {/* Actions */}
            <div className="flex flex-col sm:flex-row gap-3">
              {canRetry && (
                <button
                  onClick={onRetry}
                  className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-slate-800"
                >
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      stroke="currentColor"
                      viewBox="0 0 24 24"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                      />
                    </svg>
                    Try Again
                  </span>
                </button>
              )}
              <button
                onClick={onReload}
                className={`flex-1 px-4 py-2.5 font-medium rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2 dark:focus:ring-offset-slate-800 ${
                  canRetry
                    ? "bg-slate-100 dark:bg-slate-700 hover:bg-slate-200 dark:hover:bg-slate-600 text-slate-700 dark:text-slate-200 focus:ring-slate-500"
                    : "bg-blue-600 hover:bg-blue-700 text-white focus:ring-blue-500"
                }`}
              >
                <span className="flex items-center justify-center gap-2">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
                    />
                  </svg>
                  Reload Page
                </span>
              </button>
            </div>
          </div>

          {/* Footer */}
          <div className="px-6 py-3 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-700">
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center">
              If this problem persists, please check the console for more
              details.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ErrorBoundary;
