import { DEFAULT_RULE_COMPOSITION_EDGES } from "@/data/catalyst-one/credit-risk-engine/rule-composition-seed";
import { recordSeverityChangeIfNeeded } from "@/lib/credit-risk-engine/rule-severity-audit-store";
import { DEFAULT_RULE_CATEGORIES } from "@/data/catalyst-one/credit-risk-engine/rule-categories-seed";
import {
  DEFAULT_RULE_POLICY_BINDINGS,
  DEFAULT_RULE_LIBRARY,
} from "@/data/catalyst-one/credit-risk-engine/rules-seed";
import { compareInheritancePriority, isRuleActive } from "@/constants/rule-library";
import { computeReviewStatus, GOVERNANCE_DUE_SOON_DAYS } from "@/constants/rule-governance";
import { inheritsFromScope } from "@/constants/rule-inheritance";
import type {
  RuleCategoryConfig,
  RuleCategoryId,
  RuleCompositionEdge,
  RuleCompositionGraph,
  RuleCompositionNode,
  RuleImpactSummary,
  RuleInheritanceContext,
  RuleInheritanceLevel,
  RuleLibraryDashboardMetrics,
  RuleLibraryVersion,
  RulePolicyBinding,
  RuleSimulationInput,
  RuleSimulationResult,
} from "@/types/rule-library";
import type { RuleOperator, RuleScope } from "@/types/rule-library";

let rulesOverride: RuleLibraryVersion[] | null = null;
let categoriesOverride: RuleCategoryConfig[] | null = null;
let policyBindingsOverride: RulePolicyBinding[] | null = null;
let compositionEdgesOverride: RuleCompositionEdge[] | null = null;

export function setRuleLibrary(rules: RuleLibraryVersion[]): void {
  rulesOverride = rules;
}

export function setRuleCategories(categories: RuleCategoryConfig[]): void {
  categoriesOverride = categories;
}

export function setRulePolicyBindings(bindings: RulePolicyBinding[]): void {
  policyBindingsOverride = bindings;
}

/** @deprecated Use setRulePolicyBindings */
export function setRuleDependencies(bindings: RulePolicyBinding[]): void {
  setRulePolicyBindings(bindings);
}

export function setRuleCompositionEdges(edges: RuleCompositionEdge[]): void {
  compositionEdgesOverride = edges;
}

export function resetRuleLibraryStore(): void {
  rulesOverride = null;
  categoriesOverride = null;
  policyBindingsOverride = null;
  compositionEdgesOverride = null;
}

