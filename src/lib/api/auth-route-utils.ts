import "server-only";

import { NextResponse } from "next/server";
import { verifyAccessToken, type TokenPayload } from "@server/services/token.service";
import type { ApiResponse } from "@/types/api";
import {
  OPS_CORRELATION_HEADER,
  resolveCorrelationId,
} from "@/lib/ops/correlation";
import { recordApiTiming, recordOpsError, touchUser } from "@/lib/ops";
import { logOps } from "@/lib/ops/structured-log";

export function jsonResponse<T>(
  body: ApiResponse<T>,
  status = 200,
  correlationId?: string,
): NextResponse {
  const res = NextResponse.json(body, { status });
  if (correlationId) {
    res.headers.set(OPS_CORRELATION_HEADER, correlationId);
  }
  return res;
}

export function successResponse<T>(
  data: T,
  status = 200,
  correlationId?: string,
): NextResponse {
  return jsonResponse({ success: true, data }, status, correlationId);
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: Record<string, string[]>,
  opts?: {
    correlationId?: string;
    module?: string;
    action?: string;
    endpoint?: string;
    userId?: string | null;
    durationMs?: number;
  },
): NextResponse {
  const correlationId = opts?.correlationId ?? resolveCorrelationId();
  recordOpsError({
    module: opts?.module ?? "API",
    action: opts?.action ?? code,
    code,
    message,
    correlationId,
    httpStatus: status,
    endpoint: opts?.endpoint,
    userId: opts?.userId,
  });
  if (opts?.durationMs != null && opts.endpoint) {
    recordApiTiming({
      endpoint: opts.endpoint,
      method: "UNKNOWN",
      durationMs: opts.durationMs,
      httpStatus: status,
      correlationId,
      module: opts.module,
    });
  }
  return jsonResponse(
    {
      success: false,
      error: { code, message, details, statusCode: status, correlationId },
    },
    status,
    correlationId,
  );
}

export function fromAuthError(
  error: { status: number; body: ApiResponse },
  opts?: { correlationId?: string; endpoint?: string; userId?: string | null },
): NextResponse {
  const correlationId =
    opts?.correlationId ??
    error.body.error?.correlationId ??
    resolveCorrelationId();
  const code = error.body.error?.code ?? "AUTH_ERROR";
  const message = error.body.error?.message ?? "Authentication error";
  if (error.status >= 400) {
    recordOpsError({
      module: "Authentication",
      action: code,
      code,
      message,
      correlationId,
      httpStatus: error.status,
      endpoint: opts?.endpoint,
      userId: opts?.userId,
    });
  }
  const body: ApiResponse = {
    ...error.body,
    error: error.body.error
      ? { ...error.body.error, correlationId }
      : { code, message, statusCode: error.status, correlationId },
  };
  return jsonResponse(body, error.status, correlationId);
}

export function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export function requireAccessToken(request: Request): TokenPayload {
  const token = getBearerToken(request);
  if (!token) {
    throw {
      status: 401,
      body: {
        success: false,
        error: { code: "UNAUTHORIZED", message: "Authentication required" },
      },
    };
  }

  try {
    const payload = verifyAccessToken(token);
    touchUser(payload.userId);
    return payload;
  } catch {
    throw {
      status: 401,
      body: {
        success: false,
        error: { code: "INVALID_TOKEN", message: "Invalid or expired token" },
      },
    };
  }
}

/** Wrap an API handler with correlation + timing + structured outcome logging. */
export async function withOpsRoute(
  request: Request,
  meta: {
    module: string;
    action: string;
    endpoint: string;
    userId?: string | null;
  },
  run: (ctx: { correlationId: string; startedAt: number }) => Promise<NextResponse>,
): Promise<NextResponse> {
  const correlationId = resolveCorrelationId(request);
  const startedAt = Date.now();
  try {
    const res = await run({ correlationId, startedAt });
    const durationMs = Date.now() - startedAt;
    res.headers.set(OPS_CORRELATION_HEADER, correlationId);
    recordApiTiming({
      endpoint: meta.endpoint,
      method: request.method,
      durationMs,
      httpStatus: res.status,
      correlationId,
      module: meta.module,
    });
    logOps(res.status >= 400 ? "warn" : "info", {
      timestamp: new Date().toISOString(),
      correlationId,
      userId: meta.userId,
      module: meta.module,
      action: meta.action,
      result: res.status >= 400 ? "Failure" : "Success",
      durationMs,
      httpStatus: res.status,
      endpoint: meta.endpoint,
    });
    return res;
  } catch (err) {
    const durationMs = Date.now() - startedAt;
    const message = err instanceof Error ? err.message : "Unhandled route exception";
    recordOpsError({
      module: meta.module,
      action: meta.action,
      code: "UNHANDLED_ROUTE_EXCEPTION",
      message,
      correlationId,
      httpStatus: 500,
      endpoint: meta.endpoint,
      userId: meta.userId,
    });
    recordApiTiming({
      endpoint: meta.endpoint,
      method: request.method,
      durationMs,
      httpStatus: 500,
      correlationId,
      module: meta.module,
    });
    return errorResponse(500, "INTERNAL_ERROR", "An unexpected error occurred", undefined, {
      correlationId,
      module: meta.module,
      action: meta.action,
      endpoint: meta.endpoint,
      userId: meta.userId,
      durationMs,
    });
  }
}
