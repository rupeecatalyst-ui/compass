"use client";

/**
 * CO-C1-DIALOGUE-002 — Opportunity Workspace Activity Timeline.
 * Reuses WorkspaceDialoguePanel mount point; reads EAR via TransactionActivityTimeline.
 * Does NOT default to demo Opportunity context or seed demo dialogue rows.
 */

import { TransactionActivityTimeline } from "@/components/catalyst-one/transaction-activity-timeline";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import { StrategicTabToolbar } from "./strategic-tab-toolbar";

export function WorkspaceDialoguePanel() {
  const { opportunityId, contact } = useOpportunityWorkspace();

  if (!opportunityId) {
    return (
      <p className="text-xs text-muted-foreground">
        Open an Opportunity to view its Activity Timeline.
      </p>
    );
  }

  return (
    <div className="space-y-4" data-panel="workspace-activity-timeline">
      <StrategicTabToolbar
        title="Activity Timeline"
        description="What has happened on this transaction — chronological work history."
      />
      <TransactionActivityTimeline
        scope={{ mode: "opportunity", opportunityId }}
        notesContext={{
          workspaceKind: "opportunity",
          entityKind: "opportunity",
          entityId: opportunityId,
          opportunityId,
          contactId: contact?.id ?? null,
        }}
        title="Opportunity history"
        description="Notes, activities, documents, tasks, and stage events for this Opportunity."
      />
    </div>
  );
}

/** Alias for discoverability — same EAR-backed panel. */
export { WorkspaceDialoguePanel as WorkspaceActivityTimelinePanel };
