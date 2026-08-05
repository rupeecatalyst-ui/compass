/**
 * CO-360-001 — Enterprise Universal 360° Workspace Framework types.
 * Registry = Identity & Master Data SSOT · Workspace = Daily Operations.
 */

export type Enterprise360EntityKind =
  | "customer"
  | "lender"
  | "wealth_partner"
  | "vendor"
  | "employee"
  | "contact";

/** Shared sections available on every 360 Workspace. */
export type Enterprise360CommonSectionId =
  | "executive_summary"
  | "timeline"
  | "documents"
  | "tasks"
  | "notes"
  | "communications"
  | "activities"
  | "ai_insights"
  | "audit_history"
  | "attachments";

export type Enterprise360SectionId = string;

export type Enterprise360CommandId =
  | "edit"
  | "create_task"
  | "upload_document"
  | "view_timeline"
  | "view_communications"
  | "add_note"
  | "ai_summary"
  | "print"
  | "export";

export type Enterprise360SectionKind = "common" | "entity";

export interface Enterprise360SectionDefinition {
  id: Enterprise360SectionId;
  label: string;
  description?: string;
  kind: Enterprise360SectionKind;
  /** Order within the workspace (lower first). */
  order: number;
  /** When true, section is part of the opening executive dashboard strip. */
  dashboard?: boolean;
}

export interface Enterprise360CommandDefinition {
  id: Enterprise360CommandId;
  label: string;
  description?: string;
  order: number;
}

export interface Enterprise360EntityModuleDefinition {
  kind: Enterprise360EntityKind;
  label: string;
  /** Registry that remains SSOT for identity / master data. */
  registryLabel: string;
  /** Canonical operational workspace route pattern (may be future). */
  workspaceRoutePattern: string;
  sections: readonly Enterprise360SectionDefinition[];
  commands: readonly Enterprise360CommandDefinition[];
  aiInsightFocus: string;
}

export interface Enterprise360IdentityRoleLink {
  roleId: string;
  roleLabel: string;
  entityKind: Enterprise360EntityKind | null;
  /** When set, opens that entity's 360 Workspace. */
  workspaceHref: string | null;
  assigned: boolean;
}

export interface Enterprise360ExecutiveDashboard {
  currentStatus: string;
  pendingActions: number;
  openTasks: number;
  upcomingActivities: number;
  complianceAlerts: number;
  documentsPending: number;
  recentTimelineCount: number;
  summaryLine: string;
}

export interface Enterprise360AiInsight {
  id: string;
  title: string;
  summary: string;
  focus: string;
  generatedAt: string;
}

export interface Enterprise360TimelineEvent {
  id: string;
  event: string;
  at: string;
  actorUserId: string | null;
  detail: string | null;
}

export interface Enterprise360AuditEntry {
  id: string;
  userId: string | null;
  at: string;
  action: string;
  oldValue: string | null;
  newValue: string | null;
}

export interface Enterprise360DocumentRef {
  id: string;
  displayName: string;
  categoryLabel: string;
  status: string;
  /** Document Registry record id — SSOT; never duplicated under 360. */
  documentRegistryRecordId: string;
}

export interface Enterprise360WorkspaceSnapshot {
  frameworkVersion: string;
  entityKind: Enterprise360EntityKind;
  entityId: string;
  entityLabel: string;
  registryLabel: string;
  sections: Enterprise360SectionDefinition[];
  commands: Enterprise360CommandDefinition[];
  dashboard: Enterprise360ExecutiveDashboard;
  aiInsights: Enterprise360AiInsight[];
  timeline: Enterprise360TimelineEvent[];
  audit: Enterprise360AuditEntry[];
  documents: Enterprise360DocumentRef[];
  /** Contact 360 only — assigned business roles with deep links. */
  identityRoles?: Enterprise360IdentityRoleLink[];
  principles: readonly string[];
}

export interface ComposeEnterprise360Input {
  entityKind: Enterprise360EntityKind;
  entityId: string;
  entityLabel: string;
  currentStatus?: string;
  pendingActions?: number;
  openTasks?: number;
  upcomingActivities?: number;
  complianceAlerts?: number;
  documentsPending?: number;
  timeline?: Enterprise360TimelineEvent[];
  audit?: Enterprise360AuditEntry[];
  documents?: Enterprise360DocumentRef[];
  identityRoles?: Enterprise360IdentityRoleLink[];
  aiSummaryOverride?: string;
}
