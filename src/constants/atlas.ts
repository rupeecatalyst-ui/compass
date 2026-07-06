import type {
  ComplianceStatus,
  EnterpriseAssetType,
} from "@/types/atlas";

export const ENTERPRISE_ASSET_TYPE_LABELS: Record<EnterpriseAssetType, string> = {
  capability: "Capability",
  object: "Object",
  rule: "Rule",
  policy: "Policy",
  workflow: "Workflow",
  api: "API",
  screen: "Screen",
  dashboard: "Dashboard",
  widget: "Widget",
  report: "Report",
  integration: "Integration",
  permission: "Permission",
  role: "Role",
};

/** Maps asset type to enterprise ID prefix code. */
export const ASSET_TYPE_PREFIX_MAP: Record<EnterpriseAssetType, string> = {
  capability: "CAP",
  object: "OBJ",
  rule: "RUL",
  policy: "POL",
  workflow: "WF",
  api: "API",
  screen: "SCR",
  dashboard: "DSH",
  widget: "WDG",
  report: "REP",
  integration: "INT",
  permission: "PER",
  role: "ROL",
};

export const COMPLIANCE_STATUS_LABELS: Record<ComplianceStatus, string> = {
  compliant: "Compliant",
  partial: "Partial",
  non_compliant: "Non-Compliant",
  not_evaluated: "Not Evaluated",
};

export const COMPLIANCE_STATUS_VARIANT: Record<
  ComplianceStatus,
  "success" | "warning" | "error" | "muted"
> = {
  compliant: "success",
  partial: "warning",
  non_compliant: "error",
  not_evaluated: "muted",
};

export function deriveComplianceStatus(score: number): ComplianceStatus {
  if (score <= 0) return "not_evaluated";
  if (score >= 90) return "compliant";
  if (score >= 60) return "partial";
  return "non_compliant";
}

export const ATLAS_AUTO_REGISTER_TYPES: EnterpriseAssetType[] = [
  "capability",
  "object",
  "rule",
  "policy",
  "workflow",
  "api",
  "screen",
  "dashboard",
  "widget",
  "report",
  "integration",
  "permission",
  "role",
];

export const ATLAS_RESERVED_EXTENSIONS = [
  { id: "relationship_engine", label: "Relationship Engine", status: "reserved" as const },
  { id: "dependency_engine", label: "Dependency Engine", status: "reserved" as const },
  { id: "knowledge_graph", label: "Knowledge Graph", status: "reserved" as const },
  { id: "compass", label: "COMPASS", status: "reserved" as const },
  { id: "sage", label: "SAGE", status: "reserved" as const },
  { id: "forge", label: "FORGE", status: "reserved" as const },
] as const;
