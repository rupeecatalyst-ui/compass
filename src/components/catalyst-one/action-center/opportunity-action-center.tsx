"use client";

import { useCallback, useState } from "react";
import { toast } from "sonner";
import { ActionCenter } from "@/components/catalyst-one/action-center/action-center";
import { EnterpriseActivityComposer } from "@/components/catalyst-one/action-center/workspaces/enterprise-activity-composer";
import { OPPORTUNITY_REFERENCE_ACTION_IDS } from "@/constants/enterprise-action-center";
import type { ActionCenterActionId } from "@/types/enterprise-action-center";

/**
 * Strategic Workspace Action Center — primary entry for navigation + routine actions.
 * CO-VOICE-002 — Add Activity opens Enterprise Activity Composer.
 */
export function OpportunityActionCenter({
  entityId,
  entityLabel,
  product,
  stage,
  canEditContact,
  customerName,
  contactId,
  onOpenCreditWorkbench,
  onOpenLoanWorkspace,
  onAddContact,
  onEditContact,
  onUploadDocuments,
  onActivitySaved,
}: {
  entityId: string;
  entityLabel: string;
  product?: string;
  stage?: string;
  canEditContact: boolean;
  customerName?: string;
  contactId?: string | null;
  onOpenCreditWorkbench: () => void;
  onOpenLoanWorkspace: () => void;
  onAddContact: () => void;
  onEditContact: () => void;
  onUploadDocuments?: () => void;
  onActivitySaved?: () => void;
}) {
  const [activityOpen, setActivityOpen] = useState(false);

  const onAction = useCallback(
    (id: ActionCenterActionId) => {
      if (id === "add_activity") {
        setActivityOpen(true);
        return;
      }
      if (id === "open_credit_workbench") {
        onOpenCreditWorkbench();
        return;
      }
      if (id === "open_loan_workspace") {
        onOpenLoanWorkspace();
        return;
      }
      if (id === "add_contact") {
        onAddContact();
        return;
      }
      if (id === "edit_contact") {
        if (!canEditContact) {
          toast.message("No primary contact to edit yet.");
          return;
        }
        onEditContact();
        return;
      }
      if (id === "upload_documents") {
        onUploadDocuments?.();
        return;
      }
      if (id === "send_email" || id === "send_whatsapp") {
        toast.message(
          "Compose opens as a Context Workspace — use Loan Workspace for full outbox flow in this sprint.",
        );
        return;
      }
    },
    [
      canEditContact,
      onAddContact,
      onEditContact,
      onOpenCreditWorkbench,
      onOpenLoanWorkspace,
      onUploadDocuments,
    ],
  );

  const enabled = OPPORTUNITY_REFERENCE_ACTION_IDS.filter((id) => {
    if (id === "edit_contact") return canEditContact;
    return true;
  });

  return (
    <>
      <ActionCenter
        context={{
          entityType: "opportunity",
          entityId,
          entityLabel,
          product,
          stage,
        }}
        enabledActionIds={[...enabled]}
        onAction={onAction}
        className="h-7 px-2.5 text-[11px]"
      />

      <EnterpriseActivityComposer
        open={activityOpen}
        onOpenChange={setActivityOpen}
        composer={{
          contextType: "opportunity",
          contextId: entityId,
          entityLabel,
          opportunityId: entityId,
          contactId: contactId ?? null,
          product,
          stage,
          customerName,
        }}
        actorUserId="session-user"
        actorLabel="RM"
        onSaved={onActivitySaved}
      />
    </>
  );
}
