/**
 * CO-WP-102 — Partner route helpers (CORS + Zero-Trust requirePartnerAccessToken).
 */
import { NextResponse } from "next/server";
import {
  errorResponse,
  jsonResponse,
  successResponse,
} from "@/lib/api/auth-route-utils";
import { PARTNER_DEFAULT_ALLOWED_ORIGINS } from "@/constants/enterprise-partner-gateway";
import { verifyPartnerAccessToken } from "@server/services/partner-gateway/partner-token.service";
import type { PartnerTokenPayload } from "@/types/enterprise-partner-gateway";
import { PartnerGatewayError } from "@server/services/partner-gateway/partner-auth.service";

function allowedOrigins(): string[] {
  const fromEnv = (process.env.PARTNER_APP_ORIGINS ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const single = (process.env.NEXT_PUBLIC_WEALTH_PARTNER_APP_URL ?? "").trim();
  return [
    ...PARTNER_DEFAULT_ALLOWED_ORIGINS,
    ...fromEnv,
    ...(single ? [single] : []),
  ];
}

export function resolvePartnerCorsOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const allowed = allowedOrigins();
  if (allowed.includes(origin)) return origin;
  return null;
}

export function withPartnerCors(request: Request, response: NextResponse): NextResponse {
  const origin = resolvePartnerCorsOrigin(request);
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
    response.headers.set("Access-Control-Allow-Credentials", "true");
  }
  response.headers.set(
    "Access-Control-Allow-Headers",
    "Authorization, Content-Type, X-Requested-With",
  );
  response.headers.set("Access-Control-Allow-Methods", "GET, POST, PATCH, OPTIONS");
  return response;
}

export function partnerOptionsResponse(request: Request): NextResponse {
  return withPartnerCors(request, new NextResponse(null, { status: 204 }));
}

function getBearerToken(request: Request): string | null {
  const header = request.headers.get("authorization") || request.headers.get("Authorization");
  if (!header?.startsWith("Bearer ")) return null;
  return header.slice(7).trim() || null;
}

/**
 * Zero-Trust gate: partner JWT with Partner UUID claims required.
 * Employee tokens (no aud=wealth_partner_app) are rejected.
 */
export function requirePartnerAccessToken(request: Request): PartnerTokenPayload {
  const token = getBearerToken(request);
  if (!token) {
    throw new PartnerGatewayError("Authentication required", "UNAUTHORIZED", 401);
  }
  try {
    return verifyPartnerAccessToken(token);
  } catch {
    throw new PartnerGatewayError("Invalid or expired partner token", "INVALID_TOKEN", 401);
  }
}

export function mapPartnerError(err: unknown): NextResponse {
  if (err instanceof PartnerGatewayError) {
    return errorResponse(err.statusCode, err.code, err.message);
  }
  const message = err instanceof Error ? err.message : "Partner gateway error";
  return errorResponse(400, "PARTNER_GATEWAY_ERROR", message);
}

export function partnerSuccess<T>(request: Request, data: T, status = 200): NextResponse {
  return withPartnerCors(request, successResponse(data, status));
}

export function partnerError(request: Request, err: unknown): NextResponse {
  return withPartnerCors(request, mapPartnerError(err));
}

export function partnerJson(
  request: Request,
  body: unknown,
  status = 200,
): NextResponse {
  return withPartnerCors(request, jsonResponse(body as never, status));
}
