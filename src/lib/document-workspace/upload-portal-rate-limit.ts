/**
 * CO-C1-DOCUMENT-WORKSPACE-REFINEMENT-014B
 * In-memory rate-limit hook for the customer upload portal.
 * Bucket keys must already be hashed — never pass raw tokens or OTPs.
 */

const WINDOW_MS = 10 * 60 * 1000;
const MAX_ATTEMPTS = 30;

type WindowState = { count: number; resetAt: number };

const windows = new Map<string, WindowState>();

export function consumeUploadPortalRateLimit(
  hashedBucket: string,
  maxAttempts = MAX_ATTEMPTS,
  windowMs = WINDOW_MS,
): boolean {
  const key = hashedBucket.trim();
  if (!key) return false;
  const now = Date.now();
  const current = windows.get(key);
  if (!current || current.resetAt <= now) {
    windows.set(key, { count: 1, resetAt: now + windowMs });
    return true;
  }
  if (current.count >= maxAttempts) return false;
  current.count += 1;
  return true;
}

export function resetUploadPortalRateLimitForTests(): void {
  windows.clear();
}
