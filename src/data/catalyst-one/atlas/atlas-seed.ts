import type {
  ArchitectureTimelineEntry,
  EnterpriseAsset,
} from "@/types/atlas";
import { deriveComplianceStatus } from "@/constants/atlas";
import { DEFAULT_ENTERPRISE_REGISTRY } from "@/data/catalyst-one/enterprise-architecture/registry-seed";
import { DEFAULT_PERFORMANCE_BUDGETS } from "@/data/catalyst-one/enterprise-architecture/performance-budget-seed";
import type { EnterpriseAssetType } from "@/types/atlas";

const MODULE_MAP: Record<string, string> = {
  capability: "Platform Core",
  object: "Platform Core",
  rule: "Rule Library",
  policy: "Policy Library",
  workflow: "Workflow Engine",
  api: "Integration Framework",
  screen: "UI Platform",
  dashboard: "CARB",
  widget: "UI Platform",
  report: "Reporting",
  integration: "Integration Framework",
  permission: "Security",
  role: "Security",
  event: "Integration Framework",
  module: "Platform Core",
  service: "Platform Core",
};

const CATEGORY_MAP: Record<string, string> = {
  capability: "Platform Capability",
  object: "Domain Model",
  rule: "Business Rule",
  policy: "Governance Policy",
  workflow: "Process Automation",
  api: "API Surface",
  screen: "User Interface",
  dashboard: "Analytics",
  widget: "UI Component",
  report: "Reporting",
  integration: "Integration",
  permission: "Access Control",
  role: "Access Control",
  event: "Event Contract",
  module: "Platform Module",
  service: "Platform Service",
};

function toPerformanceBudgetRef(
  budgetId: string | null,
  enterpriseId: string,
): EnterpriseAsset["performanceBudgetRef"] {
  if (!budgetId) return null;
  const budget = DEFAULT_PERFORMANCE_BUDGETS.find((b) => b.id === budgetId);
  if (!budget) return { id: budgetId, enterpriseId, label: "Performance Budget" };
  return { id: budget.id, enterpriseId: budget.enterpriseId, label: budget.label };
}

function registryTypeToAssetType(type: string): EnterpriseAssetType | null {
  const allowed: EnterpriseAssetType[] = [
    "capability", "object", "rule", "policy", "workflow", "api",
    "screen", "dashboard", "widget", "report", "integration", "permission", "role",
  ];
  return allowed.includes(type as EnterpriseAssetType) ? (type as EnterpriseAssetType) : null;
}

/** Bootstrap ATLAS assets from CARB registry seed — design-time only. */
export function bootstrapAssetsFromRegistry(): EnterpriseAsset[] {
  return DEFAULT_ENTERPRISE_REGISTRY.flatMap((record) => {
    const assetType = registryTypeToAssetType(record.type);
    if (!assetType) return [];

    const score = record.complianceScore;
    return [{
      enterpriseId: record.enterpriseId,
      name: record.name,
      assetType,
      category: CATEGORY_MAP[record.type] ?? "General",
      description: record.description,
      module: MODULE_MAP[record.type] ?? "Platform Core",
      owner: record.owner,
      version: record.version,
      status: record.status,
      createdDate: record.createdDate,
      modifiedDate: record.modifiedDate,
      documentationStatus: record.documentationStatus,
      complianceScore: score,
      complianceStatus: deriveComplianceStatus(score),
      performanceBudgetRef: toPerformanceBudgetRef(record.performanceBudgetId, record.enterpriseId),
      parentAssetId: record.parentId,
      architectureMetadata: record.architectureMetadata,
      versionHistory: [
        {
          version: record.version,
          status: record.status,
          modifiedDate: record.modifiedDate,
        },
      ],
    }];
  });
}

export const DEFAULT_ATLAS_TIMELINE: ArchitectureTimelineEntry[] = [
  { id: "atl_tl_001", enterpriseId: "CAP-000001", action: "created", actor: "Platform Architecture", timestamp: "2025-11-01T08:00:00Z", version: "1.0.0" },
  { id: "atl_tl_002", enterpriseId: "CAP-000001", action: "validated", actor: "CARB", timestamp: "2025-12-01T10:00:00Z", version: "1.0.0" },
  { id: "atl_tl_003", enterpriseId: "CAP-000001", action: "approved", actor: "Chief Architect", timestamp: "2026-01-15T14:00:00Z", version: "2.0.0" },
  { id: "atl_tl_004", enterpriseId: "CAP-000001", action: "published", actor: "Chief Architect", timestamp: "2026-02-01T09:00:00Z", version: "2.1.0" },
  { id: "atl_tl_005", enterpriseId: "CAP-000002", action: "created", actor: "Platform Architecture", timestamp: "2025-10-15T08:00:00Z", version: "1.0.0" },
  { id: "atl_tl_006", enterpriseId: "CAP-000002", action: "published", actor: "Risk Committee", timestamp: "2026-01-01T10:00:00Z", version: "3.0.0" },
  { id: "atl_tl_007", enterpriseId: "RUL-000301", action: "created", actor: "Architecture Review Board", timestamp: "2025-12-01T08:00:00Z", version: "1.0.0" },
  { id: "atl_tl_008", enterpriseId: "RUL-000301", action: "updated", actor: "Risk Admin", timestamp: "2026-04-20T11:00:00Z", version: "2.0.0" },
  { id: "atl_tl_009", enterpriseId: "POL-000011", action: "created", actor: "Security Team", timestamp: "2026-02-01T08:00:00Z", version: "1.0.0" },
  { id: "atl_tl_010", enterpriseId: "POL-000011", action: "published", actor: "Security Team", timestamp: "2026-05-10T14:00:00Z", version: "1.0.0" },
  { id: "atl_tl_011", enterpriseId: "DSH-000007", action: "created", actor: "CARB", timestamp: "2026-07-01T08:00:00Z", version: "0.1.0" },
  { id: "atl_tl_012", enterpriseId: "DSH-000007", action: "updated", actor: "CARB", timestamp: "2026-07-06T10:00:00Z", version: "0.5.0" },
  { id: "atl_tl_013", enterpriseId: "MOD-000001", action: "created", actor: "Platform Architecture", timestamp: "2026-07-01T08:00:00Z", version: "0.0.0", notes: "Planned module" },
];

export const DEFAULT_ATLAS_ASSETS: EnterpriseAsset[] = bootstrapAssetsFromRegistry();