export function getRuleCategories(): RuleCategoryConfig[] {
  return (categoriesOverride ?? DEFAULT_RULE_CATEGORIES)
    .filter((c) => c.enabled)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export function getAllRuleVersions(): RuleLibraryVersion[] {
  return rulesOverride ?? DEFAULT_RULE_LIBRARY;
}

export interface RuleReviewNotification {
  id: string;
  ruleId: string;
  message: string;
}

/**
 * Governance notifications — foundation only.
 * Emits reminders exactly 2 days before nextReviewDate.
 */
export function getRuleReviewNotifications(now = new Date()): RuleReviewNotification[] {
  const latest = getLatestRuleVersions();
  const msDay = 24 * 60 * 60 * 1000;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  return latest
    .filter((r) => computeReviewStatus(r, now) !== "reviewed")
    .map((r) => {
      const due = new Date(r.nextReviewDate);
      due.setHours(0, 0, 0, 0);
      const daysUntil = Math.round((due.getTime() - today.getTime()) / msDay);
      return { r, daysUntil };
    })
    .filter(({ daysUntil }) => daysUntil === GOVERNANCE_DUE_SOON_DAYS)
    .map(({ r }) => ({
      id: `review_due_${r.ruleId}_${r.nextReviewDate}`,
      ruleId: r.ruleId,
      message: `Rule ${r.ruleCode} is due for review in ${GOVERNANCE_DUE_SOON_DAYS} days.`,
    }));
}

export function getCompositionEdges(): RuleCompositionEdge[] {
  return compositionEdgesOverride ?? DEFAULT_RULE_COMPOSITION_EDGES;
}

/** Latest version per ruleId — foundation for library listing. */
export function getLatestRuleVersions(): RuleLibraryVersion[] {
  const byRule = new Map<string, RuleLibraryVersion>();
  for (const rule of getAllRuleVersions()) {
    const existing = byRule.get(rule.ruleId);
    if (!existing || rule.majorVersion > existing.majorVersion ||
      (rule.majorVersion === existing.majorVersion && rule.minorVersion > existing.minorVersion)) {
      byRule.set(rule.ruleId, rule);
    }
  }
  return Array.from(byRule.values()).sort((a, b) => a.ruleName.localeCompare(b.ruleName));
}

export function getRuleById(ruleId: string): RuleLibraryVersion | undefined {
  return getLatestRuleVersions().find((r) => r.ruleId === ruleId);
}

export function getRuleVersions(ruleId: string): RuleLibraryVersion[] {
  return getAllRuleVersions()
    .filter((r) => r.ruleId === ruleId)
    .sort((a, b) => {
      if (b.majorVersion !== a.majorVersion) return b.majorVersion - a.majorVersion;
      return b.minorVersion - a.minorVersion;
    });
}

export function getRulePolicyBindings(ruleId: string): RulePolicyBinding[] {
  return (policyBindingsOverride ?? DEFAULT_RULE_POLICY_BINDINGS).filter((d) => d.ruleId === ruleId);
}

/** @deprecated Use getRulePolicyBindings */
export function getRuleDependencies(ruleId: string): RulePolicyBinding[] {
  return getRulePolicyBindings(ruleId);
}

/** Upstream rules this rule depends on. */
export function getRuleDependsOn(ruleId: string): RuleCompositionNode[] {
  const rule = getRuleById(ruleId);
  if (!rule) return [];
  return rule.dependsOnRuleIds
    .map((id) => getRuleById(id))
    .filter((r): r is RuleLibraryVersion => Boolean(r))
    .map(toCompositionNode);
}

/** Downstream rules that depend on this rule — impact analysis foundation. */
export function getRuleDependents(ruleId: string): RuleCompositionNode[] {
  const dependentIds = new Set<string>();
  for (const edge of getCompositionEdges()) {
    if (edge.dependsOnRuleId === ruleId) dependentIds.add(edge.ruleId);
  }
  for (const rule of getLatestRuleVersions()) {
    if (rule.dependsOnRuleIds.includes(ruleId)) dependentIds.add(rule.ruleId);
  }
  return Array.from(dependentIds)
    .map((id) => getRuleById(id))
    .filter((r): r is RuleLibraryVersion => Boolean(r))
    .map(toCompositionNode);
}

export function getRuleImpactSummary(ruleId: string): RuleImpactSummary {
  const dependents = getRuleDependents(ruleId);
  return {
    ruleId,
    dependentRuleCount: dependents.length,
    policyBindingCount: getRulePolicyBindings(ruleId).length,
    dependentRules: dependents,
  };
}

export function getRuleCompositionGraph(): RuleCompositionGraph {
  const nodes = getLatestRuleVersions().map(toCompositionNode);
  const edges = getCompositionEdges();
  return { nodes, edges };
}

function toCompositionNode(rule: RuleLibraryVersion): RuleCompositionNode {
  return {
    ruleId: rule.ruleId,
    ruleCode: rule.ruleCode,
    ruleName: rule.ruleName,
    ruleScope: rule.ruleScope,
    ruleType: rule.ruleType,
    ruleSeverity: rule.ruleSeverity,
    status: rule.status,
  };
}

/**
 * Inheritance resolution — lower levels override higher when configured.
 * Foundation only; full engine wiring in future sprints.
 */
export function resolveInheritedRule(
  ruleCode: string,
  context: RuleInheritanceContext,
): RuleLibraryVersion | undefined {
  const candidates = getLatestRuleVersions().filter(
    (r) => r.ruleCode === ruleCode && isRuleActive(r.status),
  );
  if (candidates.length === 0) return undefined;
  if (candidates.length === 1) return candidates[0];

  const applicable = candidates.filter((rule) => matchesInheritanceContext(rule, context));
  if (applicable.length === 0) return candidates[0];

  return applicable.sort((a, b) =>
    compareInheritancePriority(b.inheritanceLevel, a.inheritanceLevel),
  )[0];
}

function matchesInheritanceContext(
  rule: RuleLibraryVersion,
  context: RuleInheritanceContext,
): boolean {
  switch (rule.inheritanceLevel) {
    case "global":
      return true;
    case "organization":
      return Boolean(context.organizationId);
    case "lender":
      return Boolean(context.lenderId);
    case "product":
      return Boolean(context.productId);
    case "customer":
      return Boolean(context.customerCategoryId);
    case "loan":
      return Boolean(context.loanId);
    default:
      return true;
  }
}

export function getRuleLibraryDashboardMetrics(): RuleLibraryDashboardMetrics {
  const latest = getLatestRuleVersions();
  const categoriesUsed = new Set(latest.map((r) => r.categoryId));
  const sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  const now = new Date();
  const msDay = 24 * 60 * 60 * 1000;
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);

  const rulesOverdue = latest.filter((r) => computeReviewStatus(r, now) === "overdue").length;
  const rulesDueToday = latest.filter((r) => computeReviewStatus(r, now) === "due_today").length;
  const rulesDueThisWeek = latest.filter((r) => {
    const status = computeReviewStatus(r, now);
    if (status === "reviewed" || status === "overdue") return false;
    const due = new Date(r.nextReviewDate);
    due.setHours(0, 0, 0, 0);
    const daysUntil = Math.round((due.getTime() - today.getTime()) / msDay);
    return daysUntil >= 0 && daysUntil <= 7;
  }).length;

  const recentlyReviewed = latest.filter((r) => {
    if (!r.lastReviewedOn) return false;
    return new Date(r.lastReviewedOn).getTime() >= sevenDaysAgo;
  }).length;

  const upcomingReviews = latest.filter((r) => computeReviewStatus(r, now) === "upcoming").length;

  return {
    totalRules: latest.length,
    activeRules: latest.filter((r) => isRuleActive(r.status)).length,
    draftRules: latest.filter((r) => r.status === "draft").length,
    publishedRules: latest.filter((r) => r.status === "published").length,
    ruleCategories: categoriesUsed.size,
    recentlyUpdated: latest.filter((r) => new Date(r.lastModified).getTime() >= sevenDaysAgo).length,
    rulesDueThisWeek,
    rulesDueToday,
    rulesOverdue,
    recentlyReviewed,
    upcomingReviews,
  };
}

