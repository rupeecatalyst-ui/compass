import type { Request, Response, NextFunction } from "express";

export function errorMiddleware(
  err: Error & { statusCode?: number; code?: string },
  _req: Request,
  res: Response,
  _next: NextFunction,
) {
  const statusCode = err.statusCode ?? 500;
  const code = err.code ?? "INTERNAL_ERROR";

  if (process.env.NODE_ENV === "development") {
    console.error("[API Error]", err);
  }

  res.status(statusCode).json({
    success: false,
    error: {
      code,
      message: err.message || "An unexpected error occurred",
      statusCode,
    },
  });
}

export function notFoundMiddleware(_req: Request, res: Response) {
  res.status(404).json({
    success: false,
    error: { code: "NOT_FOUND", message: "Route not found" },
  });
}
