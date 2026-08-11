/**
 * CO-NOTIFICATION-001 — Pure recipient row builder (no DB).
 */

import { buildEneDedupeKey } from "@/constants/enterprise-notification-engine";
import type { FanOutEnterpriseNotificationInput } from "@/types/enterprise-notification-engine";

export type ResolvedRecipient = {
  kind: "user" | "partner";
  userId?: string;
  partnerId?: string;
  reason: string;
};

export type EneCreateRowDraft = {
  organizationId: string;
  eventType: string;
  dedupeKey: string;
  sourceEventId: string;
  sourceSystem: string;
  title: string;
  body: string;
  description: string | null;
  actorUserId: string | null;
  actorName: string | null;
  recipientKind: string;
  recipientUserId: string | null;
  recipientPartnerId: string | null;
  opportunityId: string | null;
  dealId: string | null;
  contactId: string | null;
  customerName: string | null;
  productLabel: string | null;
  amountLabel: string | null;
  previousValue: string | null;
  newValue: string | null;
  href: string;
  occurredAt: Date;
};

export function buildRecipientRows(
  input: FanOutEnterpriseNotificationInput,
  recipients: ResolvedRecipient[],
): EneCreateRowDraft[] {
  const occurredAt =
    input.occurredAt instanceof Date
      ? input.occurredAt
      : new Date(input.occurredAt ?? Date.now());

  return recipients.map((r) => {
    const recipientId = r.kind === "user" ? r.userId! : r.partnerId!;
    const dedupeKey = buildEneDedupeKey({
      eventType: input.eventType,
      sourceEventId: input.sourceEventId,
      recipientKind: r.kind,
      recipientId,
    });
    return {
      organizationId: input.organizationId,
      eventType: input.eventType,
      dedupeKey,
      sourceEventId: input.sourceEventId,
      sourceSystem: input.sourceSystem,
      title: input.title,
      body: input.body,
      description: input.description ?? null,
      actorUserId: input.actorUserId ?? null,
      actorName: input.actorName ?? null,
      recipientKind: r.kind,
      recipientUserId: r.kind === "user" ? r.userId! : null,
      recipientPartnerId: r.kind === "partner" ? r.partnerId! : null,
      opportunityId: input.opportunityId ?? null,
      dealId: input.dealId ?? null,
      contactId: input.contactId ?? null,
      customerName: input.customerName ?? null,
      productLabel: input.productLabel ?? null,
      amountLabel: input.amountLabel ?? null,
      previousValue: input.previousValue ?? null,
      newValue: input.newValue ?? null,
      href: input.href,
      occurredAt,
    };
  });
}

/** Policy helper: actor never receives their own notification by default. */
export function excludeActorFromRecipients(
  recipients: ResolvedRecipient[],
  actorUserId?: string | null,
): ResolvedRecipient[] {
  const actor = actorUserId?.trim();
  if (!actor) return recipients;
  return recipients.filter((r) => !(r.kind === "user" && r.userId === actor));
}
