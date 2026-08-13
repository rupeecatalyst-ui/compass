/**
 * Resolve communication participants for a loan transaction.
 * Alignment note: consumes loan-linked participants as a Relationship Registry
 * projection until Enterprise Relationship Registry is the live SSOT.
 */

import type { LoanFile } from "@/types/catalyst-one";
import type { ContextParticipant } from "@/types/enterprise-action-center";
import type { DealPipelineRuntime } from "@/types/deal-pipeline-runtime";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";
import { resolveDealBorrowerIdentity } from "@/lib/enterprise-borrower-identity";

export function resolveLoanCommunicationParticipants(file: LoanFile): ContextParticipant[] {
  const list: ContextParticipant[] = [];

  list.push({
    id: `customer:${file.customerId || file.id}`,
    name: file.customerName,
    recipientType: "customer",
    email: file.customerEmail || undefined,
    mobile: file.customerMobile || undefined,
    identityRef: file.customerId ? `identity:customer:${file.customerId}` : undefined,
  });

  if (file.coApplicant?.trim()) {
    list.push({
      id: `co_applicant:${file.coApplicantId || file.coApplicant}`,
      name: file.coApplicant,
      recipientType: "co_applicant",
      identityRef: file.coApplicantId
        ? `identity:contact:${file.coApplicantId}`
        : undefined,
    });
  }

  if (file.guarantor?.trim()) {
    list.push({
      id: `guarantor:${file.guarantorId || file.guarantor}`,
      name: file.guarantor,
      recipientType: "guarantor",
      identityRef: file.guarantorId ? `identity:contact:${file.guarantorId}` : undefined,
    });
  }

  if (file.relationshipManager?.trim()) {
    list.push({
      id: `rm:${file.relationshipManager}`,
      name: file.relationshipManager,
      recipientType: "relationship_manager",
    });
  }

  if (file.lender?.trim() && file.lender.toLowerCase() !== "not selected") {
    list.push({
      id: `lender:${file.lender}`,
      name: file.lender,
      recipientType: "lender_representative",
    });
  }

  if (file.sourceContactName?.trim()) {
    list.push({
      id: `partner:${file.sourceContactId || file.sourceContactName}`,
      name: file.sourceContactName,
      recipientType: "wealth_partner",
      identityRef: file.sourceContactId
        ? `identity:contact:${file.sourceContactId}`
        : undefined,
    });
  }

  const leadSource =
    "leadSource" in file && typeof (file as { leadSource?: string }).leadSource === "string"
      ? (file as { leadSource?: string }).leadSource
      : undefined;
  if (leadSource?.trim()) {
    list.push({
      id: `source:${leadSource}`,
      name: leadSource.trim(),
      recipientType: "referral_source",
    });
  }

  for (const p of file.participants ?? []) {
    if (p.status === "inactive") continue;
    const already = list.some(
      (x) => x.name.toLowerCase() === p.name.toLowerCase() || x.id.includes(p.entityId),
    );
    if (already) continue;

    let recipientType: ContextParticipant["recipientType"] = "other";
    if (p.role === "co_applicant") recipientType = "co_applicant";
    else if (p.role === "primary_applicant") recipientType = "customer";

    list.push({
      id: `participant:${p.id}`,
      name: p.name,
      recipientType,
      email: p.email,
      mobile: p.mobile,
      identityRef: `identity:contact:${p.entityId}`,
    });
  }

  return list;
}

/**
 * CO-UX-015 / CO-C1-FOLLOWUP-002 — Resolve Deal Workspace recipients from the active
 * Enterprise Deal + Opportunity pipeline lenders only (never full Lender Master).
 * Prefer resolved parties; omit empty roles so Action Center never asks for manual lookup.
 */
