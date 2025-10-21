import type { ErrorHandler } from "hono";
import { HTTPException } from "hono/http-exception";

/**
 * Error handler for Hono
 * Catches errors and returns JSON error responses
 */
export const errorHandler: ErrorHandler = (error, c) => {
  // Handle HTTPException from Hono
  if (error instanceof HTTPException) {
    console.error(error.cause);
    // Get the custom response
    return error.getResponse();
  }

  // Handle standard Error
  if (error instanceof Error) {
    console.error("Error:", error);
    return c.json(
      {
        error: error.message,
        status: 500,
      },
      500
    );
  }

  // Handle unknown errors
  console.error("Unknown error:", error);
  return c.json(
    {
      error: "Internal server error",
      status: 500,
    },
    500
  );
};
