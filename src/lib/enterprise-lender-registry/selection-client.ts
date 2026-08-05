/**
 * CO-LENDER-SSOT-REMEDIATE-001 — Strict Enterprise Lender Registry selection client.
 * Prisma API only. No Soft Go-Live / localStorage fallback.
 */
import { authenticatedJsonFetch } from "@/lib/api-client";
import {
  ELR_SELECTION_PAGE_SIZE_DEFAULT,
  ELR_SELECTION_PAGE_SIZE_MAX,
} from "@/constants/enterprise-lender-registry/selection";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";

export class EnterpriseLenderRegistryUnavailableError extends Error {
  readonly code = "ELR_UNAVAILABLE";
  constructor(message: string) {
    super(message);
    this.name = "EnterpriseLenderRegistryUnavailableError";
  }
}

type ApiEnvelope<T> = {
  success?: boolean;
  data?: T;
  error?: { message?: string; code?: string };
};

export type ElrSelectionQuery = {
  search?: string;
  /** Defaults to full active published set (up to ELR_SELECTION_PAGE_SIZE_MAX). */
  pageSize?: number;
  page?: number;
};

function lenderDisplayName(lender: EnterpriseLenderRecord): string {
  return (
    lender.displayName?.trim() ||
    lender.legalName?.trim() ||
    lender.label?.trim() ||
    lender.shortName?.trim() ||
    lender.code
  );
}

/**
 * Server-side search / list for every lender selector.
 * Filters: not deleted · status active · enabled · lifecycle active.
 */
export async function searchEnterpriseLendersForSelection(
  query: ElrSelectionQuery = {},
): Promise<{ items: EnterpriseLenderRecord[]; total: number }> {
  const pageSize = Math.min(
    ELR_SELECTION_PAGE_SIZE_MAX,
    Math.max(1, query.pageSize ?? ELR_SELECTION_PAGE_SIZE_DEFAULT),
  );
  const params = new URLSearchParams({
    page: String(query.page ?? 1),
    pageSize: String(pageSize),
    status: "active",
    enabled: "true",
    lifecycleStatus: "active",
  });
  if (query.search?.trim()) params.set("search", query.search.trim());

  let res: Response;
  try {
    res = await authenticatedJsonFetch(`/api/lender-registry/lenders?${params}`);
  } catch {
    throw new EnterpriseLenderRegistryUnavailableError(
      "Enterprise Lender Registry is unreachable. Check your connection and retry.",
    );
  }

  if (res.status === 401) {
    throw new EnterpriseLenderRegistryUnavailableError(
      "Session expired. Sign in again to search the Enterprise Lender Registry.",
    );
  }
  if (res.status === 503) {
    throw new EnterpriseLenderRegistryUnavailableError(
      "Enterprise Lender Registry requires prisma persistence mode. Contact an administrator.",
    );
  }

  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<{
    items?: EnterpriseLenderRecord[];
    total?: number;
  }>;

  if (!res.ok || !body.success || !Array.isArray(body.data?.items)) {
    throw new EnterpriseLenderRegistryUnavailableError(
      body.error?.message ||
        `Enterprise Lender Registry unavailable (${res.status}${
          body.error?.code ? ` · ${body.error.code}` : ""
        }).`,
    );
  }

  const items = body.data.items.filter(
    (l) => !l.isDeleted && l.enabled && l.status === "active",
  );
  return {
    items,
    total: typeof body.data.total === "number" ? body.data.total : items.length,
  };
}

export async function getEnterpriseLenderForSelection(
  id: string,
): Promise<EnterpriseLenderRecord | null> {
  let res: Response;
  try {
    res = await authenticatedJsonFetch(`/api/lender-registry/lenders/${id}`);
  } catch {
    throw new EnterpriseLenderRegistryUnavailableError(
      "Enterprise Lender Registry is unreachable. Check your connection and retry.",
    );
  }
  if (res.status === 404) return null;
  if (res.status === 401) {
    throw new EnterpriseLenderRegistryUnavailableError(
      "Session expired. Sign in again to load the Enterprise Lender Registry.",
    );
  }
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<EnterpriseLenderRecord>;
  if (!res.ok || !body.success || !body.data) {
    throw new EnterpriseLenderRegistryUnavailableError(
      body.error?.message || "Failed to load lender from Enterprise Lender Registry.",
    );
  }
  return body.data;
}

export { lenderDisplayName };
