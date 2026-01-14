/**
 * Environment utility functions for development/production detection
 */

/**
 * Check if the app is running in development mode
 * @returns true if in development mode, false in production
 */
export function isDevelopment(): boolean {
  return import.meta.env.DEV;
}

/**
 * Check if the app is running in production mode
 * @returns true if in production mode, false in development
 */
export function isProduction(): boolean {
  return import.meta.env.PROD;
}

/**
 * Get the base path for the application
 * Used for routing and asset loading when hosted under a sub-path
 * @returns the base path (e.g., "/" or "/s/session-id/")
 */
export function getBasePath(): string {
  return import.meta.env.BASE_URL || "/";
}
