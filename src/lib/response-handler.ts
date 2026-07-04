import type { ApiResponse } from "@/types/api";
import { AppError } from "@/lib/error-handler";

export function unwrapResponse<T>(response: ApiResponse<T>): T {
  if (!response.success || response.data === undefined) {
    throw new AppError(
      response.error ?? {
        code: "API_ERROR",
        message: response.message ?? "Request failed",
        statusCode: 400,
      },
    );
  }
  return response.data;
}

export function isSuccessResponse<T>(response: ApiResponse<T>): response is ApiResponse<T> & { data: T } {
  return response.success === true && response.data !== undefined;
}
