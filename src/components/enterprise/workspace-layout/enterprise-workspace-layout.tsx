"use client";

import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * CO-SPRINT-106 — Layered Enterprise Workspace Layout.
 * Each horizontal band has exactly one responsibility.
 */

export function EnterpriseWorkspaceLayout({
  workspaceHeader,
  workflowStatus,
  navigation,
  children,
  className,
}: {
  workspaceHeader: ReactNode;
  workflowStatus?: ReactNode;
  navigation?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn("flex min-h-0 flex-1 flex-col overflow-hidden", className)}
      data-enterprise-workspace-layout=""
    >
      <div className="shrink-0" data-layer="workspace_header">
        {workspaceHeader}
      </div>
      {workflowStatus ? (
        <div className="shrink-0" data-layer="workflow_status">
          {workflowStatus}
        </div>
      ) : null}
      {navigation ? (
        <div className="shrink-0" data-layer="workspace_navigation">
          {navigation}
        </div>
      ) : null}
      <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden" data-layer="workspace_content">
        {children}
      </div>
    </div>
  );
}

/** Layer 2 — identity, primary actions, journey cards. */
export function EnterpriseWorkspaceHeaderBand({
  identity,
  actions,
  journey,
  className,
}: {
  identity: ReactNode;
  actions: ReactNode;
  journey?: ReactNode;
  className?: string;
}) {
  return (
    <header
      className={cn(
        "border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3 px-3 py-2 sm:px-4">
        <div className="min-w-0 flex-1">{identity}</div>
        <div className="flex shrink-0 flex-wrap items-center justify-end gap-1.5">{actions}</div>
      </div>
      {journey ? <div className="border-t border-border/40">{journey}</div> : null}
    </header>
  );
}

/** Layer 3 — Workspace Intelligence Ribbon (full-width operational guidance). */
export function EnterpriseWorkflowStatusBand({
  children,
  context,
  summary,
  className,
}: {
  /** Preferred: full-width ribbon / single child. */
  children?: ReactNode;
  /** @deprecated CO-SPRINT-110 — use children (full-width ribbon). */
  context?: ReactNode;
  /** @deprecated CO-SPRINT-110 — pipeline summaries belong on Kanban, not here. */
  summary?: ReactNode;
  className?: string;
}) {
  if (children) {
    return (
      <div className={cn("w-full min-w-0", className)} data-layer="workspace_intelligence">
        {children}
      </div>
    );
  }
  // Legacy split layout (should not be used for Loan Workspace)
  if (!context && !summary) return null;
  return (
    <div
      className={cn(
        "flex w-full min-w-0 flex-wrap items-center gap-2 border-b border-border/60 bg-muted/20 px-3 py-1.5 sm:px-4",
        className,
      )}
      data-layer="workflow_status"
    >
      {context ? <div className="min-w-0 flex-1">{context}</div> : null}
      {summary ? <div className="flex shrink-0 flex-wrap items-center gap-1.5">{summary}</div> : null}
    </div>
  );
}
