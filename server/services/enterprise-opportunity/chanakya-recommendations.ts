import "server-only";

import { z } from "zod";
import { canonicalizeProductCode } from "@/lib/product-programme-operations/product-aliases";
import { getContextAwareVisibility } from "@/lib/context-aware-data-collection";
import { recommendLendersCanonical } from "@server/services/lender-recommendation/canonical-lender-recommendation.service";

// Declared assessment inputs, not programme rules or ranking inputs.
const amount = z.number().finite().nonnegative().nullable();
export const chanakyaAssessmentDraftSchema = z.object({
  monthlyIncomeRupees: amount,
  existingMonthlyEmiRupees: amount,
  propertyValueRupees: amount,
  propertyType: z.string().max(120).nullable(),
  constitution: z.string().max(120).nullable(),
}).strict();

type Opportunity = {
  organizationId: string;
  productCode: string | null;
  transactionType: string | null;
  requestedAmount: number | null;
  employmentTypeCode: string | null;
  cityLabel?: string | null;
  lendingExtension: unknown;
};

/** Product and tenant come exclusively from the authorized saved Opportunity. */
export async function recommendForChanakyaOpportunity(
  opportunity: Opportunity,
  draft: z.infer<typeof chanakyaAssessmentDraftSchema>,
  recommend = recommendLendersCanonical,
) {
  const product = canonicalizeProductCode(opportunity.productCode);
  if (product !== "HOME_LOAN" && product !== "HOME_LOAN_BT") {
    throw new Error("UNSUPPORTED_RECOMMENDATION_PRODUCT");
  }
  if (opportunity.transactionType === "bt_top_up") {
    throw new Error("UNSUPPORTED_RECOMMENDATION_TRANSACTION");
  }
  if (product === "HOME_LOAN_BT" && opportunity.transactionType !== "balance_transfer") {
    throw new Error("UNSUPPORTED_RECOMMENDATION_TRANSACTION");
  }
  if (product === "HOME_LOAN" && opportunity.transactionType === "balance_transfer") {
    throw new Error("UNSUPPORTED_RECOMMENDATION_TRANSACTION");
  }
  const ext = opportunity.lendingExtension && typeof opportunity.lendingExtension === "object"
    ? opportunity.lendingExtension as Record<string, unknown> : {};
  const family = getContextAwareVisibility(opportunity.employmentTypeCode ?? "").family;
  if (family !== "salaried" && family !== "self_employed") {
    throw new Error("ASSESSMENT_INPUT_REQUIRED");
  }
  // Unknown obligations must not silently become zero in the assessment engine.
  if (draft.existingMonthlyEmiRupees == null || draft.propertyValueRupees == null || draft.propertyValueRupees <= 0 ||
      opportunity.requestedAmount == null || opportunity.requestedAmount <= 0) {
    throw new Error("ASSESSMENT_INPUT_REQUIRED");
  }
  return recommend({
    organizationId: opportunity.organizationId,
    product,
    customer: {
      ...draft,
      journeyKind: product === "HOME_LOAN" ? "home_loan" : "home_loan_balance_transfer",
      requiredAmountRupees: opportunity.requestedAmount,
      propertyValueIsCustomerDeclared: true,
      employmentFamily: family,
      city: opportunity.cityLabel,
      cibilBand: typeof ext.approxCibilScore === "string" ? ext.approxCibilScore : null,
    },
  });
}
