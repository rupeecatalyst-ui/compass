import { DEFAULT_POLICY_RULE_REFS } from "@/data/catalyst-one/credit-risk-engine/policy-rule-refs-seed";
import { DEFAULT_CREDIT_RISK_LENDERS } from "@/data/catalyst-one/credit-risk-engine/lenders-seed";
import { DEFAULT_CREDIT_RISK_POLICIES } from "@/data/catalyst-one/credit-risk-engine/policy-seed";
import { appendCreditRiskAuditEntry } from "@/lib/credit-risk-engine/audit-store";
import { setRulePolicyBindings } from "@/lib/credit-risk-engine/rule-store";
import { getRuleById, getRuleVersions } from "@/lib/credit-risk-engine/rule-store";
import {
  formatPolicyVersion,
  isPolicyActive,
  canTransitionPolicyStatus,
} from "@/constants/credit-risk-policy-lifecycle";
import { POLICY_RULE_CATEGORY_PAIRS } from "@/constants/policy-rule-sections";
import { formatRuleVersion } from "@/constants/rule-library";
import type { RulePolicyBinding } from "@/types/rule-library";
import type {
  CreditRiskDashboardMetrics,
  CreditRiskLenderRecord,
  CreditRiskPolicySummary,
  PolicyAuditAction,
  PolicyLibraryDashboardMetrics,
  PolicyLifecycleStatus,
  PolicyRuleReference,
  PolicyRuleUpgradeHint,
  PolicyValidationWarning,
} from "@/types/credit-risk-engine";

let policyOverride: CreditRiskPolicySummary[] | null = null;
let lenderOverride: CreditRiskLenderRecord[] | null = null;
let policyRuleRefsOverride: PolicyRuleReference[] | null = null;

/** Runtime override — future Admin Console persistence layer. */
export function setCreditRiskPolicies(policies: CreditRiskPolicySummary[]): void {
  policyOverride = policies;
}

export function setCreditRiskLenders(lenders: CreditRiskLenderRecord[]): void {
  lenderOverride = lenders;
}

export function setPolicyRuleReferences(refs: PolicyRuleReference[]): void {
  policyRuleRefsOverride = refs;
  syncRulePolicyBindings(refs);
}

export function resetCreditRiskStore(): void {
  policyOverride = null;
  lenderOverride = null;
  policyRuleRefsOverride = null;
}

export function getAllPolicyVersions(): CreditRiskPolicySummary[] {
  return policyOverride ?? DEFAULT_CREDIT_RISK_POLICIES;
}

export function getLatestPolicyVersions(): CreditRiskPolicySummary[] {
  const byPolicy = new Map<string, CreditRiskPolicySummary>();
  for (const policy of getAllPolicyVersions()) {
    const existing = byPolicy.get(policy.policyId);
    if (
      !existing ||
      policy.majorVersion > existing.majorVersion ||
      (policy.majorVersion === existing.majorVersion && policy.minorVersion > existing.minorVersion)
    ) {
      byPolicy.set(policy.policyId, policy);
    }
  }
  return Array.from(byPolicy.values()).sort((a, b) => a.policyName.localeCompare(b.policyName));
}

/** @deprecated Use getAllPolicyVersions or getLatestPolicyVersions */
export function getCreditRiskPolicies(): CreditRiskPolicySummary[] {
  return getLatestPolicyVersions();
}

export function getCreditRiskLenders(): CreditRiskLenderRecord[] {
  return lenderOverride ?? DEFAULT_CREDIT_RISK_LENDERS;
}

export function getActiveLenders(): CreditRiskLenderRecord[] {
  return getCreditRiskLenders().filter((l) => l.enabled);
}

export function getPolicyVersions(policyId: string): CreditRiskPolicySummary[] {
  return getAllPolicyVersions()
    .filter((p) => p.policyId === policyId)
    .sort((a, b) => {
      if (b.majorVersion !== a.majorVersion) return b.majorVersion - a.majorVersion;
      return b.minorVersion - a.minorVersion;
    });
}

export function getCreditRiskPolicyById(policyId: string): CreditRiskPolicySummary | undefined {
  return getLatestPolicyVersions().find((p) => p.policyId === policyId);
}

export function getPolicyVersionById(versionId: string): CreditRiskPolicySummary | undefined {
  return getAllPolicyVersions().find((p) => p.id === versionId);
}

export function getPublishedPolicies(): CreditRiskPolicySummary[] {
  return getLatestPolicyVersions().filter((p) => isPolicyActive(p.status));
}