export function searchRules(query: string, categoryId?: RuleCategoryId): RuleLibraryVersion[] {
  const q = query.trim().toLowerCase();
  let results = getLatestRuleVersions();
  if (categoryId) {
    results = results.filter((r) => r.categoryId === categoryId);
  }
  if (!q) return results;
  return results.filter(
    (r) =>
      r.ruleCode.toLowerCase().includes(q) ||
      r.ruleName.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.subCategory.toLowerCase().includes(q) ||
      r.ruleScope.toLowerCase().includes(q) ||
      r.ruleType.toLowerCase().includes(q),
  );
}

export function simulateRule(
  rule: RuleLibraryVersion,
  input: RuleSimulationInput,
): RuleSimulationResult {
  const sample = input.sampleValue.trim();
  const threshold = rule.value.trim();
  const passed = evaluateOperator(rule.operator, sample, threshold, rule.dataType);

  return {
    passed,
    message: passed
      ? `Sample value "${sample}" satisfies ${rule.ruleCode} (${rule.operator} ${threshold}).`
      : `Sample value "${sample}" does not satisfy ${rule.ruleCode} (${rule.operator} ${threshold}).`,
    evaluatedAt: new Date().toISOString(),
  };
}

function evaluateOperator(
  operator: RuleOperator,
  sample: string,
  threshold: string,
  dataType: RuleLibraryVersion["dataType"],
): boolean {
  if (dataType === "boolean") {
    const s = sample.toLowerCase() === "true";
    const t = threshold.toLowerCase() === "true";
    if (operator === "equals") return s === t;
    if (operator === "not_equals") return s !== t;
    return false;
  }

  if (dataType === "string" || dataType === "enum") {
    if (operator === "equals") return sample === threshold;
    if (operator === "not_equals") return sample !== threshold;
    if (operator === "contains") return sample.toLowerCase().includes(threshold.toLowerCase());
    if (operator === "in") {
      const list = threshold.split(",").map((v) => v.trim().toLowerCase());
      return list.includes(sample.toLowerCase());
    }
    if (operator === "not_in") {
      const list = threshold.split(",").map((v) => v.trim().toLowerCase());
      return !list.includes(sample.toLowerCase());
    }
    return false;
  }

  const sNum = parseFloat(sample.replace(/,/g, ""));
  const tNum = parseFloat(threshold.replace(/,/g, ""));
  if (Number.isNaN(sNum) || Number.isNaN(tNum)) return false;

  switch (operator) {
    case "equals":
      return sNum === tNum;
    case "not_equals":
      return sNum !== tNum;
    case "greater_than":
      return sNum > tNum;
    case "greater_than_or_equal":
      return sNum >= tNum;
    case "less_than":
      return sNum < tNum;
    case "less_than_or_equal":
      return sNum <= tNum;
    case "between": {
      const [min, max] = threshold.split(",").map((v) => parseFloat(v.trim()));
      return !Number.isNaN(min) && !Number.isNaN(max) && sNum >= min && sNum <= max;
    }
    default:
      return false;
  }
}

