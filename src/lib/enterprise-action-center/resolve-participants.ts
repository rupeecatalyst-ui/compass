/**
 * Resolve communication participants for a loan transaction.
 * Alignment note: consumes loan-linked participants as a Relationship Registry
 * projection until Enterprise Relationship Registry is the live SSOT.
 */

import type { LoanFile } from "@/types/catalyst-one";
import type { ContextParticipant } from "@/types/enterprise-action-center";

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

export function applyTemplatePlaceholders(
  text: string,
  vars: Record<string, string | undefined>,
): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key: string) => vars[key]?.trim() || "—");
}
