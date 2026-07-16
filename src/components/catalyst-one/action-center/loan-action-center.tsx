"use client";

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionCenter } from "@/components/catalyst-one/action-center/action-center";
import { EnterpriseOutboxProvider } from "@/components/catalyst-one/action-center/enterprise-outbox-provider";
import { EmailContextWorkspace } from "@/components/catalyst-one/action-center/workspaces/email-context-workspace";
import { WhatsAppContextWorkspace } from "@/components/catalyst-one/action-center/workspaces/whatsapp-context-workspace";
import { DocumentsContextWorkspace } from "@/components/catalyst-one/action-center/workspaces/documents-context-workspace";
import { LOAN_REFERENCE_ACTION_IDS } from "@/constants/enterprise-action-center";
import { resolveLoanCommunicationParticipants } from "@/lib/enterprise-action-center";
import { STAGE_LABELS } from "@/constants/loan-stage-master";
import type { LoanFile, LoanFileDocument } from "@/types/catalyst-one";
import type {
  ActionCenterActionId,
  OutboxMessage,
} from "@/types/enterprise-action-center";

/**
 * Loan Workspace reference implementation of Action Center + Context Workspaces.
 */
export function LoanActionCenter({
  loan,
  onDocumentsChange,
  onTimelineNote,
}: {
  loan: LoanFile;
  onDocumentsChange: (docs: LoanFileDocument[]) => void;
  onTimelineNote?: (title: string, description: string) => void;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [docsOpen, setDocsOpen] = useState(false);
  const [editing, setEditing] = useState<OutboxMessage | null>(null);

  const participants = useMemo(
    () => resolveLoanCommunicationParticipants(loan),
    [loan],
  );

  const entityLabel = `${loan.customerName} · ${loan.fileNumber}`;
  const stageLabel = STAGE_LABELS[loan.stage] ?? loan.stage;

  const onAction = useCallback((id: ActionCenterActionId) => {
    setEditing(null);
    if (id === "send_email") setEmailOpen(true);
    else if (id === "send_whatsapp") setWhatsappOpen(true);
    else if (id === "upload_documents") setDocsOpen(true);
  }, []);

  const onEditOutbox = useCallback((message: OutboxMessage) => {
    setEditing(message);
    if (message.channel === "email") setEmailOpen(true);
    else setWhatsappOpen(true);
  }, []);

  return (
    <EnterpriseOutboxProvider
      onEdit={onEditOutbox}
      onDispatched={(message) => {
        onTimelineNote?.(
          message.channel === "email"
            ? `Email sent · ${message.recipientName}`
            : `WhatsApp sent · ${message.recipientName}`,
          message.subject || message.body.slice(0, 120),
        );
      }}
    >
      <ActionCenter
        context={{
          entityType: "loan",
          entityId: loan.id,
          entityLabel,
          product: loan.loanProduct,
          stage: stageLabel,
        }}
        enabledActionIds={[...LOAN_REFERENCE_ACTION_IDS]}
        onAction={onAction}
      />

      <EmailContextWorkspace
        open={emailOpen}
        onOpenChange={(open) => {
          setEmailOpen(open);
          if (!open) setEditing(null);
        }}
        entityId={loan.id}
        entityLabel={entityLabel}
        product={loan.loanProduct}
        stage={stageLabel}
        customerName={loan.customerName}
        fileNumber={loan.fileNumber}
        rm={loan.relationshipManager}
        participants={participants}
        editingMessage={editing?.channel === "email" ? editing : null}
      />

      <WhatsAppContextWorkspace
        open={whatsappOpen}
        onOpenChange={(open) => {
          setWhatsappOpen(open);
          if (!open) setEditing(null);
        }}
        entityId={loan.id}
        entityLabel={entityLabel}
        product={loan.loanProduct}
        stage={stageLabel}
        customerName={loan.customerName}
        fileNumber={loan.fileNumber}
        rm={loan.relationshipManager}
        participants={participants}
        editingMessage={editing?.channel === "whatsapp" ? editing : null}
      />

      <DocumentsContextWorkspace
        open={docsOpen}
        onOpenChange={setDocsOpen}
        entityId={loan.id}
        entityLabel={entityLabel}
        documents={loan.documents ?? []}
        onDocumentsChange={onDocumentsChange}
        onTimelineNote={onTimelineNote}
      />
    </EnterpriseOutboxProvider>
  );
}

/** Lightweight toast helper when Chanakya-only stubs are selected later. */
export function notifyActionComingSoon(label: string) {
  toast.message(`${label} will open as a Context Workspace in a later sprint.`);
}