export function saveRuleDraft(
  draft: Omit<RuleLibraryVersion, "id" | "lastModified" | "majorVersion" | "minorVersion" | "ruleId" | "inheritanceLevel"> & {
    ruleId?: string;
    majorVersion?: number;
    minorVersion?: number;
    inheritanceLevel?: RuleInheritanceLevel;
    ruleScope: RuleScope;
    severityChangeReason?: string;
  },
): RuleLibraryVersion {
  const now = new Date().toISOString();
  const all = [...getAllRuleVersions()];
  const inheritanceLevel = draft.inheritanceLevel ?? inheritsFromScope(draft.ruleScope);

  let record: RuleLibraryVersion;

  if (draft.ruleId) {
    const versions = getRuleVersions(draft.ruleId);
    const latest = versions[0];
    const major = draft.majorVersion ?? (latest?.status === "published" ? (latest.majorVersion + 1) : latest?.majorVersion ?? 1);
    const minor = draft.minorVersion ?? (latest?.status === "published" ? 0 : (latest?.minorVersion ?? 0) + 1);

    recordSeverityChangeIfNeeded({
      ruleId: draft.ruleId,
      ruleCode: draft.ruleCode,
      ruleName: draft.ruleName,
      oldSeverity: latest?.ruleSeverity,
      newSeverity: draft.ruleSeverity,
      changedBy: draft.createdBy,
      reason: draft.severityChangeReason,
    });

    record = {
      ...draft,
      inheritanceLevel,
      id: `rule_ver_${Date.now()}`,
      ruleId: draft.ruleId,
      majorVersion: major,
      minorVersion: minor,
      status: "draft",
      dependsOnRuleIds: draft.dependsOnRuleIds ?? [],
      lastModified: now,
    } as RuleLibraryVersion;
  } else {
    const newRuleId = `rule_${Date.now()}`;
    record = {
      ...draft,
      inheritanceLevel,
      id: `rule_ver_${Date.now()}`,
      ruleId: newRuleId,
      majorVersion: 1,
      minorVersion: 0,
      status: "draft",
      dependsOnRuleIds: draft.dependsOnRuleIds ?? [],
      lastModified: now,
    } as RuleLibraryVersion;
  }

  rulesOverride = [...all, record];
  notifyAtlasRuleRegistration(record);
  return record;
}

/** Lazy ATLAS hook — design-time catalog only; never blocks rule save. */
function notifyAtlasRuleRegistration(record: RuleLibraryVersion): void {
  void import("@/lib/atlas/auto-registration")
    .then((m) => m.registerAtlasFromRule(record))
    .catch(() => undefined);
}
