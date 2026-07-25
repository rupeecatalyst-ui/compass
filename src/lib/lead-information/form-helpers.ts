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