export function getAllPolicyRuleReferences(): PolicyRuleReference[] {
  return policyRuleRefsOverride ?? DEFAULT_POLICY_RULE_REFS;
}

export function getPolicyRuleReferences(policyId: string): PolicyRuleReference[] {
  return getAllPolicyRuleReferences()
    .filter((r) => r.policyId === policyId)
    .sort((a, b) => a.sectionId.localeCompare(b.sectionId) || a.sortOrder - b.sortOrder);
}

function syncRulePolicyBindings(refs: PolicyRuleReference[]): void {
  const policies = getLatestPolicyVersions();
  const bindings: RulePolicyBinding[] = [];
  const seen = new Set<string>();

  for (const ref of refs) {
    const key = `${ref.ruleId}:${ref.policyId}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const policy = policies.find((p) => p.policyId === ref.policyId);
    if (!policy) continue;
    bindings.push({
      id: `bind_${ref.ruleId}_${ref.policyId}`,
      ruleId: ref.ruleId,
      policyId: ref.policyId,
      policyName: policy.policyName,
      lenderName: policy.lenderName,
      productName: policy.productName,
    });
  }
  setRulePolicyBindings(bindings);
}

export function getPolicyLibraryDashboardMetrics(): PolicyLibraryDashboardMetrics {
  const latest = getLatestPolicyVersions();
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const products = new Set(latest.map((p) => p.productId));

  return {
    totalPolicies: latest.length,
    activePolicies: latest.filter((p) => isPolicyActive(p.status)).length,
    draftPolicies: latest.filter((p) => p.status === "draft").length,
    publishedPolicies: latest.filter((p) => p.status === "published").length,
    pendingApprovalPolicies: latest.filter((p) => p.status === "approved").length,
    recentlyModified: latest.filter((p) => new Date(p.lastModified).getTime() >= sevenDaysAgo).length,
    policyCategories: products.size,
  };
}

export function getCreditRiskDashboardMetrics(): CreditRiskDashboardMetrics {
  const policies = getLatestPolicyVersions();
  const published = policies.filter((p) => p.status === "published");
  const latestPublished = published
    .slice()
    .sort((a, b) => (b.publishedDate ?? "").localeCompare(a.publishedDate ?? ""))[0];

  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const recentlyModified = policies.filter(
    (p) => new Date(p.lastModified).getTime() >= sevenDaysAgo,
  ).length;

  return {
    activeLenders: getActiveLenders().length,
    activePolicies: published.length,
    draftPolicies: policies.filter((p) => p.status === "draft").length,
    publishedPolicies: published.length,
    pendingApprovalPolicies: policies.filter((p) => p.status === "approved").length,
    latestPublishedVersion: latestPublished
      ? `${latestPublished.policyName} · ${formatPolicyVersion(latestPublished.majorVersion, latestPublished.minorVersion)}`
      : "—",
    recentlyModifiedCount: recentlyModified,
  };
}

export function searchCreditRiskPolicies(query: string): CreditRiskPolicySummary[] {
  const q = query.trim().toLowerCase();
  if (!q) return getLatestPolicyVersions();
  return getLatestPolicyVersions().filter(
    (p) =>
      p.policyName.toLowerCase().includes(q) ||
      p.policyCode.toLowerCase().includes(q) ||
      p.lenderName.toLowerCase().includes(q) ||
      p.productName.toLowerCase().includes(q) ||
      p.policyId.toLowerCase().includes(q) ||
      (p.description?.toLowerCase().includes(q) ?? false),
  );
}

export function validatePolicyRules(policyId: string): PolicyValidationWarning[] {
  const refs = getPolicyRuleReferences(policyId);
  const warnings: PolicyValidationWarning[] = [];
  const seenRuleIds = new Set<string>();

  for (const ref of refs) {
    if (seenRuleIds.has(ref.ruleId)) {
      warnings.push({
        code: "duplicate_rule",
        severity: "error",
        message: `Rule ${ref.ruleCode} is assigned more than once.`,
        ruleId: ref.ruleId,
      });
    }
    seenRuleIds.add(ref.ruleId);
  }

  const subCategories = new Set<string>();
  for (const ref of refs) {
    const rule = getRuleVersions(ref.ruleId).find(
      (r) => r.majorVersion === ref.majorVersion && r.minorVersion === ref.minorVersion,
    ) ?? getRuleById(ref.ruleId);
    if (rule?.subCategory) subCategories.add(rule.subCategory.toUpperCase());
  }

  for (const pair of POLICY_RULE_CATEGORY_PAIRS) {
    const hasA = subCategories.has(pair.a.toUpperCase());
    const hasB = subCategories.has(pair.b.toUpperCase());
    if (hasA && !hasB) {
      warnings.push({
        code: "missing_pair",
        severity: "warning",
        message: `Policy has ${pair.a} rule but no ${pair.b} rule — ${pair.label}.`,
        categoryId: pair.b,
      });
    }
  }

  const hasFinancial = refs.some((r) => r.sectionId === "financial");
  const hasBureau = refs.some((r) => r.sectionId === "bureau");
  if (refs.length > 0 && !hasFinancial) {
    warnings.push({
      code: "missing_category",
      severity: "warning",
      message: "No financial rules attached to this policy.",
      categoryId: "financial",
    });
  }
  if (refs.length > 2 && !hasBureau) {
    warnings.push({
      code: "missing_category",
      severity: "warning",
      message: "No bureau rules attached — consider adding a bureau gate.",
      categoryId: "bureau",
    });
  }

  return warnings;
}

export function getPolicyRuleUpgradeHints(policyId: string): PolicyRuleUpgradeHint[] {
  return getPolicyRuleReferences(policyId).map((ref) => {
    const latest = getRuleById(ref.ruleId);
    const pinned = formatRuleVersion(ref.majorVersion, ref.minorVersion);
    const latestVer = latest
      ? formatRuleVersion(latest.majorVersion, latest.minorVersion)
      : pinned;
    const upgradeRecommended =
      latest !== undefined &&
      (latest.majorVersion > ref.majorVersion ||
        (latest.majorVersion === ref.majorVersion && latest.minorVersion > ref.minorVersion));

    return {
      ruleId: ref.ruleId,
      ruleCode: ref.ruleCode,
      ruleName: ref.ruleName,
      sectionId: ref.sectionId,
      pinnedVersion: pinned,
      latestVersion: latestVer,
      ruleLastModified: latest?.lastModified ?? "—",
      upgradeRecommended,
    };
  });
}

function recordPolicyAudit(
  policy: CreditRiskPolicySummary,
  action: PolicyAuditAction,
  actor: string,
  field?: string,
  oldValue?: string,
  newValue?: string,
): void {
  appendCreditRiskAuditEntry({
    policyId: policy.policyId,
    policyName: policy.policyName,
    versionLabel: formatPolicyVersion(policy.majorVersion, policy.minorVersion),
    actor,
    action: `${action} policy`,
    field,
    oldValue,
    newValue,
  });

  void import("@/lib/enterprise-decision-ledger")
    .then((edl) =>
      edl.recordEnterpriseDecision({
        requestedBy: actor,
        approvedBy: actor,
        previousValue: field ? { [field]: oldValue ?? null } : null,
        newValue: field ? { [field]: newValue ?? null } : { status: policy.status },
        businessJustification: `Credit Risk policy ${action.toLowerCase()}: ${policy.policyName} (${formatPolicyVersion(policy.majorVersion, policy.minorVersion)}).`,
        effectiveFrom: policy.effectiveFrom || new Date().toISOString(),
        effectiveUntil: policy.effectiveTo || null,
        versionNumber: formatPolicyVersion(policy.majorVersion, policy.minorVersion),
        impactScope: "policy",
        changeType:
          action === "Created"
            ? "created"
            : action === "Published"
              ? "published"
              : "updated",
        changeCategory: "credit_risk_engine_configuration",
        relatedEngine: "Credit & Risk Engine",
        relatedEntityType: "credit_risk_policy",
        relatedEntityId: policy.policyId,
        relatedEntityLabel: policy.policyName,
        notImpactedNote:
          "Historical transactions continue using the policy version applicable when they were created.",
      }),
    )
    .catch(() => undefined);
}

export interface PolicyDraftInput {
  policyId?: string;
  policyCode: string;
  policyName: string;
  description: string;
  lenderId: string;
  lenderName: string;
  productId: string;
  productName: string;
  customerCategoryId?: string;
  customerCategoryName?: string;
  priority: number;
  approvalAuthority: string;
  effectiveFrom?: string;
  effectiveTo?: string;
  createdBy: string;
  ruleRefs: Omit<PolicyRuleReference, "id" | "policyId">[];
}

export function savePolicyDraft(draft: PolicyDraftInput): CreditRiskPolicySummary {
  const now = new Date().toISOString();
  const all = [...getAllPolicyVersions()];
  const policyId = draft.policyId ?? `policy_${Date.now()}`;
  const versions = getPolicyVersions(policyId);
  const latest = versions[0];
  const major =
    latest?.status === "published" ? (latest.majorVersion + 1) : (latest?.majorVersion ?? 1);
  const minor =
    latest?.status === "published" ? 0 : (latest?.minorVersion ?? 0) + (latest ? 1 : 0);

  const record: CreditRiskPolicySummary = {
    id: `pol_ver_${Date.now()}`,
    policyId,
    policyCode: draft.policyCode,
    policyName: draft.policyName,
    description: draft.description,
    majorVersion: major,
    minorVersion: minor,
    status: "draft",
    priority: draft.priority,
    approvalAuthority: draft.approvalAuthority,
    effectiveFrom: draft.effectiveFrom,
    effectiveTo: draft.effectiveTo,
    createdBy: draft.createdBy,
    lastModified: now,
    lenderId: draft.lenderId,
    lenderName: draft.lenderName,
    productId: draft.productId,
    productName: draft.productName,
    customerCategoryId: draft.customerCategoryId,
    customerCategoryName: draft.customerCategoryName,
  };

  policyOverride = [...all, record];

  const refs = draft.ruleRefs.map((ref, idx) => ({
    ...ref,
    id: `pref_${Date.now()}_${idx}`,
    policyId,
    sortOrder: ref.sortOrder ?? idx + 1,
  }));

  const otherRefs = getAllPolicyRuleReferences().filter((r) => r.policyId !== policyId);
  setPolicyRuleReferences([...otherRefs, ...refs]);

  recordPolicyAudit(record, "Created", draft.createdBy, "status", "", "draft");
  notifyAtlasPolicyRegistration(record);
  return record;
}

/** Lazy ATLAS hook — design-time catalog only; never blocks policy save. */
function notifyAtlasPolicyRegistration(record: CreditRiskPolicySummary): void {
  void import("@/lib/atlas/auto-registration")
    .then((m) => m.registerAtlasFromPolicy(record))
    .catch(() => undefined);
}

export function updatePolicyRuleReferences(
  policyId: string,
  refs: Omit<PolicyRuleReference, "id" | "policyId">[],
  actor: string,
): PolicyRuleReference[] {
  const otherRefs = getAllPolicyRuleReferences().filter((r) => r.policyId !== policyId);
  const newRefs = refs.map((ref, idx) => ({
    ...ref,
    id: `pref_${Date.now()}_${idx}`,
    policyId,
    sortOrder: ref.sortOrder ?? idx + 1,
  }));
  setPolicyRuleReferences([...otherRefs, ...newRefs]);

  const policy = getCreditRiskPolicyById(policyId);
  if (policy) {
    recordPolicyAudit(policy, "Updated", actor, "ruleRefs", "", `${newRefs.length} rules`);
  }
  return newRefs;
}

export function transitionPolicyStatus(
  policyId: string,
  to: PolicyLifecycleStatus,
  actor: string,
): CreditRiskPolicySummary | undefined {
  const all = [...getAllPolicyVersions()];
  const idx = all.findIndex((p) => p.policyId === policyId && p.status !== "archived");
  if (idx === -1) return undefined;

  const current = all[idx];
  if (!canTransitionPolicyStatus(current.status, to)) return undefined;

  const now = new Date().toISOString();
  const updated: CreditRiskPolicySummary = {
    ...current,
    status: to,
    lastModified: now,
    ...(to === "approved" ? { approvedBy: actor } : {}),
    ...(to === "published"
      ? { publishedBy: actor, publishedDate: now }
      : {}),
  };
  all[idx] = updated;
  policyOverride = all;

  const actionMap: Partial<Record<PolicyLifecycleStatus, PolicyAuditAction>> = {
    validated: "Validated",
    testing: "Tested",
    approved: "Approved",
    published: "Published",
    archived: "Archived",
  };
  const auditAction = actionMap[to] ?? "Updated";
  recordPolicyAudit(updated, auditAction, actor, "status", current.status, to);
  const timelineMap: Partial<Record<PolicyLifecycleStatus, import("@/types/atlas").ArchitectureTimelineAction>> = {
    validated: "validated",
    approved: "approved",
    published: "published",
    archived: "archived",
  };
  notifyAtlasPolicyLifecycle(updated, timelineMap[to] ?? "updated", actor);
  return updated;
}

function notifyAtlasPolicyLifecycle(
  policy: CreditRiskPolicySummary,
  action: import("@/types/atlas").ArchitectureTimelineAction,
  actor: string,
): void {
  void import("@/lib/atlas/auto-registration")
    .then((m) => m.registerAtlasPolicyLifecycle(policy, action, actor))
    .catch(() => undefined);
}
