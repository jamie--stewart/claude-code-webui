/**
 * Shared test utilities for handler tests
 */
import { vi, type Mock } from "vitest";
import { Context } from "hono";

/**
 * Mock response type that captures json() call arguments
 */
export interface MockResponse<T = unknown> {
  data: T;
  status: number | undefined;
}

/**
 * Type-safe mock context options
 */
export interface MockContextOptions {
  params?: Record<string, string | undefined>;
  body?: unknown;
}

/**
 * Creates a type-safe mock Hono Context for testing handlers
 *
 * @param options - Configuration for the mock context
 * @returns A properly typed mock Context
 */
export function createMockContext(options: MockContextOptions = {}): Context {
  const { params = {}, body } = options;

  const mockContext = {
    req: {
      param: vi.fn().mockImplementation((name: string) => params[name]),
      json: vi.fn().mockResolvedValue(body),
    },
    json: vi.fn().mockImplementation((data: unknown, status?: number) => ({
      data,
      status,
    })),
    set: vi.fn(),
    get: vi.fn(),
  };

  return mockContext as unknown as Context;
}

/**
 * Type guard to check if a value is a MockResponse
 */
export function isMockResponse<T>(value: unknown): value is MockResponse<T> {
  return (
    typeof value === "object" &&
    value !== null &&
    "data" in value &&
    "status" in value
  );
}

/**
 * Helper to create hoisted mocks for a module
 * This should be used at module level with vi.hoisted()
 *
 * @example
 * const mocks = vi.hoisted(() => createHoistedMocks(['validateFn', 'loadFn']));
 * vi.mock('../module', () => ({
 *   validateFn: mocks.validateFn,
 *   loadFn: mocks.loadFn,
 * }));
 */
export function createHoistedMocks<T extends string>(
  names: T[],
): Record<T, Mock> {
  return names.reduce(
    (acc, name) => {
      acc[name] = vi.fn();
      return acc;
    },
    {} as Record<T, Mock>,
  );
}
