"use client";

/**
 * CO-UX-021 — Opportunity Workspace Notes tab.
 * Replaces localStorage strategic notes with Enterprise Business Notes SSOT.
 */

import { EnterpriseBusinessNotesPanel } from "@/components/catalyst-one/enterprise-business-notes";
import { useOpportunityWorkspace } from "./opportunity-workspace-context";
import { StrategicTabToolbar } from "./strategic-tab-toolbar";

export function WorkspaceNotesPanel() {
  const { opportunityId, contact } = useOpportunityWorkspace();

  if (!opportunityId) {
    return (
      <p className="text-xs text-muted-foreground">
        Open an Opportunity to capture Business Notes.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <StrategicTabToolbar
        title="Business Notes"
        description="Official enterprise notes — part of activity history and business context."
      />
      <EnterpriseBusinessNotesPanel
        context={{
          workspaceKind: "opportunity",
          entityKind: "opportunity",
          entityId: opportunityId,
          opportunityId,
          contactId: contact?.id ?? null,
        }}
        query={{ opportunityId, entityKind: "opportunity", entityId: opportunityId }}
      />
    </div>
  );
}
