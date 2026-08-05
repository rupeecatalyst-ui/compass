/**
 * CO-360-001 — Enterprise Universal 360° Workspace Framework (SSOT constants).
 * Frozen architecture: Registry = identity/master · Workspace = operations.
 */

import { ROUTES } from "@/constants/routes";
import type {
  Enterprise360CommandDefinition,
  Enterprise360CommonSectionId,
  Enterprise360EntityKind,
  Enterprise360EntityModuleDefinition,
  Enterprise360SectionDefinition,
} from "@/types/enterprise-360-workspace";

export const ENTERPRISE_360_FRAMEWORK_VERSION = "1.0.0-co-360-001" as const;

export const ENTERPRISE_360_MODULE_ID = "co-360-001";

/** Extra Contact 360 role chips beyond frozen identity model (projection only). */
export const ENTERPRISE_360_CONTACT_EXTRA_ROLES: ReadonlyArray<{
  id: string;
  label: string;
}> = [{ id: "introducer", label: "Introducer" }];

export const ENTERPRISE_360_PRINCIPLES = [
  "Registry = Identity & Master Data (Enterprise SSOT).",
  "Workspace = Daily Operations (operational interface only).",
  "No operational activity shall be performed directly inside a Registry.",
  "Registries remain administrative; Workspaces remain operational.",
  "Every core business entity inherits the Universal 360° framework.",
  "Document Registry remains the document SSOT — 360 never duplicates binaries.",
  "ETE remains the task SSOT — 360 projects tasks, never invents a parallel task engine.",
] as const;

const COMMON_ORDER: Record<Enterprise360CommonSectionId, number> = {
  executive_summary: 10,
  timeline: 80,
  documents: 50,
  tasks: 60,
  notes: 65,
  communications: 70,
  activities: 75,
  ai_insights: 90,
  audit_history: 95,
  attachments: 55,
};

export const ENTERPRISE_360_COMMON_SECTIONS: readonly Enterprise360SectionDefinition[] = [
  {
    id: "executive_summary",
    label: "Executive Summary",
    kind: "common",
    order: COMMON_ORDER.executive_summary,
    dashboard: true,
    description: "Opening operational dashboard for the entity.",
  },
  {
    id: "documents",
    label: "Documents",
    kind: "common",
    order: COMMON_ORDER.documents,
    description: "Projection of Enterprise Document Registry (no duplicates).",
  },
  {
    id: "attachments",
    label: "Attachments",
    kind: "common",
    order: COMMON_ORDER.attachments,
    description: "Supporting attachments linked via Document Registry.",
  },
  {
    id: "tasks",
    label: "Tasks",
    kind: "common",
    order: COMMON_ORDER.tasks,
    description: "ETE projection for this entity.",
  },
  {
    id: "notes",
    label: "Notes",
    kind: "common",
    order: COMMON_ORDER.notes,
  },
  {
    id: "communications",
    label: "Communications",
    kind: "common",
    order: COMMON_ORDER.communications,
  },
  {
    id: "activities",
    label: "Activities",
    kind: "common",
    order: COMMON_ORDER.activities,
  },
  {
    id: "timeline",
    label: "Timeline",
    kind: "common",
    order: COMMON_ORDER.timeline,
    description: "Automatic operational timeline events.",
  },
  {
    id: "ai_insights",
    label: "AI Insights",
    kind: "common",
    order: COMMON_ORDER.ai_insights,
    description: "Entity-specific Chanakya / AI summaries (advisory).",
  },
  {
    id: "audit_history",
    label: "Audit History",
    kind: "common",
    order: COMMON_ORDER.audit_history,
    description: "User · Timestamp · Action · Old Value · New Value.",
  },
] as const;

export const ENTERPRISE_360_COMMAND_BAR: readonly Enterprise360CommandDefinition[] = [
  { id: "edit", label: "Edit", order: 1 },
  { id: "create_task", label: "Create Task", order: 2 },
  { id: "upload_document", label: "Upload Document", order: 3 },
  { id: "view_timeline", label: "View Timeline", order: 4 },
  { id: "view_communications", label: "View Communications", order: 5 },
  { id: "add_note", label: "Add Note", order: 6 },
  { id: "ai_summary", label: "AI Summary", order: 7 },
  { id: "print", label: "Print", order: 8 },
  { id: "export", label: "Export", order: 9 },
] as const;

