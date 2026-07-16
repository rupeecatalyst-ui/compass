/**
 * Commercial agreement versioning — temporal integrity for commissions & commercials.
 * Transactions use the version effective on their creation date.
 */

import type { EdlCommercialAgreementVersion, EdlLedgerEntry } from "@/types/enterprise-decision-ledger";
import { getEdlPorts } from "./composition";
import { recordEnterpriseDecision } from "./ledger-registry";

export interface PublishCommercialVersionInput {
  agreementCode: string;
  agreementLabel: string;
  relatedEntityType: EdlCommercialAgreementVersion["relatedEntityType"];
  relatedEntityId: string;
  versionNumber: string;
  effectiveFrom: string;
  effectiveUntil?: string | null;
  terms: Record<string, unknown>;
  requestedBy: string;
  approvedBy: string;
  implementedBy?: string;
  businessJustification: string;
  previousTerms?: Record<string, unknown> | null;
}

/**
 * Publish a new commercial version. Prior versions remain for historical transactions.
 */
export function publishCommercialAgreementVersion(
  input: PublishCommercialVersionInput,
): { version: EdlCommercialAgreementVersion; ledger: EdlLedgerEntry } {
  const existing = getEdlPorts().commercials.listByAgreement(input.agreementCode);
  const prior = [...existing].sort(
    (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime(),
  )[0];

  // Close prior open-ended version at the day before new effective (temporal integrity).
  if (prior && !prior.effectiveUntil) {
    const closed: EdlCommercialAgreementVersion = {
      ...prior,
      effectiveUntil: input.effectiveFrom,
    };
    // Append-only store: re-append as historical closure record is not allowed to mutate.
    // We keep prior row immutable; resolution uses effective windows only.
    void closed;
  }

  const ledger = recordEnterpriseDecision({
    requestedBy: input.requestedBy,
    approvedBy: input.approvedBy,
    implementedBy: input.implementedBy,
    previousValue: input.previousTerms ?? prior?.terms ?? null,
    newValue: input.terms,
    businessJustification: input.businessJustification,
    effectiveFrom: input.effectiveFrom,
    effectiveUntil: input.effectiveUntil ?? null,
    versionNumber: input.versionNumber,
    impactScope: "transaction_future_only",
    changeType: "versioned",
    changeCategory:
      input.relatedEntityType === "partner"
        ? "partner_commercials"
        : input.relatedEntityType === "lender"
          ? "lender_commercials"
          : "commercial_agreement",
    relatedEngine: "Enterprise Decision Ledger · Commercial Versioning",
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    relatedEntityLabel: input.agreementLabel,
    notImpactedNote: `Transactions created before ${input.effectiveFrom} continue using the prior commercial version.`,
  });

  const version: EdlCommercialAgreementVersion = {
    id: `edl-com-${crypto.randomUUID()}`,
    agreementCode: input.agreementCode,
    agreementLabel: input.agreementLabel,
    relatedEntityType: input.relatedEntityType,
    relatedEntityId: input.relatedEntityId,
    versionNumber: input.versionNumber,
    effectiveFrom: input.effectiveFrom,
    effectiveUntil: input.effectiveUntil ?? null,
    terms: input.terms,
    ledgerId: ledger.ledgerId,
    createdBy: input.implementedBy || input.approvedBy,
    createdAt: new Date().toISOString(),
  };

  getEdlPorts().commercials.append(version);
  return { version, ledger };
}

/**
 * Resolve commercial terms for a transaction creation instant.
 * Historical calculations never auto-shift to newer versions.
 */
export function resolveCommercialVersionForDate(input: {
  agreementCode: string;
  asOfIso: string;
}): EdlCommercialAgreementVersion | null {
  const asOf = new Date(input.asOfIso).getTime();
  if (Number.isNaN(asOf)) return null;

  const versions = getEdlPorts()
    .commercials.listByAgreement(input.agreementCode)
    .filter((v) => {
      const from = new Date(v.effectiveFrom).getTime();
      if (Number.isNaN(from) || asOf < from) return false;
      if (!v.effectiveUntil) return true;
      const until = new Date(v.effectiveUntil).getTime();
      return !Number.isNaN(until) && asOf < until;
    })
    .sort((a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime());

  return versions[0] ?? null;
}

export function listCommercialAgreementVersions(
  agreementCode?: string,
): EdlCommercialAgreementVersion[] {
  const all = agreementCode
    ? getEdlPorts().commercials.listByAgreement(agreementCode)
    : getEdlPorts().commercials.list();
  return [...all].sort(
    (a, b) => new Date(b.effectiveFrom).getTime() - new Date(a.effectiveFrom).getTime(),
  );
}

/**
 * Chanakya-safe explanation string — never invents history.
 */
export function explainCommercialPolicyForTransaction(input: {
  agreementCode: string;
  transactionCreatedAt: string;
}): string {
  const version = resolveCommercialVersionForDate({
    agreementCode: input.agreementCode,
    asOfIso: input.transactionCreatedAt,
  });
  if (!version) {
    return `No commercial policy version is recorded in the Enterprise Decision Ledger for agreement ${input.agreementCode} on the transaction creation date. Chanakya cannot invent history.`;
  }
  const commission =
    typeof version.terms.commissionPct === "number"
      ? ` Commission ${version.terms.commissionPct}%.`
      : "";
  return `The commercial terms on this transaction follow ${version.agreementLabel} Version ${version.versionNumber}, which was effective on the transaction creation date (${input.transactionCreatedAt.slice(0, 10)}). Ledger ${version.ledgerId}.${commission}`;
}
