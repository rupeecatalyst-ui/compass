/**
 * CO-ARCH-001-I5a — Browser Reference Master REST client.
 */
import { authenticatedJsonFetch } from "@/lib/api-client";
import type { ReferenceMasterDomainCode } from "@/constants/enterprise-master-data";
import type {
  EnterpriseReferenceMasterRecord,
  ReferenceMasterDomainSummary,
} from "@/types/enterprise-master-data";

async function refMasterFetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await authenticatedJsonFetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body?.error?.message || `Reference master request failed (${res.status})`);
  }
  return body.data as T;
}

export const referenceMasterApiClient = {
  async listDomains(): Promise<ReferenceMasterDomainSummary[]> {
    return refMasterFetch("/api/reference-masters/domains");
  },

  async queryByDomain(domain: ReferenceMasterDomainCode, pageSize = 500) {
    const params = new URLSearchParams({
      domain,
      page: "1",
      pageSize: String(pageSize),
      status: "active",
      enabled: "true",
    });
    return refMasterFetch<{
      items: EnterpriseReferenceMasterRecord[];
      total: number;
    }>(`/api/reference-masters?${params.toString()}`);
  },
};