function entitySections(
  rows: Array<Omit<Enterprise360SectionDefinition, "kind">>,
): Enterprise360SectionDefinition[] {
  return rows.map((r) => ({ ...r, kind: "entity" as const }));
}

/** Customer 360° entity sections (plus common framework sections). */
const CUSTOMER_ENTITY_SECTIONS = entitySections([
  { id: "personal_details", label: "Personal Details", order: 20 },
  { id: "kyc", label: "KYC", order: 22 },
  { id: "family_members", label: "Family Members", order: 24 },
  { id: "financial_profile", label: "Financial Profile", order: 26 },
  { id: "loan_files", label: "Loan Files", order: 30 },
  { id: "opportunities", label: "Opportunities", order: 32 },
]);

const LENDER_ENTITY_SECTIONS = entitySections([
  { id: "relationship_managers", label: "Relationship Managers", order: 20 },
  { id: "branches", label: "Branches", order: 22 },
  { id: "products", label: "Products", order: 24 },
  { id: "product_guidelines", label: "Product Guidelines", order: 26 },
  { id: "credit_policies", label: "Credit Policies", order: 28 },
  { id: "active_opportunities", label: "Active Opportunities", order: 30 },
  { id: "active_deals", label: "Active Deals", order: 32 },
  { id: "pipeline_summary", label: "Pipeline Summary", order: 34, dashboard: true },
  { id: "approval_ratio", label: "Approval Ratio", order: 36, dashboard: true },
  { id: "disbursement_ratio", label: "Disbursement Ratio", order: 38, dashboard: true },
  { id: "revenue_generated", label: "Revenue Generated", order: 40, dashboard: true },
  { id: "average_tat", label: "Average TAT", order: 42, dashboard: true },
  { id: "pending_cases", label: "Pending Cases", order: 44, dashboard: true },
  { id: "sla_compliance", label: "SLA Compliance", order: 46, dashboard: true },
]);

const WEALTH_PARTNER_ENTITY_SECTIONS = entitySections([
  { id: "commercial_profile", label: "Commercial Profile", order: 20 },
  { id: "hierarchy", label: "Hierarchy", order: 22 },
  { id: "reporting_manager", label: "Reporting Manager", order: 24 },
  { id: "opportunities", label: "Opportunities", order: 30 },
  { id: "deals", label: "Deals", order: 32 },
  { id: "revenue", label: "Revenue", order: 34, dashboard: true },
  { id: "commission", label: "Commission", order: 36 },
  { id: "payouts", label: "Payouts", order: 38 },
  { id: "legal_compliance", label: "Legal & Compliance", order: 40 },
  { id: "agreement_history", label: "Agreement History", order: 42 },
  { id: "renewal_status", label: "Renewal Status", order: 44, dashboard: true },
  { id: "performance", label: "Performance", order: 46 },
]);

const VENDOR_ENTITY_SECTIONS = entitySections([
  { id: "vendor_category", label: "Vendor Category", order: 20 },
  { id: "services", label: "Services", order: 22 },
  { id: "contacts", label: "Contacts", order: 24 },
  { id: "contracts", label: "Contracts", order: 26 },
  { id: "agreements", label: "Agreements", order: 28 },
  { id: "invoices", label: "Invoices", order: 30 },
  { id: "payments", label: "Payments", order: 32 },
  { id: "outstanding_bills", label: "Outstanding Bills", order: 34, dashboard: true },
  { id: "gst", label: "GST", order: 36 },
  { id: "tds", label: "TDS", order: 38 },
  { id: "bank_details", label: "Bank Details", order: 40 },
  { id: "performance", label: "Performance", order: 42 },
  { id: "sla", label: "SLA", order: 44 },
  { id: "work_orders", label: "Work Orders", order: 46 },
]);

const EMPLOYEE_ENTITY_SECTIONS = entitySections([
  { id: "department", label: "Department", order: 20 },
  { id: "role", label: "Role", order: 22 },
  { id: "attendance", label: "Attendance", order: 24 },
  { id: "leave", label: "Leave", order: 26 },
  { id: "targets", label: "Targets", order: 28 },
  { id: "performance", label: "Performance", order: 30 },
  { id: "training", label: "Training", order: 32 },
]);

const CONTACT_ENTITY_SECTIONS = entitySections([
  { id: "personal_information", label: "Personal Information", order: 20 },
  { id: "contact_details", label: "Contact Details", order: 22 },
  { id: "address", label: "Address", order: 24 },
  { id: "communication", label: "Communication", order: 26 },
  {
    id: "business_roles",
    label: "Business Roles",
    order: 28,
    description: "Assigned roles — open the corresponding 360 Workspace.",
    dashboard: true,
  },
]);

