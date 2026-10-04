/**
 * CO-MARKETING-REDESIGN-010 — Map Marketing API failures to HTTP status.
 * requireAccessToken throws `{ status, body }`. Admin/permission throws use `{ statusCode }`.
 * Looking only at `statusCode` incorrectly turns unauthenticated requests into 500.
 */

import type { ApiResponse } from "@/types/api";

export type MarketingMappedApiError = {
  status: number;
  code: string;
  message: string;
  authBody?: ApiResponse<unknown>;
};

function isAuthBody(value: unknown): value is ApiResponse<unknown> {
  if (!value || typeof value !== "object") return false;
  const row = value as { success?: unknown; error?: unknown };
  return row.success === false && row.error != null && typeof row.error === "object";
}

export function mapMarketingUnknownError(
  err: unknown,
  fallbackCode: string,
  fallbackMessage: string,
): MarketingMappedApiError {
  const named = err as { name?: string; code?: string; message?: string; statusCode?: number };
  if (named?.name === "EnterpriseMarketingSafetyError" || named?.code === "EME_SAFETY_BLOCKED") {
    return {
      status: 403,
      code: named.code ?? "EME_SAFETY_BLOCKED",
      message: named.message ?? "Marketing safety blocked this operation",
    };
  }

  const authShaped = err as { status?: number; body?: unknown };
  if (
    (authShaped.status === 401 || authShaped.status === 403) &&
    isAuthBody(authShaped.body)
  ) {
    const body = authShaped.body;
    return {
      status: authShaped.status,
      code: body.error?.code ?? (authShaped.status === 401 ? "UNAUTHORIZED" : "FORBIDDEN"),
      message: body.error?.message ?? (authShaped.status === 401 ? "Authentication required" : "Forbidden"),
      authBody: body,
    };
  }

  const statusCode = named?.statusCode;
  const code = named?.code;
  const message = err instanceof Error ? err.message : fallbackMessage;
  if (statusCode === 401 || statusCode === 403) {
    return {
      status: statusCode,
      code: code ?? (statusCode === 401 ? "UNAUTHORIZED" : "FORBIDDEN"),
      message,
    };
  }
  return {
    status: statusCode && statusCode >= 400 && statusCode < 600 ? statusCode : 500,
    code: code ?? fallbackCode,
    message,
  };
}
