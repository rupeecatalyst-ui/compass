/**
 * CO-ARCH-001-I6b — Browser Tier 2 registry REST client.
 */
import { authenticatedJsonFetch } from "@/lib/api-client";
import type {
  EnterpriseDocumentDefinitionRecord,
  EnterpriseDocumentTypeRecord,
} from "@/types/enterprise-document-registry";
import type {
  EnterpriseLenderCategoryRecord,
  EnterpriseLenderProgramRecord,
  EnterpriseLenderRecord,
} from "@/types/enterprise-lender-registry";
import type {
  EnterpriseProductCategoryRecord,
  EnterpriseProductGroupRecord,
  EnterpriseProductRecord,
} from "@/types/enterprise-product-registry";

async function tier2Fetch<T>(url: string, init?: RequestInit): Promise<T> {
  const res = await authenticatedJsonFetch(url, init);
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success) {
    throw new Error(body?.error?.message || `Tier 2 registry request failed (${res.status})`);
  }
  return body.data as T;
}

function activeListParams(pageSize = 5000): string {
  return new URLSearchParams({
    page: "1",
    pageSize: String(pageSize),
    status: "active",
    enabled: "true",
  }).toString();
}

export const tier2RegistryApiClient = {
  async listProductCategories() {
    return tier2Fetch<{ items: EnterpriseProductCategoryRecord[]; total: number }>(
      `/api/product-registry/categories?${activeListParams()}`,
    );
  },
  async listProductGroups() {
    return tier2Fetch<{ items: EnterpriseProductGroupRecord[]; total: number }>(
      `/api/product-registry/groups?${activeListParams()}`,
    );
  },
  async listProducts() {
    return tier2Fetch<{ items: EnterpriseProductRecord[]; total: number }>(
      `/api/product-registry/products?${activeListParams()}`,
    );
  },
  async listDocumentTypes() {
    return tier2Fetch<{ items: EnterpriseDocumentTypeRecord[]; total: number }>(
      `/api/document-registry/types?${activeListParams()}`,
    );
  },
  async listDocumentDefinitions() {
    return tier2Fetch<{ items: EnterpriseDocumentDefinitionRecord[]; total: number }>(
      `/api/document-registry/definitions?${activeListParams()}`,
    );
  },
  async listLenderCategories() {
    return tier2Fetch<{ items: EnterpriseLenderCategoryRecord[]; total: number }>(
      `/api/lender-registry/categories?${activeListParams()}`,
    );
  },
  async listLenders() {
    return tier2Fetch<{ items: EnterpriseLenderRecord[]; total: number }>(
      `/api/lender-registry/lenders?${activeListParams()}`,
    );
  },
  async listLenderPrograms() {
    return tier2Fetch<{ items: EnterpriseLenderProgramRecord[]; total: number }>(
      `/api/lender-registry/programs?${activeListParams()}`,
    );
  },
};

