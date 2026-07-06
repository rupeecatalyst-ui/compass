import { DEFAULT_ENTERPRISE_REGISTRY } from "@/data/catalyst-one/enterprise-architecture/registry-seed";
import { DEFAULT_PERFORMANCE_BUDGETS } from "@/data/catalyst-one/enterprise-architecture/performance-budget-seed";
import { evaluateArtifactCompliance } from "@/lib/enterprise-architecture/compliance-engine";
import { seedEnterpriseIdSequences } from "@/lib/enterprise-architecture/id-generator";
import type {
  ArchitectureDashboardMetrics,
  ComplianceEvaluation,
  EnterpriseArtifactType,
  EnterpriseRegistryRecord,
  PerformanceBudget,
} from "@/types/enterprise-architecture";

let registryOverride: EnterpriseRegistryRecord[] | null = null;
let budgetsOverride: PerformanceBudget[] | null = null;

/** Bootstrap sequence counters from seed data — design-time only. */
seedEnterpriseIdSequences(DEFAULT_ENTERPRISE_REGISTRY.map((r) => r.enterpriseId));

export function setEnterpriseRegistry(records: EnterpriseRegistryRecord[]): void {
  registryOverride = records;
  seedEnterpriseIdSequences(records.map((r) => r.enterpriseId));
}

export function setPerformanceBudgets(budgets: PerformanceBudget[]): void {
  budgetsOverride = budgets;
}

export function resetEnterpriseArchitectureStore(): void {
  registryOverride = null;
  budgetsOverride = null;
}

export function getEnterpriseRegistry(): EnterpriseRegistryRecord[] {
  return registryOverride ?? DEFAULT_ENTERPRISE_REGISTRY;
}

export function getEnterpriseRegistryRecord(
  enterpriseId: string,
): EnterpriseRegistryRecord | undefined {
  return getEnterpriseRegistry().find((r) => r.enterpriseId === enterpriseId);
}

export function getPerformanceBudgets(): PerformanceBudget[] {
  return budgetsOverride ?? DEFAULT_PERFORMANCE_BUDGETS;
}

export function getPerformanceBudgetById(id: string): PerformanceBudget | undefined {
  return getPerformanceBudgets().find((b) => b.id === id);
}

export function getPerformanceBudgetForArtifact(
  enterpriseId: string,
): PerformanceBudget | undefined {
  const record = getEnterpriseRegistryRecord(enterpriseId);
  if (!record?.performanceBudgetId) return undefined;
  return getPerformanceBudgetById(record.performanceBudgetId);
}

export function searchEnterpriseRegistry(query: string): EnterpriseRegistryRecord[] {
  const q = query.trim().toLowerCase();
  if (!q) return getEnterpriseRegistry();
  return getEnterpriseRegistry().filter(
    (r) =>
      r.enterpriseId.toLowerCase().includes(q) ||
      r.name.toLowerCase().includes(q) ||
      r.description.toLowerCase().includes(q) ||
      r.owner.toLowerCase().includes(q) ||
      r.type.toLowerCase().includes(q),
  );
}

export function filterEnterpriseRegistryByType(
  type: EnterpriseArtifactType | "all",
): EnterpriseRegistryRecord[] {
  if (type === "all") return getEnterpriseRegistry();
  return getEnterpriseRegistry().filter((r) => r.type === type);
}

export function evaluateAllCompliance(): ComplianceEvaluation[] {
  return getEnterpriseRegistry().map(evaluateArtifactCompliance);
}

export function getComplianceEvaluation(enterpriseId: string): ComplianceEvaluation {
  const record = getEnterpriseRegistryRecord(enterpriseId);
  if (!record) {
    return {
      enterpriseId,
      results: [],
      overallScore: 0,
      evaluatedAt: new Date().toISOString(),
    };
  }
  return evaluateArtifactCompliance(record);
}

export function getArchitectureDashboardMetrics(): ArchitectureDashboardMetrics {
  const registry = getEnterpriseRegistry();
  const evaluations = evaluateAllCompliance();
  const budgets = getPerformanceBudgets();

  const failCount = evaluations.reduce(
    (sum, e) => sum + e.results.filter((r) => r.verdict === "fail").length,
    0,
  );
  const warnCount = evaluations.reduce(
    (sum, e) => sum + e.results.filter((r) => r.verdict === "warning").length,
    0,
  );
  const avgScore =
    evaluations.length > 0
      ? Math.round(evaluations.reduce((s, e) => s + e.overallScore, 0) / evaluations.length)
      : 0;

  const docPublished = registry.filter((r) => r.documentationStatus === "published").length;
  const active = registry.filter((r) => r.status === "active").length;

  return {
    totalArtifacts: registry.length,
    activeArtifacts: active,
    averageComplianceScore: avgScore,
    documentationPublished: docPublished,
    performanceBudgetsDefined: budgets.length,
    complianceFailures: failCount,
    complianceWarnings: warnCount,
    healthScore: Math.round(avgScore * 0.6 + (docPublished / Math.max(registry.length, 1)) * 40),
  };
}
