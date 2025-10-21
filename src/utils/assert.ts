import { HTTPException } from 'hono/http-exception';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

/**
 * Assert a condition and throw HTTPException if it fails
 * @param condition - The condition to assert
 * @param message - Error message to throw
 * @param status - HTTP status code (default: 500)
 * @throws {HTTPException} When condition is falsy
 * @example
 * ```ts
 * assert(token, "Token is required", 401);
 * assert(user, "User not found", 404);
 * assert(isValid, "Invalid data", 400);
 * ```
 */
export function assert(
  condition: unknown,
  message: string,
  status: ContentfulStatusCode = 500
): asserts condition {
  if (!condition) {
    throw new HTTPException(status, { message });
  }
}
