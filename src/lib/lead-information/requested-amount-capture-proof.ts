/**
 * Lead Information requested amount has no product business maximum.
 * Product Programme / COMPASS ceilings stay on the shared catalog helper.
 * No database.
 */
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { emptyLeadInformationForm } from "@/constants/lead-information-workspace";
import {
  assertRequestedAmountWithinProductLimit,
  getApprovedMaxRequestedAmountRupees,
} from "@/constants/enterprise-product-master";
import {
  absoluteRupeesToStoredString,
  unitMagnitudeToAbsolute,
} from "@/lib/enterprise-financial-input";
import { formFromOpportunity } from "@/lib/lead-information/form-helpers";
import {
  parseRequestedAmountInput,
  validateLeadInformationForm,
} from "@/lib/lead-information/validate-lead-information";
import {
  assertProductRequestedAmountLimit,
  parseOptionalAmount,
} from "../../../server/services/enterprise-opportunity/opportunity-validation";
import type { EnterpriseOpportunityApiRecord } from "@/lib/enterprise-opportunity/opportunity-api-client";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const checks: Array<[string, boolean]> = [];
function check(name: string, passed: boolean) {
  checks.push([name, passed]);
  if (!passed) console.error(`FAIL ${name}`);
}

const CRORE = 1_00_00_000;
const TEN_CRORE = 10 * CRORE;
const FIFTY_CRORE = 50 * CRORE;
const HUNDRED_CRORE = 100 * CRORE;
const FIVE_HUNDRED_CRORE = 500 * CRORE;
const TECHNICAL_MAX = Number.MAX_SAFE_INTEGER;

function capture(productCode: string, amount: string) {
  return validateLeadInformationForm(
    {
      ...emptyLeadInformationForm(),
      productCode,
      productLabel: productCode,
      requestedAmount: amount,
      transactionType: "fresh",
      lendingType: "secured",
      businessSource: "direct",
    },
    { requireMandatory: true },
  );
}

function accepts(productCode: string, rupees: number) {
  const result = capture(productCode, String(rupees));
  return result.valid && result.requirementReady && !result.errors.requestedAmount;
}

for (const product of ["HOME_LOAN", "LAP", "CONSTRUCTION_FINANCE", "BUSINESS_LOAN_UNSECURED"]) {
  check(`${product}_one_rupee`, accepts(product, 1));
  check(`${product}_10_crore`, accepts(product, TEN_CRORE));
  check(`${product}_50_crore`, accepts(product, FIFTY_CRORE));
  check(`${product}_100_crore`, accepts(product, HUNDRED_CRORE));
  check(`${product}_500_crore`, accepts(product, FIVE_HUNDRED_CRORE));
  check(`${product}_technical_max`, accepts(product, TECHNICAL_MAX));
}

const zero = capture("HOME_LOAN", "0");
const negative = capture("HOME_LOAN", "-500");
const junk = capture("HOME_LOAN", "not-a-number");
const infinite = capture("HOME_LOAN", "Infinity");
check("zero_rejected", !zero.valid && Boolean(zero.errors.requestedAmount));
check("negative_rejected", !negative.valid && Boolean(negative.errors.requestedAmount));
check("non_numeric_rejected", !junk.valid && Boolean(junk.errors.requestedAmount));
check("infinite_rejected", parseRequestedAmountInput("Infinity") == null && !infinite.valid);
check("unsafe_rejected", parseRequestedAmountInput(String(TECHNICAL_MAX + 2)) == null);

check("crore_conversion", unitMagnitudeToAbsolute(500, "crore") === FIVE_HUNDRED_CRORE);
check("lakh_conversion", unitMagnitudeToAbsolute(50, "lakh") === 50 * 1_00_000);
check(
  "absolute_rupee_storage",
  absoluteRupeesToStoredString(HUNDRED_CRORE) === String(HUNDRED_CRORE),
);

const existing = {
  productCode: "HOME_LOAN",
  productLabel: "Home Loan",
  requestedAmount: FIVE_HUNDRED_CRORE,
  transactionType: "fresh",
  lendingExtension: { lendingType: "secured" },
} as EnterpriseOpportunityApiRecord;
const reopened = formFromOpportunity(existing);
check("edit_reopen_preserves_amount", reopened.requestedAmount === String(FIVE_HUNDRED_CRORE));
check("existing_record_unchanged", existing.requestedAmount === FIVE_HUNDRED_CRORE);
check("reopened_amount_still_valid", accepts("HOME_LOAN", Number(reopened.requestedAmount)));

check(
  "programme_home_loan_ceiling_unchanged",
  getApprovedMaxRequestedAmountRupees("HOME_LOAN") === TEN_CRORE,
);
check(
  "programme_lap_ceiling_unchanged",
  getApprovedMaxRequestedAmountRupees("LAP") === 25 * CRORE,
);
check(
  "programme_construction_ceiling_unchanged",
  getApprovedMaxRequestedAmountRupees("CONSTRUCTION_FINANCE") === HUNDRED_CRORE,
);
const programmeReject = assertRequestedAmountWithinProductLimit({
  enterpriseProductCode: "HOME_LOAN",
  amountRupees: TEN_CRORE + 1,
});
check(
  "programme_helper_still_rejects_above_catalog",
  !programmeReject.ok && programmeReject.code === "AMOUNT_EXCEEDS_PRODUCT_LIMIT",
);

check(
  "opportunity_capture_allows_500_crore",
  assertProductRequestedAmountLimit("HOME_LOAN", FIVE_HUNDRED_CRORE) === FIVE_HUNDRED_CRORE,
);
let technicalRejected = false;
try {
  assertProductRequestedAmountLimit("HOME_LOAN", TECHNICAL_MAX + 2);
} catch {
  technicalRejected = true;
}
check("opportunity_capture_rejects_unsafe_integer", technicalRejected);
let invalidNumber = false;
try {
  parseOptionalAmount("abc");
} catch {
  invalidNumber = true;
}
check("opportunity_api_rejects_non_numeric", invalidNumber);

const leadSource = readFileSync(
  path.join(repoRoot, "src/lib/lead-information/validate-lead-information.ts"),
  "utf8",
);
const opportunitySource = readFileSync(
  path.join(repoRoot, "server/services/enterprise-opportunity/opportunity-validation.ts"),
  "utf8",
);
const compassSource = readFileSync(
  path.join(repoRoot, "server/services/compass-customer-gateway/compass-journey.service.ts"),
  "utf8",
);
check("lead_capture_does_not_call_product_cap", !leadSource.includes("assertRequestedAmountWithinProductLimit"));
check("opportunity_capture_does_not_call_product_cap", !opportunitySource.includes("assertRequestedAmountWithinProductLimit"));
check("compass_still_enforces_catalog_cap", compassSource.includes("assertRequestedAmountWithinProductLimit"));

const failed = checks.filter(([, passed]) => !passed);
console.log(`LEAD_INFORMATION_REQUESTED_AMOUNT_CAPTURE_PROOF checks=${checks.length} failed=${failed.length}`);
if (failed.length > 0) process.exit(1);
