/**
 * CO-OPS-002 — Correlation IDs for request tracing.
 */

export const OPS_CORRELATION_HEADER = "x-correlation-id";

export function createCorrelationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ops-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function resolveCorrelationId(request?: Request | null): string {
  const fromHeader = request?.headers.get(OPS_CORRELATION_HEADER)?.trim();
  if (fromHeader && fromHeader.length <= 128) return fromHeader;
  return createCorrelationId();
}
