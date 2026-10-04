/**
 * Kanban communication recipients from Deal Registry facts.
 * Distinguishes customer-side vs lender-side. Never invents contacts.
 */

import type { ContextParticipant } from "@/types/enterprise-action-center";
import type { DealRegistryRow } from "@/types/deal-registry";
import { classifySendEmailRecipientGroup } from "@/lib/enterprise-action-center";

export type MyDealsKanbanRecipientSide = "customer" | "lender" | "other";

export function classifyKanbanRecipientSide(
  participant: ContextParticipant,
): MyDealsKanbanRecipientSide {
  const group = classifySendEmailRecipientGroup(participant.recipientType);
  if (group === "customer") return "customer";
  if (group === "lender") return "lender";
  if (participant.recipientType === "referral_source") return "other";
  return "other";
}

function present(value: string | null | undefined): string | undefined {
  const trimmed = value?.trim();
  if (!trimmed || trimmed === "—") return undefined;
  return trimmed;
}

export function resolveKanbanDealParticipants(row: DealRegistryRow): ContextParticipant[] {
  const list: ContextParticipant[] = [];
  const borrower = present(row.borrowerName);
  if (borrower) {
    list.push({
      id: `customer:${row.opportunityId || row.id}`,
      name: borrower,
      recipientType: "customer",
      email: present(row.borrowerEmail),
      mobile: present(row.contactNumber),
      identityRef: row.opportunityId ? `identity:opportunity:${row.opportunityId}` : undefined,
    });
  }

  const lender = present(row.selectedLender);
  if (lender) {
    const contactName = present(row.lenderContactName);
    list.push({
      id: `lender:${row.enterpriseDealId || row.id}`,
      name: contactName ? `${lender} · ${contactName}` : lender,
      recipientType: "lender_representative",
      email: present(row.lenderContactEmail),
      mobile: present(row.lenderContactMobile),
      identityRef: row.lenderId ? `identity:lender:${row.lenderId}` : undefined,
    });
  }

  const source = present(row.sourceContactName) || present(row.source);
  if (source && source !== lender) {
    list.push({
      id: `source:${row.id}`,
      name: source,
      recipientType: present(row.channelPartner) ? "wealth_partner" : "referral_source",
      email: present(row.sourceContactEmail),
      mobile: present(row.sourceContactMobile),
    });
  }

  const rm = present(row.assignedRm);
  if (rm) {
    list.push({
      id: `rm:${row.assignedUsers[0]?.id || rm}`,
      name: rm,
      recipientType: "relationship_manager",
    });
  }

  return list;
}

export function groupKanbanParticipants(participants: ContextParticipant[]): {
  customerSide: ContextParticipant[];
  lenderSide: ContextParticipant[];
  other: ContextParticipant[];
} {
  const customerSide: ContextParticipant[] = [];
  const lenderSide: ContextParticipant[] = [];
  const other: ContextParticipant[] = [];
  for (const p of participants) {
    const side = classifyKanbanRecipientSide(p);
    if (side === "customer") customerSide.push(p);
    else if (side === "lender") lenderSide.push(p);
    else other.push(p);
  }
  return { customerSide, lenderSide, other };
}

export type KanbanChannelAction = "call" | "email" | "whatsapp";

export function kanbanActionAvailability(
  participants: ContextParticipant[],
  action: KanbanChannelAction,
): { available: boolean; reason?: string } {
  const { customerSide, lenderSide } = groupKanbanParticipants(participants);
  const pool = [...customerSide, ...lenderSide];
  if (pool.length === 0) {
    return {
      available: false,
      reason: "No customer-side or lender-side contact is linked to this Deal.",
    };
  }
  if (action === "email") {
    const withEmail = pool.filter((p) => present(p.email));
    if (withEmail.length === 0) {
      return {
        available: false,
        reason: "No email address is captured for customer-side or lender-side contacts.",
      };
    }
  }
  if (action === "call" || action === "whatsapp") {
    const withMobile = pool.filter((p) => present(p.mobile));
    if (withMobile.length === 0) {
      return {
        available: false,
        reason: "No mobile number is captured for customer-side or lender-side contacts.",
      };
    }
  }
  return { available: true };
}
