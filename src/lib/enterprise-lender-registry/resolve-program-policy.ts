/**
 * CO-MASTER-002 — Resolve Credit & Risk policy for a lender program.
 * CRE remains the authoritative policy catalogue; this module does not evaluate rules.
 */

import {
  getCreditRiskPolicyById,
  getLatestPolicyVersions,
  getPublishedPolicies,
} from "@/lib/credit-risk-engine/policy-store";
import { isPolicyActive } from "@/constants/credit-risk-policy-lifecycle";
import type { CreditRiskPolicySummary } from "@/types/credit-risk-engine";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

export type ProgramPolicyResolution = {
  ok: boolean;
  source: "program_ref" | "lender_product_fallback" | "none";
  ref?: string | null;
  policy?: CreditRiskPolicySummary;
  error?: string;
};

/** Resolve CRE policy by policyId or policyCode (published required for runtime). */
export function resolveCreditRiskPolicyByRef(
  ref: string | null | undefined,
  options?: { requirePublished?: boolean },
): { policy?: CreditRiskPolicySummary; error?: string } {
  const raw = (ref ?? "").trim();
  if (!raw) return { error: "Policy reference is empty." };

  const requirePublished = options?.requirePublished !== false;
  let policy = getCreditRiskPolicyById(raw);
  if (!policy) {
    policy = getLatestPolicyVersions().find(
      (p) => p.policyCode?.toLowerCase() === raw.toLowerCase() || p.policyId === raw,
    );
  }
  if (!policy) {
    return { error: `Credit & Risk policy not found for reference “${raw}”.` };
  }
  if (requirePublished && !isPolicyActive(policy.status)) {
    return {
      error: `Policy “${policy.policyCode || policy.policyId}” is ${policy.status} (must be published).`,
    };
  }
  return { policy };
}

/** Validate program.creditRiskPolicyRef at write time. Empty ref is allowed. */
export function validateProgramCreditRiskPolicyRef(
  ref: string | null | undefined,
): { ok: true } | { ok: false; error: string } {
  if (!(ref ?? "").trim()) return { ok: true };
  const resolved = resolveCreditRiskPolicyByRef(ref, { requirePublished: true });
  if (resolved.error || !resolved.policy) {
    return { ok: false, error: resolved.error || "Invalid Credit & Risk policy reference." };
  }
  return { ok: true };
}

/**
 * Program → Policy resolution for Lender Pipeline / Credit & Risk consumers.
 * 1) Explicit program.creditRiskPolicyRef
 * 2) Published CRE policy matching lenderId + productId (priority ascending)
 */
export function resolvePolicyForProgram(input: {
  program: Pick<
    EnterpriseLenderProgramRecord,
    "id" | "lenderId" | "productId" | "productCode" | "creditRiskPolicyRef"
  >;
  lenderId?: string;
  productId?: string | null;
}): ProgramPolicyResolution {
  const ref = input.program.creditRiskPolicyRef;
  if ((ref ?? "").trim()) {
    const resolved = resolveCreditRiskPolicyByRef(ref, { requirePublished: true });
    if (resolved.policy) {
      return { ok: true, source: "program_ref", ref, policy: resolved.policy };
    }
    return { ok: false, source: "program_ref", ref, error: resolved.error };
  }

  const lenderId = input.lenderId || input.program.lenderId;
  const productId = input.productId ?? input.program.productId ?? null;
  const published = getPublishedPolicies().filter((p) => {
    if (p.lenderId && p.lenderId !== lenderId) return false;
    if (productId && p.productId && p.productId !== productId) return false;
    return true;
  });
  published.sort((a, b) => (a.priority ?? 50) - (b.priority ?? 50));
  const policy = published[0];
  if (!policy) {
    return {
      ok: false,
      source: "none",
      error: "No published Credit & Risk policy matched this lender/product/program.",
    };
  }
  return { ok: true, source: "lender_product_fallback", policy };
}

export function listSelectableCreditRiskPolicies(): CreditRiskPolicySummary[] {
  return getPublishedPolicies();
}
