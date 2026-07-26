/**
 * Resolve communication participants for a loan transaction.
 * Alignment note: consumes loan-linked participants as a Relationship Registry
 * projection until Enterprise Relationship Registry is the live SSOT.
 */

import type { LoanFile } from "@/types/catalyst-one";
import type { ContextParticipant } from "@/types/enterprise-action-center";
import type { DealPipelineRuntime } from "@/types/deal-pipeline-runtime";
import type { EnterpriseDealApiRecord } from "@/lib/enterprise-deal/deal-api-client";

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
 * CO-UX-015 — Resolve Deal Workspace recipients from the active Enterprise Deal.
 * Prefer resolved parties; omit empty roles so Action Center never asks for manual lookup.
 */
export function resolveDealCommunicationParticipants(
  runtime: DealPipelineRuntime,
  activeDeal?: EnterpriseDealApiRecord | null,
): ContextParticipant[] {
  const deal = activeDeal ?? runtime.deal;
  const ctx = runtime.context;
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
  const snap =
    deal.snapshot && typeof deal.snapshot === "object"
      ? (deal.snapshot as Record<string, unknown>)
      : {};

  const list: ContextParticipant[] = [];

  const customerName = deal.primaryContactName || ctx.customerName;
  if (customerName?.trim()) {
    list.push({
      id: `customer:${deal.primaryContactId || ctx.customerId || deal.id}`,
      name: customerName.trim(),
      recipientType: "customer",
      email: deal.primaryContactEmail || undefined,
      mobile: deal.primaryContactMobile || undefined,
      identityRef: deal.primaryContactId
        ? `identity:contact:${deal.primaryContactId}`
        : undefined,
    });
  }

  list.push({
    id: `lender:${deal.lenderId || deal.id}`,
    name: `${lenderName} · Relationship Manager`,
    recipientType: "lender_representative",
    identityRef: deal.lenderId ? `identity:lender:${deal.lenderId}` : undefined,
  });

  const partnerName =
    (typeof snap.channelPartnerName === "string" && snap.channelPartnerName) ||
    (typeof snap.partnerName === "string" && snap.partnerName) ||
    (typeof snap.wealthPartnerName === "string" && snap.wealthPartnerName) ||
    (deal.invoicePartyType === "channel_partner" ||
    deal.invoicePartyType === "wealth_partner" ||
    deal.invoicePartyType === "ca"
      ? deal.invoicePartySpecify
      : null);

  if (partnerName?.trim()) {
    list.push({
      id: `partner:${deal.invoicePartyContactId || deal.invoicePartyId || partnerName}`,
      name: partnerName.trim(),
      recipientType: "wealth_partner",
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
      id: `rm:${rm}`,
      name: rm.trim(),
      recipientType: "relationship_manager",
    });
  }

  return list;
}

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
