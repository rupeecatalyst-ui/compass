/**
 * ADR-018 Wave 2 — Lead Information validation (client).
 * CO-OPP-003 — Business Source dynamic rules + Participation Role for Wealth Partner.
 */

import type { LeadInformationFormState } from "@/constants/lead-information-workspace";
import {
  isOpportunityParticipationRoleCode,
  resolveBusinessSourceContactLookup,
} from "@/constants/opportunity-business-source";

export type LeadInformationValidation = {
  valid: boolean;
  requirementReady: boolean;
  errors: Partial<Record<keyof LeadInformationFormState, string>>;
};

export function parseRequestedAmountInput(raw: string): number | null {
  const trimmed = raw.trim().replace(/,/g, "");
  if (!trimmed) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n) || Number.isNaN(n) || n < 0) return null;
  return n;
}

export function validateLeadInformationForm(
  form: LeadInformationFormState,
  options?: { requireMandatory?: boolean },
): LeadInformationValidation {
  const errors: LeadInformationValidation["errors"] = {};
  const requireMandatory = options?.requireMandatory ?? false;
  const contactLookup = resolveBusinessSourceContactLookup(form.businessSource);

  const productOk = Boolean(form.productCode.trim() || form.productLabel.trim());
  const amount = parseRequestedAmountInput(form.requestedAmount);
  const amountOk = amount != null && amount > 0;
  const isBalanceTransfer = form.transactionType === "balance_transfer";
  const transactionOk =
    form.transactionType === "fresh" || form.transactionType === "balance_transfer";

  if (requireMandatory) {
    if (!productOk) errors.productCode = "Product is required.";
    if (!amountOk) {
      errors.requestedAmount =
        amount == null && form.requestedAmount.trim()
          ? "Enter a valid required amount."
          : "Required Amount is required.";
    }
    if (form.lendingType !== "secured" && form.lendingType !== "unsecured") {
      errors.lendingType = "Lending Type is required.";
    }
    if (!transactionOk) {
      errors.transactionType = "Transaction Type is required.";
    }
    if (!form.businessSource.trim()) {
      errors.businessSource = "Business Source is required.";
    }
    if (
      contactLookup.contactMandatory &&
      !contactLookup.hideField &&
      contactLookup.registry === "wealth_partner" &&
      !form.sourceWealthPartnerId.trim()
    ) {
      errors.sourceWealthPartnerId = "Wealth Partner is required (Source Name).";
    } else if (
      contactLookup.contactMandatory &&
      !contactLookup.hideField &&
      contactLookup.registry !== "wealth_partner" &&
      !form.sourceContactId.trim()
    ) {
      errors.sourceContactId = `${contactLookup.fieldLabel} is required (${contactLookup.registryLabel}).`;
    }
    if (contactLookup.showReferrerName && !form.sourceContactName.trim()) {
      errors.sourceContactName = "Referrer Name is required for No Cost Referral.";
    }
    if (
      contactLookup.participationRoleMandatory &&
      !isOpportunityParticipationRoleCode(form.participationRole)
    ) {
      errors.participationRole =
        "Participation Role is required when Business Source is Wealth Partner.";
    }
    if (isBalanceTransfer) {
      if (!form.btInstitutionId.trim()) {
        errors.btInstitutionId = "Existing Lender is required for Balance Transfer.";
      }
      const btAmount = parseRequestedAmountInput(form.btAmount);
      if (btAmount == null || btAmount <= 0) {
        errors.btAmount =
          form.btAmount.trim() && btAmount == null
            ? "Enter a valid outstanding amount."
            : "Outstanding Loan Amount is required for Balance Transfer.";
      }
    }
  } else {
    if (form.requestedAmount.trim() && amount == null) {
      errors.requestedAmount = "Enter a valid required amount.";
    }
    if (isBalanceTransfer && form.btAmount.trim()) {
      const btAmount = parseRequestedAmountInput(form.btAmount);
      if (btAmount == null) {
        errors.btAmount = "Enter a valid outstanding amount.";
      }
    }
  }

  const lendingOk =
    form.lendingType === "secured" || form.lendingType === "unsecured";
  const sourceOk = Boolean(form.businessSource.trim());
  const sourceIdentityOk =
    !contactLookup.contactMandatory ||
    contactLookup.hideField ||
    (contactLookup.registry === "wealth_partner"
      ? Boolean(form.sourceWealthPartnerId.trim())
      : Boolean(form.sourceContactId.trim()));
  const referrerOk =
    !contactLookup.showReferrerName || Boolean(form.sourceContactName.trim());
  const participationOk =
    !contactLookup.participationRoleMandatory ||
    isOpportunityParticipationRoleCode(form.participationRole);
  const requirementReady =
    productOk &&
    amountOk &&
    amount != null &&
    amount > 0 &&
    lendingOk &&
    transactionOk &&
    sourceOk &&
    sourceIdentityOk &&
    referrerOk &&
    participationOk;

  return {
    valid: Object.keys(errors).length === 0,
    requirementReady,
    errors,
  };
}
