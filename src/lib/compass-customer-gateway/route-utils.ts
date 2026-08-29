import "server-only";

import { createHash } from "node:crypto";
import { NextResponse } from "next/server";
import { createCorrelationId } from "@/lib/ops/correlation";
import { errorResponse, successResponse } from "@/lib/api/auth-route-utils";

const RATE_LIMIT_WINDOW_MS = 60_000;
const RATE_LIMIT_MAX = 120;

type Bucket = { windowStart: number; count: number };
const buckets = new Map<string, Bucket>();

function bucketKey(request: Request, apiKeyHint: string | null): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  if (apiKeyHint) {
    const hash = createHash("sha256").update(apiKeyHint).digest("hex").slice(0, 16);
    return `compass:key:${hash}`;
  }
  return `compass:ip:${ip}`;
}

function checkRateLimit(request: Request, apiKey: string | null): boolean {
  const now = Date.now();
  const key = bucketKey(request, apiKey);
  let bucket = buckets.get(key);
  if (!bucket || now - bucket.windowStart >= RATE_LIMIT_WINDOW_MS) {
    bucket = { windowStart: now, count: 0 };
    buckets.set(key, bucket);
  }
  if (bucket.count >= RATE_LIMIT_MAX) return false;
  bucket.count += 1;
  return true;
}

export function resolveCompassGatewayApiKey(request: Request): string | null {
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  return request.headers.get("x-compass-gateway-key")?.trim() || null;
}

export function assertCompassGatewayAuthorized(request: Request): string | NextResponse {
  const correlationId = createCorrelationId();
  const expected = process.env.COMPASS_GATEWAY_API_KEY?.trim();
  if (!expected) {
    return errorResponse(
      503,
      "NOT_CONFIGURED",
      "COMPASS Customer Gateway is not configured on this deployment.",
      undefined,
      { correlationId, module: "compass-customer-gateway", action: "NOT_CONFIGURED" },
    );
  }
  const provided = resolveCompassGatewayApiKey(request);
  if (!provided || provided !== expected) {
    return errorResponse(401, "UNAUTHORIZED", "Invalid COMPASS gateway credentials.", undefined, {
      correlationId,
      module: "compass-customer-gateway",
      action: "UNAUTHORIZED",
    });
  }
  if (!checkRateLimit(request, provided)) {
    return errorResponse(429, "RATE_LIMITED", "Too many requests. Please retry shortly.", undefined, {
      correlationId,
      module: "compass-customer-gateway",
      action: "RATE_LIMITED",
    });
  }
  return expected;
}

export function compassGatewaySuccess<T>(data: T, status = 200) {
  return successResponse(data, status, createCorrelationId());
}

export function compassGatewayError(
  status: number,
  code: string,
  message: string,
): NextResponse {
  return errorResponse(status, code, message, undefined, {
    correlationId: createCorrelationId(),
    module: "compass-customer-gateway",
    action: code,
  });
}

export function readBearerJourneyToken(request: Request): string | null {
  const auth = request.headers.get("authorization")?.trim();
  if (auth?.toLowerCase().startsWith("bearer ")) {
    return auth.slice(7).trim() || null;
  }
  return request.headers.get("x-compass-journey-token")?.trim() || null;
}
