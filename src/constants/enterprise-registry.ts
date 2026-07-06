import type { EnterpriseArtifactStatus, EnterpriseArtifactType } from "@/types/enterprise-architecture";

export const ENTERPRISE_ARTIFACT_TYPE_LABELS: Record<EnterpriseArtifactType, string> = {
  capability: "Capability",
  object: "Object",
  screen: "Screen",
  api: "API",
  policy: "Policy",
  rule: "Rule",
  workflow: "Workflow",
  event: "Event",
  report: "Report",
  dashboard: "Dashboard",
  widget: "Widget",
  integration: "Integration",
  permission: "Permission",
  role: "Role",
  module: "Module",
  service: "Service",
};

export const ENTERPRISE_ARTIFACT_STATUS_LABELS: Record<EnterpriseArtifactStatus, string> = {
  planned: "Planned",
  design: "Design",
  development: "Development",
  review: "Review",
  active: "Active",
  deprecated: "Deprecated",
  retired: "Retired",
};

type PillVariant = "default" | "success" | "warning" | "error" | "info" | "muted";

export const ENTERPRISE_ARTIFACT_STATUS_VARIANT: Record<EnterpriseArtifactStatus, PillVariant> = {
  planned: "muted",
  design: "info",
  development: "info",
  review: "warning",
  active: "success",
  deprecated: "warning",
  retired: "muted",
};
