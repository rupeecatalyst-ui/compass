"use client";

import { EmailContextWorkspace } from "@/components/catalyst-one/action-center/workspaces/email-context-workspace";
import { WhatsAppContextWorkspace } from "@/components/catalyst-one/action-center/workspaces/whatsapp-context-workspace";
import { EnterpriseActivityComposer } from "@/components/catalyst-one/action-center/workspaces/enterprise-activity-composer";
import { useAuthContext } from "@/components/providers/auth-provider";
import { resolveKanbanDealParticipants, groupKanbanParticipants } from "@/lib/my-deals/kanban-participants";
import type { DealRegistryRow } from "@/types/deal-registry";

export type MyDealsKanbanComposerKind =
  | "call"
  | "email"
  | "whatsapp"
  | "activity"
  | "followup";

export function MyDealsKanbanComposer({
  kind,
  row,
  onClose,
}: {
  kind: MyDealsKanbanComposerKind | null;
  row: DealRegistryRow | null;
  onClose: () => void;
}) {
  const { user } = useAuthContext();
  if (!kind || !row) return null;

  const participants = resolveKanbanDealParticipants(row);
  const sides = groupKanbanParticipants(participants);
  const dealId = row.enterpriseDealId || row.id;
  const entityLabel = [
    sides.customerSide[0] ? `Customer: ${sides.customerSide[0].name}` : null,
    sides.lenderSide[0] ? `Lender: ${sides.lenderSide[0].name}` : null,
    row.dealId,
  ]
    .filter(Boolean)
    .join(" · ");
  const actorLabel =
    [user?.firstName, user?.lastName].filter(Boolean).join(" ").trim() || "Rupee Catalyst";

  if (kind === "email") {
    return (
      <EmailContextWorkspace
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        opportunityId={row.opportunityId || ""}
        dealId={dealId}
        entityId={dealId}
        entityLabel={entityLabel}
        product={row.product}
        stage={row.grossStageLabel}
        customerName={row.borrowerName}
        fileNumber={row.fileNumber}
        opportunityNumber={row.opportunityNumber}
        dealNumber={row.dealId}
        lender={row.selectedLender}
        rm={row.assignedRm}
        participants={participants}
      />
    );
  }

  if (kind === "whatsapp") {
    return (
      <WhatsAppContextWorkspace
        open
        onOpenChange={(open) => {
          if (!open) onClose();
        }}
        entityId={dealId}
        entityLabel={entityLabel}
        product={row.product}
        stage={row.grossStageLabel}
        customerName={row.borrowerName}
        fileNumber={row.fileNumber}
        rm={row.assignedRm}
        participants={participants}
      />
    );
  }

  const heading =
    kind === "call"
      ? "Log call"
      : kind === "followup"
        ? "Schedule follow-up"
        : "Add Activity";

  return (
    <EnterpriseActivityComposer
      open
      onOpenChange={(open) => {
        if (!open) onClose();
      }}
      heading={heading}
      actorUserId={user?.id ?? "unknown"}
      actorLabel={actorLabel}
      onSaved={onClose}
      composer={{
        contextType: "deal",
        contextId: dealId,
        entityLabel,
        opportunityId: row.opportunityId,
        dealId,
        product: row.product,
        stage: row.grossStageLabel,
        customerName: row.borrowerName,
      }}
    />
  );
}
