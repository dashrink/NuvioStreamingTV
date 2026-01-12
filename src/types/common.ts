/**
 * Common utility types used across the codebase
 * These types provide type-safe patterns for API responses, errors, and nullable values
 */

// ============================================================================
// Utility Types
// ============================================================================

/**
 * Makes a type nullable (T | null)
 * Use when a value may not exist/be null from APIs or database
 */
export type Nullable<T> = T | null;

/**
 * Makes a type optional (T | undefined)
 * Use when a value may not be provided
 */
export type Optional<T> = T | undefined;

/**
 * Makes a type both nullable and optional
 * Use when a value may be null, undefined, or present
 */
export type Maybe<T> = T | null | undefined;

/**
 * Extract keys from T where the value is of type V
 * Useful for filtering object keys by value type
 */
export type KeysOfType<T, V> = {
  [K in keyof T]: T[K] extends V ? K : never;
}[keyof T];

// ============================================================================
// API Response Types
// ============================================================================

/**
 * Standard API error structure
 * Matches common error patterns from Axios, fetch, and custom APIs
 */
export interface ApiError {
  /** Human-readable error message */
  message: string;
  /** Error code (e.g., 'ECONNREFUSED', 'TIMEOUT', 'ERR_NETWORK') */
  code?: string;
  /** HTTP status code if applicable */
  status?: number;
  /** Whether this error came from Axios */
  isAxiosError?: boolean;
  /** Original error for debugging */
  originalError?: unknown;
  /** Stack trace if available */
  stack?: string;
}

/**
 * Generic API response wrapper
 * Use for typed API responses with success/error states
 */
export interface ApiResponse<T> {
  /** Response data on success */
  data: T | null;
  /** Whether the request was successful */
  success: boolean;
  /** Error details if request failed */
  error: ApiError | null;
  /** HTTP status code */
  status?: number;
}

/**
 * Paginated API response wrapper
 * Extends ApiResponse with pagination metadata
 */
export interface PaginatedResponse<T> extends ApiResponse<T[]> {
  /** Current page number (1-indexed) */
  page: number;
  /** Total number of pages */
  totalPages: number;
  /** Total number of results across all pages */
  totalResults: number;
}

// ============================================================================
// Error Handling Helpers
// ============================================================================

/**
 * Type guard to check if an error has a message property
 */
export function hasErrorMessage(error: unknown): error is { message: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'message' in error &&
    typeof (error as { message: unknown }).message === 'string'
  );
}

/**
 * Type guard to check if an error has a code property
 */
export function hasErrorCode(error: unknown): error is { code: string } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'code' in error &&
    typeof (error as { code: unknown }).code === 'string'
  );
}

/**
 * Type guard to check if an error has a status property
 */
export function hasErrorStatus(error: unknown): error is { status: number } {
  return (
    typeof error === 'object' &&
    error !== null &&
    'status' in error &&
    typeof (error as { status: unknown }).status === 'number'
  );
}

/**
 * Type guard to check if error is an Axios error
 */
export function isAxiosError(error: unknown): error is {
  isAxiosError: true;
  message: string;
  code?: string;
  response?: { status: number; data: unknown };
} {
  return (
    typeof error === 'object' &&
    error !== null &&
    'isAxiosError' in error &&
    (error as { isAxiosError: unknown }).isAxiosError === true
  );
}

/**
 * Safely extracts an error message from any error type
 * Handles Error objects, strings, and unknown error types
 *
 * @param error - The caught error (can be any type)
 * @param fallback - Fallback message if extraction fails
 * @returns A string error message
 */
export function getErrorMessage(
  error: unknown,
  fallback: string = 'An unknown error occurred'
): string {
  // Handle Error instances
  if (error instanceof Error) {
    return error.message;
  }

  // Handle objects with message property
  if (hasErrorMessage(error)) {
    return error.message;
  }

  // Handle string errors
  if (typeof error === 'string') {
    return error;
  }

  // Handle null/undefined
  if (error === null || error === undefined) {
    return fallback;
  }

  // Try to stringify other types
  try {
    const stringified = String(error);
    if (stringified !== '[object Object]') {
      return stringified;
    }
  } catch {
    // Ignore stringify errors
  }

  return fallback;
}

/**
 * Safely extracts error code from any error type
 *
 * @param error - The caught error (can be any type)
 * @returns The error code or undefined
 */
export function getErrorCode(error: unknown): string | undefined {
  if (hasErrorCode(error)) {
    return error.code;
  }

  if (isAxiosError(error)) {
    return error.code;
  }

  return undefined;
}

/**
 * Safely extracts HTTP status from any error type
 *
 * @param error - The caught error (can be any type)
 * @returns The HTTP status code or undefined
 */
export function getErrorStatus(error: unknown): number | undefined {
  if (hasErrorStatus(error)) {
    return error.status;
  }

  if (isAxiosError(error) && error.response) {
    return error.response.status;
  }

  return undefined;
}

/**
 * Converts any error to a structured ApiError object
 * Useful for consistent error handling across the codebase
 *
 * @param error - The caught error (can be any type)
 * @param defaultMessage - Default message if none can be extracted
 * @returns A structured ApiError object
 */
export function toApiError(
  error: unknown,
  defaultMessage: string = 'An unknown error occurred'
): ApiError {
  const message = getErrorMessage(error, defaultMessage);
  const code = getErrorCode(error);
  const status = getErrorStatus(error);
  const axiosError = isAxiosError(error);

  return {
    message,
    code,
    status,
    isAxiosError: axiosError,
    originalError: error,
    stack: error instanceof Error ? error.stack : undefined,
  };
}

/**
 * Creates a successful API response
 *
 * @param data - The response data
 * @param status - Optional HTTP status code
 * @returns A success ApiResponse
 */
export function createSuccessResponse<T>(data: T, status: number = 200): ApiResponse<T> {
  return {
    data,
    success: true,
    error: null,
    status,
  };
}

/**
 * Creates an error API response
 *
 * @param error - The error to include
 * @param status - Optional HTTP status code
 * @returns An error ApiResponse
 */
export function createErrorResponse<T = never>(error: unknown, status?: number): ApiResponse<T> {
  const apiError = toApiError(error);
  return {
    data: null,
    success: false,
    error: apiError,
    status: status ?? apiError.status,
  };
}

// ============================================================================
// Common Type Aliases
// ============================================================================

/**
 * Generic callback type
 */
export type Callback<T = void> = (result: T) => void;

/**
 * Generic async callback type
 */
export type AsyncCallback<T = void> = (result: T) => Promise<void>;

/**
 * Generic error callback type
 */
export type ErrorCallback = (error: unknown) => void;

/**
 * Common ID type for consistency
 */
export type ID = string | number;

/**
 * Timestamp in milliseconds
 */
export type Timestamp = number;

/**
 * ISO date string
 */
export type ISODateString = string;

/**
 * Record with string keys (more explicit than Record<string, T>)
 */
export type StringRecord<T> = { [key: string]: T };

/**
 * Deep partial type - makes all nested properties optional
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

/**
 * Non-empty array type
 */
export type NonEmptyArray<T> = [T, ...T[]];

/**
 * Extracts the resolved type from a Promise
 */
export type Awaited<T> = T extends Promise<infer U> ? U : T;
