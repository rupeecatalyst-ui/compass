import { NextResponse } from "next/server";
import { verifyAccessToken, type TokenPayload } from "@server/services/token.service";
import type { ApiResponse } from "@/types/api";

export function jsonResponse<T>(body: ApiResponse<T>, status = 200): NextResponse {
  return NextResponse.json(body, { status });
}

export function successResponse<T>(data: T, status = 200): NextResponse {
  return jsonResponse({ success: true, data }, status);
}

export function errorResponse(
  status: number,
  code: string,
  message: string,
  details?: Record<string, string[]>,
): NextResponse {
  return jsonResponse({
    success: false,
    error: { code, message, details, statusCode: status },
  }, status);
}

export function fromAuthError(error: { status: number; body: ApiResponse }): NextResponse {
  return NextResponse.json(error.body, { status: error.status });
}

export function getBearerToken(request: Request): string | null {
  const authHeader = request.headers.get("authorization");
  if (!authHeader?.startsWith("Bearer ")) return null;
  return authHeader.slice(7);
}

export function requireAccessToken(request: Request): TokenPayload {
  const token = getBearerToken(request);
  if (!token) {
    throw { status: 401, body: { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } };
  }

  try {
    return verifyAccessToken(token);
  } catch {
    throw { status: 401, body: { success: false, error: { code: "INVALID_TOKEN", message: "Invalid or expired token" } } };
  }
}
