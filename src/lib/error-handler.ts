import { AxiosError } from "axios";
import type { ApiError, ApiResponse } from "@/types/api";

export class AppError extends Error {
  code: string;
  statusCode: number;
  details?: Record<string, string[]>;

  constructor(error: ApiError) {
    super(error.message);
    this.name = "AppError";
    this.code = error.code;
    this.statusCode = error.statusCode ?? 500;
    this.details = error.details;
  }
}

export function parseApiError(error: unknown): AppError {
  if (error instanceof AppError) return error;

  if (error instanceof AxiosError) {
    const data = error.response?.data as ApiResponse | undefined;
    if (data?.error) {
      return new AppError({
        ...data.error,
        statusCode: error.response?.status,
      });
    }

    return new AppError({
      code: "NETWORK_ERROR",
      message: error.message || "Network request failed",
      statusCode: error.response?.status ?? 500,
    });
  }

  if (error instanceof Error) {
    return new AppError({
      code: "UNKNOWN_ERROR",
      message: error.message,
      statusCode: 500,
    });
  }

  return new AppError({
    code: "UNKNOWN_ERROR",
    message: "An unexpected error occurred",
    statusCode: 500,
  });
}

export function getErrorMessage(error: unknown): string {
  return parseApiError(error).message;
}

export function getFieldErrors(error: unknown): Record<string, string[]> | undefined {
  return parseApiError(error).details;
}
