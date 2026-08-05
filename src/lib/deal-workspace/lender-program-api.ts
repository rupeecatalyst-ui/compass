/**
 * CO-ARCH-003 Phase 2B Sprint 2 — Lender / program clients for Deal Workspace.
 */
import { authenticatedJsonFetch } from "@/lib/api-client";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";
import type { EnterpriseLenderRecord } from "@/types/enterprise-lender-registry";

type ApiEnvelope<T> = {
  success: boolean;
  data?: T;
  error?: { message?: string };
};

async function apiFetch<T>(url: string): Promise<T> {
  const res = await authenticatedJsonFetch(url);
  const body = (await res.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!res.ok || !body.success) {
    throw new Error(body.error?.message || `Lender API failed (${res.status})`);
  }
  return body.data as T;
}

export async function searchActiveLenders(opts?: {
  search?: string;
  pageSize?: number;
}): Promise<EnterpriseLenderRecord[]> {
  const params = new URLSearchParams({
    page: "1",
    pageSize: String(opts?.pageSize ?? 5000),
    status: "active",
    enabled: "true",
    lifecycleStatus: "active",
  });
  if (opts?.search?.trim()) params.set("search", opts.search.trim());
  const data = await apiFetch<{ items: EnterpriseLenderRecord[]; total: number }>(
    `/api/lender-registry/lenders?${params}`,
  );
  return data.items ?? [];
}

export async function listLenderPrograms(opts: {
  lenderId: string;
  productId?: string | null;
}): Promise<EnterpriseLenderProgramRecord[]> {
  const params = new URLSearchParams({
    page: "1",
    pageSize: "200",
    lenderId: opts.lenderId,
    lifecycleStatus: "published",
  });
  // Also accept active programs if published filter empty — query both via "all" and filter client-side
  params.set("lifecycleStatus", "all");
  if (opts.productId) params.set("productId", opts.productId);
  try {
    const data = await apiFetch<{ items: EnterpriseLenderProgramRecord[] }>(
      `/api/lender-registry/programs?${params}`,
    );
    return (data.items ?? []).filter(
      (p) =>
        p.enabled &&
        p.status === "active" &&
        !p.isDeleted &&
        (p.lifecycleStatus === "active" || p.lifecycleStatus === "draft"),
    );
  } catch {
    return [];
  }
}
