/**
 * CO-WP-REFINEMENT-006 — Partner Legal Docket desk projection.
 */

import {
  PARTNER_LEGAL_PRIMARY_AGREEMENT_KIND,
  PARTNER_LEGAL_SIGNING_CAPABILITY,
  PARTNER_LEGAL_TIMELINE_EVENT_LABELS,
  partnerLegalAgreementStatusLabel,
  partnerLegalComplianceStatusLabel,
  partnerLegalDocumentStatusLabel,
} from "@/constants/enterprise-partner-legal-docket";
import type { EnterpriseWealthPartnerRecord } from "@/types/enterprise-wealth-partner-registry";
import type {
  PartnerLegalDocketDeskDto,
  PartnerLegalDocumentDto,
} from "@/types/enterprise-partner-legal-docket";
import type {
  WealthPartnerLegalComplianceProjection,
  WealthPartnerLegalDocketState,
} from "@/types/enterprise-wealth-partner-legal-docket";

function mapDocument(doc: WealthPartnerLegalComplianceProjection["documents"][number]): PartnerLegalDocumentDto {
  return {
    id: doc.id,
    documentKind: doc.documentKind,
    documentName: doc.documentName,
    version: doc.version,
    status: doc.status,
    statusLabel: partnerLegalDocumentStatusLabel(doc.status),
    generatedAt: doc.generatedAt,
    signedAt: doc.signedAt,
    effectiveFrom: doc.effectiveFrom,
    effectiveUntil: doc.effectiveUntil,
    isPrimaryAgreement: doc.documentKind === PARTNER_LEGAL_PRIMARY_AGREEMENT_KIND,
    contentHtml: doc.contentHtml || null,
    documentRegistryRecordId: doc.documentRegistryRecordId,
  };
}

export function composePartnerLegalDocketDesk(input: {
  partner: Pick<EnterpriseWealthPartnerRecord, "id" | "code" | "displayName">;
  legalCompliance: WealthPartnerLegalComplianceProjection;
  agreementState: WealthPartnerLegalDocketState["agreement"];
}): PartnerLegalDocketDeskDto {
  const documents = input.legalCompliance.documents.map(mapDocument);
  const primary = documents.find((d) => d.isPrimaryAgreement) ?? null;

  return {
    version: "1.0",
    dtoSource: "enterprise_partner_legal_docket",
    dtoNotice:
      "Legal Docket projected from Catalyst One CO-WP-007. Agreement status reflects enterprise lifecycle — not partner-local state.",
    partnerId: input.partner.id,
    partnerCode: input.partner.code ?? null,
    partnerDisplayName: input.partner.displayName,
    agreement: {
      agreementStatus: input.legalCompliance.agreementStatus,
      agreementStatusLabel: partnerLegalAgreementStatusLabel(
        input.legalCompliance.agreementStatus,
      ),
      complianceStatus: input.legalCompliance.complianceStatus,
      complianceStatusLabel: partnerLegalComplianceStatusLabel(
        input.legalCompliance.complianceStatus,
      ),
      agreementVersion: input.legalCompliance.agreementVersion,
      effectiveFrom: input.legalCompliance.effectiveFrom,
      effectiveUntil: input.legalCompliance.effectiveUntil,
      daysRemaining: input.legalCompliance.daysRemaining,
      generatedAt: input.agreementState.generatedAt,
      sentAt: input.agreementState.sentAt,
      partnerSignedAt: input.agreementState.partnerSignedAt,
      companyCountersignedAt: input.agreementState.companyCountersignedAt,
      activatedAt: input.agreementState.activatedAt,
      docketReady: input.legalCompliance.docketReady,
    },
    primaryAgreementDocumentId: primary?.id ?? null,
    documents,
    timeline: input.legalCompliance.timeline.map((item) => ({
      id: item.id,
      event: item.event,
      eventLabel: PARTNER_LEGAL_TIMELINE_EVENT_LABELS[item.event] ?? item.event,
      at: item.at,
      detail: item.detail,
    })),
    signing: PARTNER_LEGAL_SIGNING_CAPABILITY,
  };
}
