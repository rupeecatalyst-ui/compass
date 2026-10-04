/**
 * In-process customer rate limit for COMPASS public journey entry.
 * This is not a substitute for an edge limiter. It fails closed once the
 * in-memory bucket is full.
 */

import { createHash } from "node:crypto";
import { CompassJourneyError } from "./compass-journey-errors";

const WINDOW_MS = 10 * 60 * 1000;
const LIMIT = 8;
const buckets = new Map<string, number[]>();

function keyFor(subject: string): string {
  return createHash("sha256").update(subject).digest("hex").slice(0, 24);
}

export function assertCompassCustomerRateLimit(subject: string): void {
  const now = Date.now();
  const key = keyFor(subject || "anonymous");
  const recent = (buckets.get(key) ?? []).filter((at) => now - at < WINDOW_MS);
  if (recent.length >= LIMIT) {
    throw new CompassJourneyError(
      "TOO_MANY_REQUESTS",
      "Please wait a moment and try again.",
      429,
    );
  }
  recent.push(now);
  buckets.set(key, recent);
}

export function resetCompassCustomerRateLimitForTests(): void {
  buckets.clear();
}
