/**
 * Sync Loan Structure participants into the enterprise relationship projection
 * so ERW / Contact 360 stay consistent. UI-layer projection — no backend API changes.
 */

import { getLoanStructureRole } from "@/constants/loan-structure";
import { getEcmContact } from "@/lib/enterprise-contact-master";
import type { LoanFile } from "@/types/catalyst-one";
import type { LoanParticipant } from "@/types/loan-participant";

export interface LoanStructureRelationshipLink {
  id: string;
  loanFileId: string;
  fromContactId: string;
  toEntityId: string;
  toEntityType: "individual" | "company";
  toName: string;
  roleCode: string;
  erwRelationshipCode: string;
  updatedOn: string;
}

const STORAGE_KEY = "catalyst-one:loan-structure:erw-links";

function readAll(): LoanStructureRelationshipLink[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as LoanStructureRelationshipLink[]) : [];
  } catch {
    return [];
  }
}

function writeAll(links: LoanStructureRelationshipLink[]) {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(links));
  } catch {
    /* ignore quota */
  }
}

/** Replace all relationship links for a loan file from current participants. */
export function syncLoanStructureRelationships(
  file: LoanFile,
  participants: LoanParticipant[],
): LoanStructureRelationshipLink[] {
  const fromContactId = file.customerId?.trim();
  if (!fromContactId) return listLoanStructureRelationshipsForContact(file.customerId);

  const now = new Date().toISOString();
  const others = readAll().filter((l) => l.loanFileId !== file.id);
  const nextForLoan: LoanStructureRelationshipLink[] = [];

  for (const p of participants.filter((x) => x.status !== "inactive" && x.entityId)) {
    if (p.entityType === "individual" && p.entityId === fromContactId) continue;
    const roleCode =
      p.entityType === "company"
        ? "company"
        : p.role === "guarantor"
          ? "guarantor"
          : p.role === "income_contributor"
            ? "income_contributor"
            : p.role === "authorized_signatory"
              ? "authorized_signatory"
              : p.role === "other"
                ? "other"
                : "co_applicant";
    const roleDef = getLoanStructureRole(roleCode);
    nextForLoan.push({
      id: `lsr:${file.id}:${p.id}`,
      loanFileId: file.id,
      fromContactId,
      toEntityId: p.entityId,
      toEntityType: p.entityType,
      toName: p.name || getEcmContact(p.entityId)?.name || "Participant",
      roleCode,
      erwRelationshipCode: roleDef?.erwRelationshipCode ?? "other",
      updatedOn: now,
    });
  }

  writeAll([...others, ...nextForLoan]);
  return nextForLoan;
}

export function listLoanStructureRelationshipsForContact(
  contactId?: string,
): LoanStructureRelationshipLink[] {
  if (!contactId) return [];
  return readAll().filter(
    (l) => l.fromContactId === contactId || l.toEntityId === contactId,
  );
}

export function listAllLoanStructureRelationships(): LoanStructureRelationshipLink[] {
  return readAll();
}
