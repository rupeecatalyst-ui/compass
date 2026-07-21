/**
 * CO-SPRINT-106 — Enterprise Workspace Layout Standard
 * Layer responsibilities for complex execution desks (Loan Workspace first).
 */

export const ENTERPRISE_WORKSPACE_LAYERS = [
  "global_header",
  "workspace_header",
  "workflow_status",
  "workspace_navigation",
  "workspace_content",
] as const;

export type EnterpriseWorkspaceLayerId = (typeof ENTERPRISE_WORKSPACE_LAYERS)[number];
