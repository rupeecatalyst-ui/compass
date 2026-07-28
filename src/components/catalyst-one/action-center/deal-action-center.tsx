"use client";

/**
 * CO-UX-015 — Deal Workspace Action Center.
 * Reuses the shared Enterprise ActionCenter (same component as Opportunity Workspace).
 * Bound to the active Enterprise Deal — no manual Deal selection inside Deal Workspace.
 */

import { useCallback, useMemo, useState } from "react";
import { toast } from "sonner";
import { ActionCenter } from "@/components/catalyst-one/action-center/action-center";
import { EnterpriseOutboxProvider } from "@/components/catalyst-one/action-center/enterprise-outbox-provider";
import { EmailContextWorkspace } from "@/components/catalyst-one/action-center/workspaces/email-context-workspace";
import { WhatsAppContextWorkspace } from "@/components/catalyst-one/action-center/workspaces/whatsapp-context-workspace";
import { DEAL_REFERENCE_ACTION_IDS } from "@/constants/enterprise-action-center";
import {
  preferredDealParticipantId,
  resolveDealCommunicationParticipants,
} from "@/lib/enterprise-action-center";
import { resolveDealBorrowerIdentity } from "@/lib/enterprise-borrower-identity";
import type { DealPipelineRuntime } from "@/types/deal-pipeline-runtime";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import type {
  ActionCenterActionId,
  OutboxMessage,
} from "@/types/enterprise-action-center";

const EMAIL_TARGET_MAP: Partial<
  Record<
    ActionCenterActionId,
    "lender_representative" | "customer" | "wealth_partner" | "referral_source"
  >
> = {
  email_lender: "lender_representative",
  email_customer: "customer",
  email_partner: "wealth_partner",
  email_source: "referral_source",
};

export function DealActionCenter({
  runtime,
  activeDeal,
  className,
  onTimelineNote,
}: {
  runtime: DealPipelineRuntime;
  /** Active lender Deal — switches automatically when the operator focuses another card. */
  activeDeal: EnterpriseDealApiRecord;
  className?: string;
  onTimelineNote?: (title: string, description: string) => void;
}) {
  const [emailOpen, setEmailOpen] = useState(false);
  const [whatsappOpen, setWhatsappOpen] = useState(false);
  const [editing, setEditing] = useState<OutboxMessage | null>(null);
  const [preferredRecipientId, setPreferredRecipientId] = useState<string | undefined>();

  const participants = useMemo(
    () => resolveDealCommunicationParticipants(runtime, activeDeal),
    [runtime, activeDeal],
  );

  const borrower = useMemo(
    () => resolveDealBorrowerIdentity(activeDeal),
    [activeDeal],
  );
  const customerName = borrower.displayName || runtime.context.customerName;

  const lenderLabel =
    runtime.lenders.find(
      (l) =>
        l.enterpriseDealId === activeDeal.id ||
        l.id === activeDeal.id ||
        (activeDeal.lenderId && l.lenderRegistryId === activeDeal.lenderId),
    )?.lender ||
    activeDeal.primaryCounterpartyName ||
    "Lender";

  const entityLabel = [
    lenderLabel,
    activeDeal.dealNumber,
    customerName,
  ]
    .filter(Boolean)
    .join(" · ");

  const stageLabel = activeDeal.subStage || activeDeal.grossStage || "Lender Pipeline";
  const product = activeDeal.productLabel || runtime.context.loanProduct;

  const openEmailFor = useCallback(
    (target?: (typeof EMAIL_TARGET_MAP)[ActionCenterActionId]) => {
      if (target) {
        const id = preferredDealParticipantId(participants, target);
        if (!id) {
          const labels: Record<string, string> = {
            lender_representative: "lender relationship manager",
            customer: "primary borrower",
            wealth_partner: "channel / wealth partner",
            referral_source: "referral source",
          };
          toast.message(
            `No ${labels[target] ?? "recipient"} is linked to this Deal yet.`,
          );
          return;
        }
        setPreferredRecipientId(id);
      } else {
        setPreferredRecipientId(undefined);
      }
      setEditing(null);
      setEmailOpen(true);
    },
    [participants],
  );

  const onAction = useCallback(
    (id: ActionCenterActionId) => {
      const target = EMAIL_TARGET_MAP[id];
      if (target) {
        openEmailFor(target);
        return;
      }
      if (id === "send_email") {
        openEmailFor();
        return;
      }
      if (id === "send_whatsapp") {
        setEditing(null);
        setWhatsappOpen(true);
        return;
      }
      if (id === "upload_documents") {
        toast.message("Open Document Center from the journey to manage Deal documents.");
        return;
      }
      toast.message(`${id.replace(/_/g, " ")} will open as a Context Workspace in a later sprint.`);
    },
    [openEmailFor],
  );

  const onEditOutbox = useCallback((message: OutboxMessage) => {
    setEditing(message);
    setPreferredRecipientId(message.recipientId);
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
          entityId: activeDeal.id,
          entityLabel,
          product,
          stage: stageLabel,
        }}
        enabledActionIds={[...DEAL_REFERENCE_ACTION_IDS]}
        onAction={onAction}
        className={className}
      />

      <EmailContextWorkspace
        open={emailOpen}
        onOpenChange={(open) => {
          setEmailOpen(open);
          if (!open) {
            setEditing(null);
            setPreferredRecipientId(undefined);
          }
        }}
        entityId={activeDeal.id}
        entityLabel={entityLabel}
        product={product}
        stage={stageLabel}
        customerName={customerName}
        fileNumber={activeDeal.dealNumber}
        rm={activeDeal.relationshipManagerName || runtime.context.relationshipManager}
        participants={participants}
        preferredRecipientId={preferredRecipientId}
        editingMessage={editing?.channel === "email" ? editing : null}
      />

      <WhatsAppContextWorkspace
        open={whatsappOpen}
        onOpenChange={(open) => {
          setWhatsappOpen(open);
          if (!open) setEditing(null);
        }}
        entityId={activeDeal.id}
        entityLabel={entityLabel}
        product={product}
        stage={stageLabel}
        customerName={customerName}
        fileNumber={activeDeal.dealNumber}
        rm={activeDeal.relationshipManagerName || runtime.context.relationshipManager}
        participants={participants}
        editingMessage={editing?.channel === "whatsapp" ? editing : null}
      />
    </EnterpriseOutboxProvider>
  );
}
