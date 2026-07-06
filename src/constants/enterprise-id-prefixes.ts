import type { EnterpriseIdPrefixConfig } from "@/types/enterprise-architecture";

/**
 * Enterprise ID prefix registry — metadata-driven, not hardcoded in generator.
 * Modules register prefixes at design-time bootstrap.
 */
export const DEFAULT_ENTERPRISE_ID_PREFIXES: EnterpriseIdPrefixConfig[] = [
  { code: "CAP", label: "Capability", description: "Platform capability", artifactType: "capability", padLength: 6 },
  { code: "OBJ", label: "Object", description: "Domain object model", artifactType: "object", padLength: 6 },
  { code: "SCR", label: "Screen", description: "UI screen or view", artifactType: "screen", padLength: 6 },
  { code: "API", label: "API", description: "Registered API surface", artifactType: "api", padLength: 6 },
  { code: "POL", label: "Policy", description: "Governance policy artifact", artifactType: "policy", padLength: 6 },
  { code: "RUL", label: "Rule", description: "Business rule definition", artifactType: "rule", padLength: 6 },
  { code: "WF", label: "Workflow", description: "Workflow definition", artifactType: "workflow", padLength: 6 },
  { code: "EVT", label: "Event", description: "Domain or integration event", artifactType: "event", padLength: 6 },
  { code: "REP", label: "Report", description: "Report definition", artifactType: "report", padLength: 6 },
  { code: "DSH", label: "Dashboard", description: "Dashboard artifact", artifactType: "dashboard", padLength: 6 },
  { code: "WDG", label: "Widget", description: "Dashboard widget", artifactType: "widget", padLength: 6 },
  { code: "INT", label: "Integration", description: "Integration connector", artifactType: "integration", padLength: 6 },
  { code: "PER", label: "Permission", description: "Permission definition", artifactType: "permission", padLength: 6 },
  { code: "ROL", label: "Role", description: "Role definition", artifactType: "role", padLength: 6 },
  { code: "MOD", label: "Module", description: "Platform module", artifactType: "module", padLength: 6 },
  { code: "SVC", label: "Service", description: "Platform service", artifactType: "service", padLength: 6 },
];

export const ATLAS_INTEGRATION_RESERVED = true;
export const FORGE_INTEGRATION_RESERVED = true;
export const COMPASS_INTEGRATION_RESERVED = true;
