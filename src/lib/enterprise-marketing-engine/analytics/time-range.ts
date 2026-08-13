/**
 * CO-MARKETING-MKT-10 — Analytics time-range resolution (UTC).
 */

import type {
  MarketingAnalyticsRangePreset,
  MarketingAnalyticsTimeRange,
} from "@/types/enterprise-marketing-analytics";
import { MARKETING_ANALYTICS_RANGE_PRESETS } from "@/types/enterprise-marketing-analytics";
import { MARKETING_ANALYTICS_DEFAULT_PRESET } from "@/constants/enterprise-marketing-engine/analytics";

export function isMarketingAnalyticsRangePreset(
  value: string | null | undefined,
): value is MarketingAnalyticsRangePreset {
  return !!value && (MARKETING_ANALYTICS_RANGE_PRESETS as readonly string[]).includes(value);
}

export function resolveMarketingAnalyticsTimeRange(input: {
  preset?: string | null;
  from?: string | null;
  to?: string | null;
  now?: Date;
}): MarketingAnalyticsTimeRange {
  const now = input.now ?? new Date();
  const to = now.toISOString();
  const preset = isMarketingAnalyticsRangePreset(input.preset)
    ? input.preset
    : MARKETING_ANALYTICS_DEFAULT_PRESET;

  if (preset === "custom") {
    const fromRaw = input.from?.trim();
    const toRaw = input.to?.trim();
    if (!fromRaw || !toRaw) {
      throw Object.assign(new Error("Custom range requires from and to (ISO-8601)"), {
        statusCode: 400,
        code: "INVALID_ANALYTICS_RANGE",
      });
    }
    const fromMs = Date.parse(fromRaw);
    const toMs = Date.parse(toRaw);
    if (!Number.isFinite(fromMs) || !Number.isFinite(toMs) || fromMs > toMs) {
      throw Object.assign(new Error("Custom range from/to is invalid"), {
        statusCode: 400,
        code: "INVALID_ANALYTICS_RANGE",
      });
    }
    return { preset: "custom", from: new Date(fromMs).toISOString(), to: new Date(toMs).toISOString() };
  }

  if (preset === "today") {
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
    return { preset, from: start.toISOString(), to };
  }

  const days = preset === "last_3_days" ? 3 : preset === "last_30_days" ? 30 : 7;
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return { preset, from: from.toISOString(), to };
}

export function isTimestampInRange(iso: string | null | undefined, range: MarketingAnalyticsTimeRange): boolean {
  if (!iso) return false;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return false;
  const from = Date.parse(range.from);
  const to = Date.parse(range.to);
  return ms >= from && ms <= to;
}
