/**
 * Monitoring timestamps arrive as ISO strings from memory fixtures and as Date
 * objects from Prisma. Ordering must not assume every value is a string.
 */

export function marketingMonitoringTimestampMs(value: unknown): number | null {
  if (value instanceof Date) {
    const ms = value.getTime();
    return Number.isFinite(ms) ? ms : null;
  }
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    const ms = Date.parse(trimmed);
    return Number.isFinite(ms) ? ms : null;
  }
  return null;
}

export function marketingMonitoringTimestampIso(value: unknown): string | null {
  const ms = marketingMonitoringTimestampMs(value);
  if (ms == null) return null;
  return new Date(ms).toISOString();
}
