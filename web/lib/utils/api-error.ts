/**
 * Extracts error message from API error responses.
 * Handles both Axios errors (with response.data.message) and standard Error objects.
 *
 * @param error - The error object (can be Axios error, Error, or unknown)
 * @param fallbackMessage - Fallback message if error message cannot be extracted
 * @returns The error message string
 */
export function extractApiErrorMessage(
  error: unknown,
  fallbackMessage: string = "操作失败，请稍后重试。",
): string {
  // Check if it's an Axios error with response.data.message
  if (
    error &&
    typeof error === "object" &&
    "response" in error &&
    error.response &&
    typeof error.response === "object" &&
    "data" in error.response &&
    error.response.data &&
    typeof error.response.data === "object" &&
    "message" in error.response.data &&
    typeof error.response.data.message === "string"
  ) {
    return error.response.data.message;
  }

  // Fall back to standard Error message
  if (error instanceof Error) {
    return error.message;
  }

  // Final fallback
  return fallbackMessage;
}

