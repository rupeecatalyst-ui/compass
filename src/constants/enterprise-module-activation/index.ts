/**
 * CO-ORG-005 — Enterprise Module Activation map (architecturally designed modules only).
 * Status reflects Soft Go-Live with ENTERPRISE_PERSISTENCE_MODE=prisma.
 * Do not invent new modules here — activate existing architecture.
 */

export type EnterpriseModuleActivationClass =
  | "active"
  | "partially_active"
  | "inactive"
  | "blocked"
  | "awaiting_ssot";

export type EnterpriseModuleActivationEntry = {
  id: string;
  label: string;
  classification: EnterpriseModuleActivationClass;
  /** Canonical route or admin path when navigable */
  route?: string;
  /** Authoritative SSOT / compose path */
  ssot: string;
  /** What CO-ORG-005 activated or confirmed */
  activationNote: string;
};

/**
 * Frozen inventory for Business Certification — update only when activation work lands.
 */
export const ENTERPRISE_MODULE_ACTIVATION: readonly EnterpriseModuleActivationEntry[] = [
  {
    id: "organization",
    label: "Organization Workspace",
    classification: "active",
    route: "/organization",
    ssot: "Prisma Organization Workspace (CO-ORG-001)",
    activationNote: "Durable org MDM + EAR dual-write confirmed.",
  },
  {
    id: "customers",
    label: "Customers / Contacts (ECM)",
    classification: "active",
    route: "/contacts",
    ssot: "Prisma ECM Contact / Company",
    activationNote: "ACTIVE under prisma; demo seeds gated.",
  },
  {
    id: "opportunity_registry",
    label: "Opportunity Registry",
    classification: "active",
    route: "/my-opportunities",
    ssot: "Prisma EnterpriseOpportunity",
    activationNote: "Registry spine ACTIVE under prisma.",
  },
  {
    id: "opportunity_workspace",
    label: "Opportunity Workspace",
    classification: "partially_active",
    route: "/opportunities",
    ssot: "Opportunity Registry + EAR hydrate + ETE tasks",
    activationNote: "Dialogue/timeline hydrate EAR; tasks list ETE; chrome frozen.",
  },
  {
    id: "documents",
    label: "Documents (Document Center)",
    classification: "partially_active",
    route: "/documents",
    ssot: "Document Registry + Prisma EnterpriseTransactionDocument",
    activationNote: "Upload sync + hydrate wired under prisma (CO-DOC-002).",
  },
  {
    id: "dialogue",
    label: "Dialogue (EDC / Dialogue Center)",
    classification: "partially_active",
    route: "/dialogue",
    ssot: "EAR chronology + EDC projection",
    activationNote: "Readers hydrate EAR; authoring dual-writes EAR (CO-ORG-003).",
  },
  {
    id: "tasks",
    label: "Tasks (ETE)",
    classification: "partially_active",
    route: "/tasks",
    ssot: "Enterprise Task Engine (in-memory ports; DealTask Prisma residual)",
    activationNote: "Canonical ETE authoring active; durable Prisma ports deferred.",
  },
  {
    id: "lenders",
    label: "Lenders",
    classification: "active",
    route: "/lenders",
    ssot: "Prisma Enterprise Lender Registry",
    activationNote: "ACTIVE under prisma; local-store Soft Go-Live only.",
  },
  {
    id: "accounting",
    label: "Accounting",
    classification: "awaiting_ssot",
    route: "/accounting",
    ssot: "Pending Deal-keyed Accounting Registry",
    activationNote: "Empty-honest model; nav badge Awaiting SSOT (CO-ORG-004/005).",
  },
  {
    id: "horizon",
    label: "Horizon",
    classification: "awaiting_ssot",
    route: "/horizon",
    ssot: "Pending strategic portfolio SSOT",
    activationNote: "Empty-honest portfolio; nav badge Awaiting SSOT.",
  },
  {
    id: "mission_control",
    label: "Mission Control",
    classification: "partially_active",
    route: "/mission-control/executive-briefing",
    ssot: "EME certified snapshot + EBI compose + EAR activity",
    activationNote: "Briefing uses certified snapshot; Situation Room / EDW bind EBI (CO-ORG-005).",
  },
  {
    id: "chanakya",
    label: "CHANAKYA",
    classification: "active",
    route: "/chanakya-radar",
    ssot: "Radar / Live Intelligence / Guide derive SSOTs",
    activationNote: "Operational derive ACTIVE; Activity Intelligence formula unchanged.",
  },
  {
    id: "workflow",
    label: "Workflow Engine (Admin)",
    classification: "partially_active",
    route: "/admin/workflow-engine",
    ssot: "Admin config / stage library — Deal stages own pipeline runtime",
    activationNote: "Config-only honesty banner; does not drive Lender Pipeline.",
  },
  {
    id: "enterprise_ai",
    label: "Enterprise AI / SARATHI",
    classification: "partially_active",
    route: "/ai-assistant",
    ssot: "EAI shadow / stub providers — Hybrid Cutover frozen (ADR-022)",
    activationNote: "Reachable; stub LLM not production brain until PO authorises cutover.",
  },
  {
    id: "activity_registry",
    label: "Enterprise Activity Registry",
    classification: "active",
    route: "/api/enterprise-activity",
    ssot: "Prisma EnterpriseActivityEvent (CO-ORG-003)",
    activationNote: "Universal chronology SSOT for cross-desk readers.",
  },
  {
    id: "deal_registry",
    label: "Deal Registry",
    classification: "active",
    route: "/my-deals",
    ssot: "Prisma EnterpriseDeal",
    activationNote: "Phase B ACTIVE under prisma.",
  },
] as const;

export function listEnterpriseModulesByClass(
  classification: EnterpriseModuleActivationClass,
): EnterpriseModuleActivationEntry[] {
  return ENTERPRISE_MODULE_ACTIVATION.filter((m) => m.classification === classification);
}
