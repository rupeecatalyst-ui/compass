/**
 * CO-ADMIN-005 — Client product master options (registry-first, canonical fallback).
 */
import { getAccessToken } from "@/lib/api-client";
import {
  listCanonicalProductOptions,
  resolveCanonicalProductCode,
} from "@/constants/enterprise-product-master";

export type ProductMasterOption = {
  code: string;
  label: string;
  isSecured?: boolean | null;
  sortOrder?: number;
  enabled?: boolean;
  id?: string;
};

let cache: { at: number; options: ProductMasterOption[] } | null = null;
const CACHE_MS = 15 * 60 * 1000; // CO-PERF-002 Tier-0 — products are relatively static

export function getFallbackProductMasterOptions(): ProductMasterOption[] {
  return listCanonicalProductOptions(true);
}

export async function fetchProductMasterOptions(opts?: {
  enabledOnly?: boolean;
  force?: boolean;
}): Promise<ProductMasterOption[]> {
  const enabledOnly = opts?.enabledOnly !== false;
  if (!opts?.force && cache && Date.now() - cache.at < CACHE_MS) {
    return enabledOnly ? cache.options.filter((o) => o.enabled !== false) : cache.options;
  }

  try {
    const token = getAccessToken();
    const qs = new URLSearchParams({
      pageSize: "200",
      sortBy: "sortOrder",
      sortDir: "asc",
      ...(enabledOnly ? { enabled: "true" } : {}),
    });
    const res = await fetch(`/api/product-registry/products?${qs}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    const json = await res.json();
    if (res.ok && json.success && Array.isArray(json.data?.items) && json.data.items.length > 0) {
      const options: ProductMasterOption[] = json.data.items.map(
        (p: {
          id: string;
          code: string;
          label: string;
          isSecured?: boolean | null;
          sortOrder?: number;
          enabled?: boolean;
        }) => ({
          id: p.id,
          code: p.code,
          label: p.label,
          isSecured: p.isSecured,
          sortOrder: p.sortOrder ?? 0,
          enabled: p.enabled,
        }),
      );
      cache = { at: Date.now(), options };
      return options;
    }
  } catch {
    /* fall through */
  }

  const fallback = getFallbackProductMasterOptions();
  cache = { at: Date.now(), options: fallback };
  return fallback;
}

export function invalidateProductMasterOptionsCache() {
  cache = null;
}

export function resolveProductOptionLabel(
  code: string | null | undefined,
  options: ProductMasterOption[],
): string {
  const resolved = resolveCanonicalProductCode(code);
  if (!resolved) return "";
  return options.find((o) => o.code === resolved)?.label ?? code ?? "";
}