export const ENTERPRISE_360_ENTITY_MODULES: Record<
  Enterprise360EntityKind,
  Enterprise360EntityModuleDefinition
> = {
  customer: {
    kind: "customer",
    label: "Customer 360°",
    registryLabel: "Customer / Contact Registry",
    workspaceRoutePattern: `${ROUTES.CONTACTS}?view=customer-360&id=:id`,
    sections: [...ENTERPRISE_360_COMMON_SECTIONS, ...CUSTOMER_ENTITY_SECTIONS],
    commands: ENTERPRISE_360_COMMAND_BAR,
    aiInsightFocus: "Financial readiness",
  },
  lender: {
    kind: "lender",
    label: "Lender 360°",
    registryLabel: "Enterprise Lender Registry",
    workspaceRoutePattern: `${ROUTES.LENDERS}/:id/workspace`,
    sections: [...ENTERPRISE_360_COMMON_SECTIONS, ...LENDER_ENTITY_SECTIONS],
    commands: ENTERPRISE_360_COMMAND_BAR,
    aiInsightFocus: "Pipeline health",
  },
  wealth_partner: {
    kind: "wealth_partner",
    label: "Wealth Partner 360°",
    registryLabel: "Wealth Partner Registry",
    workspaceRoutePattern: `${ROUTES.WEALTH_PARTNERS}/:id/workspace`,
    sections: [...ENTERPRISE_360_COMMON_SECTIONS, ...WEALTH_PARTNER_ENTITY_SECTIONS],
    commands: ENTERPRISE_360_COMMAND_BAR,
    aiInsightFocus: "Business performance",
  },
  vendor: {
    kind: "vendor",
    label: "Vendor 360°",
    registryLabel: "Vendor Registry (extends Contact)",
    workspaceRoutePattern: `${ROUTES.CONTACTS}?view=vendor-360&id=:id`,
    sections: [...ENTERPRISE_360_COMMON_SECTIONS, ...VENDOR_ENTITY_SECTIONS],
    commands: ENTERPRISE_360_COMMAND_BAR,
    aiInsightFocus: "Service quality",
  },
  employee: {
    kind: "employee",
    label: "Employee 360°",
    registryLabel: "Employee / Contact Registry",
    workspaceRoutePattern: `${ROUTES.CONTACTS}?view=employee-360&id=:id`,
    sections: [...ENTERPRISE_360_COMMON_SECTIONS, ...EMPLOYEE_ENTITY_SECTIONS],
    commands: ENTERPRISE_360_COMMAND_BAR,
    aiInsightFocus: "Productivity",
  },
  contact: {
    kind: "contact",
    label: "Contact 360°",
    registryLabel: "Enterprise Contact Registry (Identity SSOT)",
    workspaceRoutePattern: `${ROUTES.CONTACTS}?contact=:id&view=360`,
    sections: [...ENTERPRISE_360_COMMON_SECTIONS, ...CONTACT_ENTITY_SECTIONS],
    commands: ENTERPRISE_360_COMMAND_BAR,
    aiInsightFocus: "Identity & role completeness",
  },
};

export const ENTERPRISE_360_ENTITY_KINDS = Object.keys(
  ENTERPRISE_360_ENTITY_MODULES,
) as Enterprise360EntityKind[];

export const ENTERPRISE_360_TIMELINE_EVENT_TYPES = [
  "created",
  "updated",
  "approved",
  "rejected",
  "assigned",
  "document_uploaded",
  "agreement_signed",
  "payment_received",
  "deal_closed",
] as const;

export function getEnterprise360Module(
  kind: Enterprise360EntityKind,
): Enterprise360EntityModuleDefinition {
  return ENTERPRISE_360_ENTITY_MODULES[kind];
}

export function listEnterprise360Sections(
  kind: Enterprise360EntityKind,
): Enterprise360SectionDefinition[] {
  return [...getEnterprise360Module(kind).sections].sort((a, b) => a.order - b.order);
}

export function buildEnterprise360AdminDemoHref(kind?: Enterprise360EntityKind): string {
  const base = ROUTES.ADMIN_ENTERPRISE_360;
  return kind ? `${base}?entity=${encodeURIComponent(kind)}` : base;
}
