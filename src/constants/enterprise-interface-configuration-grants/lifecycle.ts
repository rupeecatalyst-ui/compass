/**
 * ECG lifecycle & domain catalogue (SPR-005).
 */

import type {
  EcgConfigLifecycleState,
  EcgDomainKey,
  EcgEngineKey,
  EcgVersionDescriptor,
} from "@/types/enterprise-interface-configuration-grants";

export const ECG_FRAMEWORK_VERSION = "12.2.0-cf-chanakya-005";

export const ECG_SECTION_KINDS = {
  INTERFACE: "interface",
  CONFIGURATION: "configuration",
  GRANTS: "grants",
} as const;

export const ECG_LIFECYCLE_STATES = {
  DRAFT: "draft",
  VALIDATE: "validate",
  TEST: "test",
  APPROVE: "approve",
  PUBLISH: "publish",
  ARCHIVE: "archive",
  ROLLBACK: "rollback",
} as const satisfies Record<string, EcgConfigLifecycleState>;

/** Allowed transitions — architecture only. */
export const ECG_LIFECYCLE_TRANSITIONS: Record<
  EcgConfigLifecycleState,
  EcgConfigLifecycleState[]
> = {
  draft: ["validate", "archive"],
  validate: ["draft", "test", "archive"],
  test: ["validate", "approve", "draft", "archive"],
  approve: ["test", "publish", "draft", "archive"],
  publish: ["archive", "rollback"],
  archive: ["draft", "rollback"],
  rollback: ["draft", "publish", "archive"],
};

export function createEcgVersion(
  major: number,
  minor: number,
  draft = 0,
): EcgVersionDescriptor {
  const label =
    draft > 0 ? `${major}.${minor}.0-draft.${draft}` : `${major}.${minor}.0`;
  return { major, minor, draft, label };
}

export interface EcgDomainSeed {
  domainKey: EcgDomainKey;
  name: string;
  description: string;
  engineKey?: EcgEngineKey;
}

export const ECG_DOMAIN_CATALOGUE: EcgDomainSeed[] = [
  {
    domainKey: "products",
    name: "Products",
    description: "Product library and eligibility configuration.",
    engineKey: "eole",
  },
  {
    domainKey: "workflow",
    name: "Workflow",
    description: "EWOE orchestration definitions, triggers, and completion rules.",
    engineKey: "ewoe",
  },
  {
    domainKey: "documents",
    name: "Documents (EDIE)",
    description: "Document rules by product, employment, constitution, and stage.",
    engineKey: "edie",
  },
  {
    domainKey: "life",
    name: "LIFE",
    description: "Lender executor selection and hierarchy configuration.",
    engineKey: "life",
  },
  {
    domainKey: "task_engine",
    name: "Task Engine",
    description: "ETE task types, SLA colour rules, and escalation.",
    engineKey: "ete",
  },
  {
    domainKey: "communication",
    name: "Communication (ENCE)",
    description: "Communication policies and templates (simulation until delivery sprint).",
    engineKey: "ence",
  },
  {
    domainKey: "compass",
    name: "Compass",
    description: "Opportunity Compass needle thresholds and recommendations.",
    engineKey: "opportunity_compass",
  },
  {
    domainKey: "pulse",
    name: "Pulse",
    description: "Pulse weightages for live opportunity activity.",
    engineKey: "opportunity_intelligence",
  },
  {
    domainKey: "health_score",
    name: "Health Score",
    description: "Health score formula weightages and band thresholds.",
    engineKey: "opportunity_intelligence",
  },
  {
    domainKey: "chanakya",
    name: "CHANAKYA",
    description:
      "Advisory insight rules, Greeting Library, Closed Loop Business Coaching, and Intelligent Stage Coaching — structured responses for learning, advisory only (no autonomous automation).",
    engineKey: "chanakya",
  },
  {
    domainKey: "contact_master",
    name: "Contact Master",
    description: "ECM roles, validation, and contact policies.",
    engineKey: "ecm",
  },
  {
    domainKey: "opportunity",
    name: "Opportunity",
    description: "EOLE opportunity lifecycle and aging policy configuration.",
    engineKey: "eole",
  },
  {
    domainKey: "lenders",
    name: "Lenders",
    description: "Lender catalogue and LIFE mapping configuration.",
    engineKey: "life",
  },
  {
    domainKey: "customers",
    name: "Customers",
    description: "Customer category and constitution configuration.",
    engineKey: "ecm",
  },
  {
    domainKey: "security_grants",
    name: "Security & Grants",
    description: "Grants framework placeholder — no permission enforcement in SPR-005.",
    engineKey: "security_grants",
  },
];

/** SPR-006A — Decision Engine domain (advisory profiles only). */
export const ECG_EDE_DOMAIN_SEED = {
  domainKey: "opportunity" as const,
  name: "Enterprise Decision Engine",
  description: "EDE advisory evaluation profiles — ECG-managed; never executes actions.",
  engineKey: "ede" as const,
};

export interface EcgEngineSeed {
  engineKey: EcgEngineKey;
  engineName: string;
  frameworkVersion: string;
  domainKey: EcgDomainKey;
}

export const ECG_ENGINE_CATALOGUE: EcgEngineSeed[] = [
  { engineKey: "eole", engineName: "Opportunity Lifecycle (EOLE)", frameworkVersion: "11.0.0", domainKey: "opportunity" },
  { engineKey: "ewoe", engineName: "Workflow Orchestration (EWOE)", frameworkVersion: "12.0.0", domainKey: "workflow" },
  { engineKey: "edie", engineName: "Document Intelligence (EDIE)", frameworkVersion: "11.0.1", domainKey: "documents" },
  { engineKey: "life", engineName: "LIFE", frameworkVersion: "1.0.0-spr001", domainKey: "life" },
  { engineKey: "ete", engineName: "Task Engine (ETE)", frameworkVersion: "1.0.0-spr001", domainKey: "task_engine" },
  { engineKey: "ence", engineName: "Communication (ENCE)", frameworkVersion: "1.0.0-spr001", domainKey: "communication" },
  { engineKey: "opportunity_compass", engineName: "Opportunity Compass", frameworkVersion: "11.2.0", domainKey: "compass" },
  { engineKey: "opportunity_intelligence", engineName: "Opportunity Intelligence", frameworkVersion: "11.2.0", domainKey: "health_score" },
  { engineKey: "ecm", engineName: "Contact Master (ECM)", frameworkVersion: "1.0.0-spr001", domainKey: "contact_master" },
  { engineKey: "edc", engineName: "Dialogue Center (EDC)", frameworkVersion: "1.0.0-spr001", domainKey: "opportunity" },
  { engineKey: "platform_modes", engineName: "Platform Modes", frameworkVersion: "1.0.0-spr001", domainKey: "workflow" },
  { engineKey: "chanakya", engineName: "CHANAKYA Advisory", frameworkVersion: "12.2.0-cf-chanakya-005", domainKey: "chanakya" },
  { engineKey: "security_grants", engineName: "Security & Grants", frameworkVersion: "12.1.0", domainKey: "security_grants" },
  { engineKey: "ede", engineName: "Enterprise Decision Engine (EDE)", frameworkVersion: "13.0.0", domainKey: "opportunity" },
];