export function resolveDealCommunicationParticipants(
  runtime: DealPipelineRuntime,
  activeDeal?: EnterpriseDealApiRecord | null,
): ContextParticipant[] {
  const deal = activeDeal ?? runtime.deal;
  const ctx = runtime.context;
  const snap =
    deal.snapshot && typeof deal.snapshot === "object"
      ? (deal.snapshot as Record<string, unknown>)
      : {};

  const list: ContextParticipant[] = [];

  const borrower = resolveDealBorrowerIdentity(deal);
  const customerName = borrower.displayName || ctx.customerName;
  if (customerName?.trim()) {
    list.push({
      id: `customer:${borrower.partyEntityId || ctx.customerId || deal.id}`,
      name: customerName.trim(),
      recipientType: "customer",
      email: deal.primaryContactEmail || undefined,
      mobile: deal.primaryContactMobile || undefined,
      identityRef: borrower.partyId ? `identity:${borrower.partyId}` : undefined,
    });
  }

  // Context-only lenders: identified / active pipeline for this transaction.
  const seenLenderKeys = new Set<string>();
  for (const card of runtime.lenders ?? []) {
    const key = card.lenderRegistryId || card.enterpriseDealId || card.id || card.lender;
    if (!key || seenLenderKeys.has(key)) continue;
    seenLenderKeys.add(key);
    const contactName =
      card.lenderSalesContactName?.trim() ||
      "Relationship Manager";
    const designation =
      card.lenderSalesContactDesignationLabel?.trim() || "Relationship Manager";
    const lenderLabel = card.lender?.trim() || "Lender";
    list.push({
      id: `lender:${card.enterpriseDealId || card.id || key}`,
      name: `${lenderLabel} · ${contactName} — ${designation}`,
      recipientType: "lender_representative",
      email: card.lenderSalesContactOfficialEmail || undefined,
      mobile: card.lenderSalesContactMobile || undefined,
      identityRef: card.lenderRegistryId
        ? `identity:lender:${card.lenderRegistryId}`
        : undefined,
    });
  }

  if (seenLenderKeys.size === 0) {
    const lenderCard =
      runtime.lenders.find(
        (l) =>
          l.enterpriseDealId === deal.id ||
          l.id === deal.id ||
          (deal.lenderId && l.lenderRegistryId === deal.lenderId),
      ) ?? null;
    const lenderName =
      lenderCard?.lender ||
      deal.primaryCounterpartyName ||
      "Lender";
    list.push({
      id: `lender:${deal.lenderId || deal.id}`,
      name: `${lenderName} · Relationship Manager`,
      recipientType: "lender_representative",
      email: lenderCard?.lenderSalesContactOfficialEmail || undefined,
      mobile: lenderCard?.lenderSalesContactMobile || undefined,
      identityRef: deal.lenderId ? `identity:lender:${deal.lenderId}` : undefined,
    });
  }

  const partnerName =
    (typeof snap.channelPartnerName === "string" && snap.channelPartnerName) ||
    (typeof snap.partnerName === "string" && snap.partnerName) ||
    (typeof snap.wealthPartnerName === "string" && snap.wealthPartnerName) ||
    (deal.invoicePartyType === "channel_partner" ||
    deal.invoicePartyType === "wealth_partner" ||
    deal.invoicePartyType === "ca"
      ? deal.invoicePartySpecify
      : null);

  const partnerEmail =
    (typeof snap.channelPartnerEmail === "string" && snap.channelPartnerEmail) ||
    (typeof snap.partnerEmail === "string" && snap.partnerEmail) ||
    (typeof snap.wealthPartnerEmail === "string" && snap.wealthPartnerEmail) ||
    null;

  if (partnerName?.trim()) {
    list.push({
      id: `partner:${deal.invoicePartyContactId || deal.invoicePartyId || partnerName}`,
      name: partnerName.trim(),
      recipientType: "wealth_partner",
      email: partnerEmail?.trim() || undefined,
      identityRef: deal.invoicePartyContactId
        ? `identity:contact:${deal.invoicePartyContactId}`
        : undefined,
    });
  }

  const sourceName =
    (typeof snap.referralSourceName === "string" && snap.referralSourceName) ||
    (typeof snap.leadSource === "string" && snap.leadSource) ||
    (typeof snap.sourceName === "string" && snap.sourceName) ||
    null;

  if (sourceName?.trim()) {
    list.push({
      id: `source:${sourceName}`,
      name: sourceName.trim(),
      recipientType: "referral_source",
    });
  }

  const rm = deal.relationshipManagerName || ctx.relationshipManager;
  if (rm?.trim()) {
    list.push({
      id: `rm:${deal.relationshipManagerUserId || rm}`,
      name: rm.trim(),
      recipientType: "relationship_manager",
    });
  }

  return list;
}

/** Recipient type groups for contextual Send Email (CO-C1-FOLLOWUP-002). */
export type SendEmailRecipientGroupId =
  | "customer"
  | "wealth_partner"
  | "lender"
  | "internal_employee";

export function classifySendEmailRecipientGroup(
  type: ContextParticipant["recipientType"],
): SendEmailRecipientGroupId | null {
  switch (type) {
    case "customer":
    case "co_applicant":
    case "guarantor":
      return "customer";
    case "wealth_partner":
      return "wealth_partner";
    case "lender_representative":
      return "lender";
    case "relationship_manager":
    case "hybrid_employee":
      return "internal_employee";
    default:
      return null;
  }
}

export const SEND_EMAIL_RECIPIENT_GROUPS: ReadonlyArray<{
  id: SendEmailRecipientGroupId;
  label: string;
}> = [
  { id: "customer", label: "Customer" },
  { id: "wealth_partner", label: "Wealth Partner" },
  { id: "lender", label: "Lender" },
  { id: "internal_employee", label: "Internal Employee" },
];

export function preferredDealParticipantId(
  participants: ContextParticipant[],
  target:
    | "lender_representative"
    | "customer"
    | "wealth_partner"
    | "referral_source",
): string | undefined {
  return participants.find((p) => p.recipientType === target)?.id;
}

export function applyTemplatePlaceholders(
  text: string,
  vars: Record<string, string | undefined>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key]?.trim() || "—");
}
