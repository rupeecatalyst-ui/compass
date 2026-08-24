/**
 * CO-CHATGPT-INTEGRATION-V1 — In-memory sliding-window rate limiter.
 */

import { createHash } from "node:crypto";
import {
  CHATGPT_INTEGRATION_RATE_LIMIT_MAX_REQUESTS,
  CHATGPT_INTEGRATION_RATE_LIMIT_WINDOW_MS,
} from "@/lib/chatgpt-integration/constants";

type Bucket = {
  windowStart: number;
  count: number;
};

const buckets = new Map<string, Bucket>();

function bucketKey(request: Request, apiKeyHint: string | null): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const ip = forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
  if (apiKeyHint) {
    const hash = createHash("sha256").update(apiKeyHint).digest("hex").slice(0, 16);
    return `key:${hash}`;
  }
  return `ip:${ip}`;
}

export type ChatGptRateLimitResult =
  | { allowed: true; remaining: number; resetAt: number }
  | { allowed: false; remaining: 0; resetAt: number; retryAfterSec: number };

export function checkChatGptIntegrationRateLimit(
  request: Request,
  apiKey: string | null,
): ChatGptRateLimitResult {
  const now = Date.now();
  const key = bucketKey(request, apiKey);
  let bucket = buckets.get(key);

  if (!bucket || now - bucket.windowStart >= CHATGPT_INTEGRATION_RATE_LIMIT_WINDOW_MS) {
    bucket = { windowStart: now, count: 0 };
    buckets.set(key, bucket);
  }

  if (bucket.count >= CHATGPT_INTEGRATION_RATE_LIMIT_MAX_REQUESTS) {
    const resetAt = bucket.windowStart + CHATGPT_INTEGRATION_RATE_LIMIT_WINDOW_MS;
    const retryAfterSec = Math.max(1, Math.ceil((resetAt - now) / 1000));
    return { allowed: false, remaining: 0, resetAt, retryAfterSec };
  }

  bucket.count += 1;
  const resetAt = bucket.windowStart + CHATGPT_INTEGRATION_RATE_LIMIT_WINDOW_MS;
  return {
    allowed: true,
    remaining: Math.max(0, CHATGPT_INTEGRATION_RATE_LIMIT_MAX_REQUESTS - bucket.count),
    resetAt,
  };
}

/** Test-only reset */
export function resetChatGptIntegrationRateLimitForTests(): void {
  buckets.clear();
}
