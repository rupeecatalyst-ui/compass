/**
 * Chanakya knowledge helpers — EDL as enterprise knowledge source.
 * Chanakya explains history; never invents it.
 */

import { EDL_CHANGE_CATEGORY_LABELS } from "@/constants/enterprise-decision-ledger";
import type { EdlLedgerEntry } from "@/types/enterprise-decision-ledger";
import { explainCommercialPolicyForTransaction } from "./commercial-versioning";
import {
  getEnterpriseDecision,
  listEnterpriseDecisionsByEntity,
} from "./ledger-registry";

export function explainEdlEntry(entry: EdlLedgerEntry): string {
  const category =
    EDL_CHANGE_CATEGORY_LABELS[entry.changeCategory] ?? entry.changeCategory;
  return [
    `What changed: ${category} (${entry.changeType}) to version ${entry.versionNumber}.`,
    `Who requested: ${entry.requestedBy}.`,
    `Who approved: ${entry.approvedBy}.`,
    entry.implementedBy ? `Who implemented: ${entry.implementedBy}.` : null,
    `Why: ${entry.businessJustification}.`,
    `Effective from: ${entry.effectiveFrom.slice(0, 10)}${entry.effectiveUntil ? ` until ${entry.effectiveUntil.slice(0, 10)}` : ""}.`,
    entry.notImpactedNote ? `Impact note: ${entry.notImpactedNote}` : null,
    `Ledger ID: ${entry.ledgerId}.`,
  ]
    .filter(Boolean)
    .join(" ");
}

export function resolveChanakyaEdlExplanation(input: {
  ledgerId?: string;
  entityType?: string;
  entityId?: string;
  agreementCode?: string;
  transactionCreatedAt?: string;
}): string {
  if (input.agreementCode && input.transactionCreatedAt) {
    return explainCommercialPolicyForTransaction({
      agreementCode: input.agreementCode,
      transactionCreatedAt: input.transactionCreatedAt,
    });
  }
  if (input.ledgerId) {
    const entry = getEnterpriseDecision(input.ledgerId);
    if (!entry) {
      return `No Enterprise Decision Ledger entry found for ${input.ledgerId}. Chanakya cannot invent history.`;
    }
    return explainEdlEntry(entry);
  }
  if (input.entityType && input.entityId) {
    const list = listEnterpriseDecisionsByEntity(input.entityType, input.entityId);
    if (list.length === 0) {
      return `No Enterprise Decision Ledger history is recorded for this entity. Chanakya cannot invent history.`;
    }
    return explainEdlEntry(list[0]!);
  }
  return "Provide a Ledger ID, entity reference, or commercial agreement + transaction date for Chanakya to explain history.";
}
