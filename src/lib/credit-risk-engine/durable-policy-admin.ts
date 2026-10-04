import { authenticatedJsonFetch } from "@/lib/api-client";
import { unwrapResponse } from "@/lib/response-handler";
import type { CreditRiskAuditEntry, CreditRiskPolicySummary, PolicyRuleReference } from "@/types/credit-risk-engine";
import type { ApiResponse } from "@/types/api";

export type DurablePolicyRecord = CreditRiskPolicySummary & { ruleRefs: PolicyRuleReference[] };
export type DurablePolicyDetails = DurablePolicyRecord & { versions: DurablePolicyRecord[]; auditEvents: CreditRiskAuditEntry[] };
export type DurablePolicyDraft = {
  policyCode: string; policyName: string; description: string;
  lenderId: string; lenderName: string; productId: string; productName: string;
  customerCategoryId?: string; customerCategoryName?: string;
  priority: number; approvalAuthority: string;
  effectiveFrom?: string; effectiveTo?: string;
  ruleRefs: Omit<PolicyRuleReference, "id" | "policyId">[];
};

const base = "/api/credit-risk/policies";

async function nextPolicyRequest<T>(url: string, method: "GET" | "POST" | "PUT", data?: unknown): Promise<T> {
  const response = await authenticatedJsonFetch(url, {
    method,
    ...(data === undefined ? {} : { body: JSON.stringify(data) }),
  });
  const body = await response.json() as ApiResponse<T>;
  return unwrapResponse(body);
}

export async function listDurablePolicies(): Promise<DurablePolicyRecord[]> {
  return nextPolicyRequest(base, "GET");
}

export async function getDurablePolicy(policyId: string): Promise<DurablePolicyDetails> {
  return nextPolicyRequest(`${base}/${encodeURIComponent(policyId)}`, "GET");
}

export async function saveDurablePolicy(draft: DurablePolicyDraft, policyId?: string): Promise<DurablePolicyRecord> {
  return nextPolicyRequest(policyId ? `${base}/${encodeURIComponent(policyId)}` : base, policyId ? "PUT" : "POST", draft);
}

export async function transitionDurablePolicy(policyId: string, to: "validated" | "testing" | "approved" | "published"): Promise<DurablePolicyRecord> {
  return nextPolicyRequest(`${base}/${encodeURIComponent(policyId)}/transition`, "POST", { to });
}
