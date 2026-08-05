/**
 * CO-WP-007 — Enterprise Wealth Partner Legal & Compliance Docket (SSOT lib).
 */

export {
  WEALTH_PARTNER_LEGAL_MODULE_ID,
  WEALTH_PARTNER_LEGAL_ORG_POLICY,
  WEALTH_PARTNER_LEGAL_DOCKET_DOCUMENTS,
  formatAgreementVersion,
  wealthPartnerLegalDocumentMeta,
} from "@/constants/enterprise-wealth-partner-legal-docket";

export {
  applyWealthPartnerLegalMerge,
  wrapLegalDocumentHtml,
} from "./merge";
export { getWealthPartnerLegalTemplate } from "./templates";
export {
  buildWealthPartnerLegalMergeContext,
  computeAgreementWindow,
} from "./merge-context";
export {
  emptyAgreementState,
  emptyLegalDocketState,
  getLegalDocketFromCompliance,
  mergeComplianceJson,
  parseComplianceJson,
} from "./state";
export {
  generateWealthPartnerLegalDocket,
  buildRenewalReminders,
  stampDigitalAcceptanceCertificate,
} from "./generate";
export {
  composeWealthPartnerLegalCompliance,
  applyWealthPartnerLegalLifecycle,
  advanceWealthPartnerLegalClock,
  deriveAgreementRuntimeStatus,
  resolveWealthPartnerOpportunitySelectability,
} from "./compose";
