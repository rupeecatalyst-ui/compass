/**
 * Quota-aware Google Sheets retries. Bounded, jittered, fail-closed.
 */

import {
  MARKETING_SHEETS_QUOTA_ERROR_CODE,
  MARKETING_SHEETS_QUOTA_MAX_RETRIES,
  MARKETING_SHEETS_QUOTA_USER_MESSAGE,
} from "@/constants/enterprise-marketing-engine/data-source";
import { getLastSuccessfulSheetsSyncAt } from "./google-sheets-read-cache";

export function isGoogleSheetsQuotaError(err: unknown): boolean {
  const message = err instanceof Error ? err.message : String(err);
  const named = err as {
    code?: unknown;
    status?: unknown;
    response?: { status?: unknown; data?: { error?: { status?: unknown; errors?: Array<{ reason?: unknown }> } } };
  };
  const status = String(named?.code ?? named?.status ?? named?.response?.status ?? "");
  const reason = String(
    named?.response?.data?.error?.errors?.[0]?.reason ?? named?.response?.data?.error?.status ?? "",
  );
  if (status === "429") return true;
  if (/quotaExceeded|rateLimitExceeded|RESOURCE_EXHAUSTED/i.test(reason)) return true;
  return /429|quota exceeded|rate limit/i.test(message);
}

function retryAfterMs(err: unknown, fallback: number): number {
  const named = err as { response?: { headers?: Record<string, string | string[] | undefined> } };
  const raw = named?.response?.headers?.["retry-after"] ?? named?.response?.headers?.["Retry-After"];
  const header = Array.isArray(raw) ? raw[0] : raw;
  const seconds = header ? Number.parseInt(String(header), 10) : Number.NaN;
  if (Number.isFinite(seconds) && seconds >= 0) return Math.min(seconds * 1000, 20_000);
  const jitter = 0.5 + Math.random();
  return Math.round(fallback * jitter);
}

export function createSheetsQuotaExceededError(cause?: unknown): Error {
  const sync = getLastSuccessfulSheetsSyncAt();
  const suffix = sync
    ? ` Last successful Google sync: ${sync}.`
    : " No successful Google sync is recorded in this process.";
  return Object.assign(new Error(`${MARKETING_SHEETS_QUOTA_USER_MESSAGE}${suffix}`), {
    statusCode: 429,
    code: MARKETING_SHEETS_QUOTA_ERROR_CODE,
    lastSuccessfulSyncAt: sync,
    cause,
  });
}

export async function withSheetsQuota<T>(read: () => Promise<T>): Promise<T> {
  let waitMs = 600;
  let lastErr: unknown;
  const attempts = MARKETING_SHEETS_QUOTA_MAX_RETRIES + 1;
  for (let attempt = 0; attempt < attempts; attempt += 1) {
    try {
      return await read();
    } catch (err) {
      lastErr = err;
      if (!isGoogleSheetsQuotaError(err) || attempt === attempts - 1) {
        if (isGoogleSheetsQuotaError(err)) throw createSheetsQuotaExceededError(err);
        throw err;
      }
      const delay =
        process.env.MARKETING_SHEETS_QUOTA_FAST_RETRY === "true"
          ? 0
          : retryAfterMs(err, waitMs);
      await new Promise((resolve) => setTimeout(resolve, delay));
      waitMs *= 2;
    }
  }
  throw createSheetsQuotaExceededError(lastErr);
}
