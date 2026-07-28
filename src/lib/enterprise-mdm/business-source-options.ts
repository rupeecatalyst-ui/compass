/**
 * CO-MDM-001 — Business Source options (registry-first, constant fallback).
 * Preserves OPPORTUNITY_BUSINESS_SOURCES as reference seed / offline fallback.
 */
import { getAccessToken } from "@/lib/api-client";
import {
  OPPORTUNITY_BUSINESS_SOURCES,
  type OpportunityBusinessSourceCode,
} from "@/constants/opportunity-business-source";

export type BusinessSourceOption = {
  code: string;
  label: string;
  kpiBucket?: string;
};

let cache: { at: number; options: BusinessSourceOption[] } | null = null;
const CACHE_MS = 30_000;

export function getFallbackBusinessSourceOptions(): BusinessSourceOption[] {
  return OPPORTUNITY_BUSINESS_SOURCES.map((s) => ({
    code: s.code,
    label: s.label,
    kpiBucket: s.kpiBucket,
  }));
}

export async function fetchBusinessSourceOptions(opts?: {
  force?: boolean;
}): Promise<BusinessSourceOption[]> {
  if (!opts?.force && cache && Date.now() - cache.at < CACHE_MS) {
    return cache.options;
  }

  try {
    const token = getAccessToken();
    const qs = new URLSearchParams({
      domain: "business_source",
      pageSize: "200",
      status: "active",
      enabled: "true",
      sortBy: "sortOrder",
      sortDir: "asc",
    });
    const res = await fetch(`/api/reference-masters?${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json();
    if (res.ok && json.success && Array.isArray(json.data?.items) && json.data.items.length > 0) {
      const options: BusinessSourceOption[] = json.data.items.map(
        (row: { code: string; label: string; meta?: { kpiBucket?: string } }) => ({
          code: row.code,
          label: row.label,
          kpiBucket: row.meta?.kpiBucket,
        }),
      );
      cache = { at: Date.now(), options };
      return options;
    }
  } catch {
    /* fall through */
  }

  const fallback = getFallbackBusinessSourceOptions();
  cache = { at: Date.now(), options: fallback };
  return fallback;
}

export function invalidateBusinessSourceOptionsCache() {
  cache = null;
}

export function isKnownBusinessSourceCode(
  value: string | null | undefined,
  options: BusinessSourceOption[],
): value is OpportunityBusinessSourceCode | string {
  if (!value?.trim()) return false;
  return options.some((o) => o.code === value.trim());
}
