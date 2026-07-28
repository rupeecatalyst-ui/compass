/**
 * Shared Lead Information / Opportunity Loan Details form helpers.
 * Single implementation for Lead Information Workspace and Planning Modify sheet.
 */

import {
  LEAD_INFORMATION_PRODUCT_OPTIONS,
  parseLeadInformationLendingExtension,
  resolveDefaultLendingTypeForProduct,
  type LeadInformationFormState,
  type LeadInformationLendingExtension,
} from "@/constants/lead-information-workspace";
import {
  isNoCostReferralSource,
  isWealthPartnerBusinessSource,
  resolveBusinessSourceContactLookup,
} from "@/constants/opportunity-business-source";
import {
  isApproxCibilScoreBand,
} from "@/constants/cibil-score-master";
import { findCityEntry } from "@/constants/city-master";
import { parseRequestedAmountInput } from "@/lib/lead-information/validate-lead-information";
import type {
  EnterpriseOpportunityApiRecord,
  OpportunityUpdateBody,
} from "@/lib/enterprise-opportunity/opportunity-api-client";

export function formFromOpportunity(
  opp: EnterpriseOpportunityApiRecord,
): LeadInformationFormState {
  const ext = parseLeadInformationLendingExtension(opp.lendingExtension);
  const cityLabel = opp.cityLabel?.trim() || "";
  let stateLabel = opp.stateLabel?.trim() || "";
  if (cityLabel && !stateLabel) {
    const hit = findCityEntry(cityLabel);
    if (hit) stateLabel = hit.state;
  }
  return {
    productCode: opp.productCode?.trim() || "",
    productLabel: opp.productLabel?.trim() || "",
    requestedAmount:
      opp.requestedAmount != null && !Number.isNaN(opp.requestedAmount)
        ? String(opp.requestedAmount)
        : "",
    transactionType: opp.transactionType?.trim() || "",
    lendingType: (() => {
      const saved = ext.lendingType?.trim() || "";
      if (saved === "secured" || saved === "unsecured") return saved;
      return (
        resolveDefaultLendingTypeForProduct(opp.productCode, opp.productLabel) ||
        ""
      );
    })(),
    businessSource: opp.sourceCode?.trim() || "",
    sourceContactId: opp.sourceContactId?.trim() || "",
    sourceContactName: opp.sourceContactName?.trim() || "",
    sourceWealthPartnerId: opp.sourceWealthPartnerId?.trim() || "",
    participationRole: opp.participationRole?.trim() || "",
    sourceCampaignLabel: opp.sourceCampaignLabel?.trim() || "",
    employmentTypeCode: opp.employmentTypeCode?.trim() || "",
    approxCibilScore:
      ext.approxCibilScore && isApproxCibilScoreBand(ext.approxCibilScore)
        ? ext.approxCibilScore
        : "",
    cityLabel,
    stateLabel,
    remarks: ext.remarks?.trim() || "",
    btInstitutionId: ext.btInstitutionId?.trim() || "",
    btInstitutionName: ext.btInstitutionName?.trim() || "",
    btAmount:
      ext.btAmount != null && Number.isFinite(ext.btAmount) ? String(ext.btAmount) : "",
  };
}

export function buildLeadInformationPatchBody(
  form: LeadInformationFormState,
  rowVersion?: number | null,
  existingExtension?: LeadInformationLendingExtension,
  primaryBorrower?: {
    contactId?: string | null;
    contactName?: string | null;
  },
): OpportunityUpdateBody {
  const product = LEAD_INFORMATION_PRODUCT_OPTIONS.find(
    (p) => p.code === form.productCode || p.label === form.productLabel,
  );
  const amount = parseRequestedAmountInput(form.requestedAmount);
  const isBalanceTransfer = form.transactionType === "balance_transfer";
  const btAmount = isBalanceTransfer
    ? parseRequestedAmountInput(form.btAmount)
    : null;

  const historicalPurpose = existingExtension?.purpose?.trim() || null;
  const approxCibilScore =
    form.approxCibilScore && isApproxCibilScoreBand(form.approxCibilScore)
      ? form.approxCibilScore
      : null;
  const lendingType =
    form.lendingType === "secured" || form.lendingType === "unsecured"
      ? form.lendingType
      : null;

  const contactLookup = resolveBusinessSourceContactLookup(form.businessSource);
  let sourceContactId = form.sourceContactId.trim() || null;
  let sourceContactName = form.sourceContactName.trim() || null;
  let sourceWealthPartnerId = form.sourceWealthPartnerId.trim() || null;
  let participationRole = form.participationRole.trim() || null;
  let sourceCampaignLabel = form.sourceCampaignLabel.trim() || null;

  if (contactLookup.registry === "auto_customer") {
    sourceContactId = primaryBorrower?.contactId?.trim() || sourceContactId;
    sourceContactName = primaryBorrower?.contactName?.trim() || sourceContactName;
    sourceWealthPartnerId = null;
    participationRole = null;
    sourceCampaignLabel = null;
  } else if (contactLookup.registry === "none") {
    sourceContactId = null;
    sourceContactName = null;
    sourceWealthPartnerId = null;
    participationRole = null;
    sourceCampaignLabel = null;
  } else if (contactLookup.showReferrerName || isNoCostReferralSource(form.businessSource)) {
    sourceContactId = null;
    sourceWealthPartnerId = null;
    participationRole = null;
    sourceCampaignLabel = null;
    sourceContactName = form.sourceContactName.trim() || null;
  } else if (contactLookup.showCampaign) {
    sourceContactId = null;
    sourceContactName = null;
    sourceWealthPartnerId = null;
    participationRole = null;
  } else if (!isWealthPartnerBusinessSource(form.businessSource)) {
    sourceWealthPartnerId = null;
    participationRole = null;
    if (!contactLookup.showCampaign) sourceCampaignLabel = null;
  } else {
    sourceCampaignLabel = null;
  }

  return {
    productId: null,
    productCode: form.productCode.trim() || null,
    productLabel: form.productLabel.trim() || product?.label || null,
    productFamily: "lending",
    requestedAmount: amount,
    transactionType: form.transactionType.trim() || null,
    employmentTypeCode: form.employmentTypeCode.trim() || null,
    cityLabel: form.cityLabel.trim() || null,
    stateLabel: form.stateLabel.trim() || null,
    sourceCode: form.businessSource.trim() || null,
    sourceContactId,
    sourceContactName,
    sourceWealthPartnerId,
    participationRole,
    sourceCampaignLabel,
    lendingExtension: {
      ...(historicalPurpose ? { purpose: historicalPurpose } : {}),
      remarks: form.remarks.trim() || null,
      approxCibilScore,
      lendingType,
      btInstitutionId: isBalanceTransfer
        ? form.btInstitutionId.trim() || null
        : null,
      btInstitutionName: isBalanceTransfer
        ? form.btInstitutionName.trim() || null
        : null,
      btAmount: isBalanceTransfer ? btAmount : null,
    },
    rowVersion: rowVersion ?? undefined,
  };
}
