/**
 * Stage 1 focused proofs. No database, no production calls, no deployment.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hashOtp, verifyHashedOtp } from "../src/lib/compass-otp/adapter";
import { selectReusableDraft } from "../src/lib/compass-customer-gateway/draft-reuse";
import { customerChecklistStatus } from "../src/lib/compass-customer-gateway/customer-lod-status";
import {
  classifyPublicField,
  isPublicFieldVisible,
  nextUnansweredField,
  omitSensitiveResumeAnswers,
  orderedPublicFields,
  publicJourneyStages,
  quarantineInapplicableAnswers,
  recommendationReadiness,
  sanitizePublicPayload,
  stableDocumentIdempotencyKey,
  stageIndex,
  type PublicQuestionField,
} from "../src/lib/compass-customer-gateway/public-question-plan";
import {
  hasOtpVerificationProof,
  issueOtpVerificationProof,
  verifyCompassCustomerOtp,
  requestCompassCustomerOtp,
} from "../server/services/compass-customer-gateway/compass-otp.service";
import {
  compassContactRef,
  sessionOwnsContact,
} from "../server/services/compass-customer-gateway/compass-session.service";
import { getCompassProductDefinition } from "../src/constants/compass-customer-gateway/product-registry";
import { compassAdvantageToCommitmentAmount } from "../src/lib/advantage-committed/compass-propagation";
import { projectAdvantageCommitted } from "../src/lib/advantage-committed/projection";
import { isAdvantageCommittedApplicableProduct } from "../src/lib/advantage-committed/applicability";
import { committedAmountsEqual } from "../src/lib/advantage-committed/money";

const fields: PublicQuestionField[] = [
  { fieldId: "mobile", label: "Mobile", sequence: 10, required: true },
  { fieldId: "displayName", label: "Name", sequence: 20, required: true },
  {
    fieldId: "employmentTypeCode",
    label: "Employment",
    sequence: 30,
    required: true,
    purpose: "recommendation",
  },
  {
    fieldId: "employerName",
    label: "Employer",
    sequence: 40,
    required: true,
    purpose: "recommendation",
    visibleWhenField: "employmentTypeCode",
    visibleWhenValues: ["salaried"],
  },
  { fieldId: "city", label: "City", sequence: 50, required: true, purpose: "recommendation" },
  {
    fieldId: "stage1PublicProbe",
    label: "Probe",
    sequence: 60,
    required: true,
    journeyRole: "application",
  },
];

const classified = fields.map((field) => ({
  ...field,
  purpose: field.purpose ?? classifyPublicField(field),
}));

const recommendation = orderedPublicFields(classified, "recommendation").map((field) => field.fieldId);
assert.deepEqual(recommendation, ["employmentTypeCode", "employerName", "city"]);

const application = orderedPublicFields(classified, "application").map((field) => field.fieldId);
assert.deepEqual(application, ["stage1PublicProbe"]);
assert.equal(classifyPublicField({ fieldId: "stage1PublicProbe", journeyRole: "application" }), "application");

assert.equal(
  isPublicFieldVisible(classified[3], { employmentTypeCode: "salaried" }),
  true,
);
assert.equal(
  isPublicFieldVisible(classified[3], { employmentTypeCode: "self-employed-business" }),
  false,
);

const kept = quarantineInapplicableAnswers(classified, {
  employmentTypeCode: "self-employed-business",
  employerName: "Hidden Co",
  city: "Pune",
});
assert.deepEqual(kept.removedKeys, ["employerName"]);
assert.equal(kept.answers.city, "Pune");
assert.equal(kept.answers.employerName, undefined);

const asked = nextUnansweredField(
  classified,
  { employmentTypeCode: "salaried", employerName: "RC", city: "Pune" },
  "recommendation",
);
assert.equal(asked, null);

const missing = recommendationReadiness(classified, { city: "Pune" });
assert.equal(missing.ready, false);
assert.ok(missing.missingPublicFieldKeys.includes("employmentTypeCode"));
assert.ok(!missing.missingPublicFieldKeys.includes("employerName"));

const hlStages = publicJourneyStages({ advantageEnabled: true });
assert.ok(stageIndex(hlStages, "mobile") < stageIndex(hlStages, "recommendation"));
assert.equal(hlStages.includes("otp"), false);
assert.ok(stageIndex(hlStages, "displayName") > stageIndex(hlStages, "mobile"));
const otpOnStages = publicJourneyStages({ advantageEnabled: true, otpVerification: "on" });
assert.ok(stageIndex(otpOnStages, "displayName") > stageIndex(otpOnStages, "otp"));
assert.ok(stageIndex(hlStages, "email") > stageIndex(hlStages, "advantage"));
assert.ok(stageIndex(hlStages, "review") < stageIndex(hlStages, "documents"));
const otherStages = publicJourneyStages({ advantageEnabled: false });
assert.equal(otherStages.includes("advantage"), false);

const salt = "stage1";
const real = hashOtp("482193", salt);
assert.equal(verifyHashedOtp({ otp: "0000", salt, hash: real }), false);
assert.equal(verifyHashedOtp({ otp: "123456", salt, hash: real }), false);
assert.equal(verifyCompassCustomerOtp({ mobile: "9999999999", otp: "0000" }).verified, false);
assert.equal(verifyCompassCustomerOtp({ mobile: "9999999999", otp: "482193" }).verified, false);
assert.throws(() => requestCompassCustomerOtp("9999999999"));
assert.equal(hasOtpVerificationProof("9999999999", "0000"), false);
const proof = issueOtpVerificationProof("9999999999");
assert.equal(hasOtpVerificationProof("9999999999", proof), true);
assert.equal(hasOtpVerificationProof("8888888888", proof), false);

const hl = getCompassProductDefinition("home-loan");
const bt = getCompassProductDefinition("home-loan-balance-transfer");
const personal = getCompassProductDefinition("personal-loan");
assert.notEqual(hl.enterpriseProductCode, bt.enterpriseProductCode);
assert.equal(hl.transactionType, "fresh");
assert.equal(bt.transactionType, "balance_transfer");
assert.equal(isAdvantageCommittedApplicableProduct(hl.enterpriseProductCode), true);
assert.equal(isAdvantageCommittedApplicableProduct(bt.enterpriseProductCode), true);
assert.equal(isAdvantageCommittedApplicableProduct(personal.enterpriseProductCode), false);

const committed = compassAdvantageToCommitmentAmount({
  eligible: true,
  status: "ready",
  totalAdvantageAmount: "15000",
});
assert.equal(committed, "15000");
const column = projectAdvantageCommitted({
  productCode: hl.enterpriseProductCode,
  advantageCommittedAmount: committed,
  advantageCommittedProductCode: hl.enterpriseProductCode,
});
assert.equal(column.amount, "15000");
assert.equal(column.display, "₹15,000");
assert.equal(committedAmountsEqual("15000", "15000.00"), true);
assert.equal(
  compassAdvantageToCommitmentAmount({ eligible: true, status: "ready", totalAdvantageAmount: "15000" }) ===
    column.amount,
  true,
);

const key = stableDocumentIdempotencyKey({
  opportunityId: "opp-1",
  typeRef: "doc:other:unclassified",
  contentSha256: "abc",
});
assert.equal(
  key,
  stableDocumentIdempotencyKey({
    opportunityId: "opp-1",
    typeRef: "doc:other:unclassified",
    contentSha256: "abc",
  }),
);
assert.notEqual(
  key,
  stableDocumentIdempotencyKey({
    opportunityId: "opp-1",
    typeRef: "doc:other:unclassified",
    contentSha256: "def",
  }),
);

const contactA = "contact-a";
const contactB = "contact-b";
assert.notEqual(compassContactRef(contactA), compassContactRef(contactB));
assert.equal(sessionOwnsContact(compassContactRef(contactA), contactB), false);
assert.equal(sessionOwnsContact(compassContactRef(contactA), contactA), true);

const sanitized = sanitizePublicPayload({
  lenderRef: "lender:secret",
  contactId: "cm123",
  opportunityRef: "OPP-1",
  cards: [{ programmeId: "prog", displayName: "Bank" }],
});
assert.equal("lenderRef" in sanitized, false);
assert.equal("contactId" in sanitized, false);
assert.equal(sanitized.opportunityRef, "OPP-1");
assert.equal("programmeId" in sanitized.cards[0], false);

const journey = readFileSync("server/services/compass-customer-gateway/compass-journey.service.ts", "utf8");
assert.equal(journey.includes("projectCompassRecommendations"), false);
assert.equal(journey.includes("enterpriseDeal"), false);
assert.equal(journey.includes("loanFile"), false);
assert.equal(journey.includes("enterpriseTransactionDocumentService"), true);
assert.equal(journey.includes("hasOtpVerificationProof"), true);
assert.equal(journey.includes("persistCompassAdvantageCommitment"), true);
assert.equal(journey.includes("stableDocumentIdempotencyKey"), true);

const config = readFileSync(
  "server/services/compass-customer-gateway/compass-journey-config.service.ts",
  "utf8",
);
assert.equal(config.includes("classifyPublicField"), true);
assert.equal(config.includes("productCode === \"home-loan\""), false);
assert.equal(
  readFileSync("src/lib/product-journey/publication.ts", "utf8").includes("publishProductJourney"),
  true,
);
const lending = readFileSync("compass/src/config/compass-lending-products.ts", "utf8");
assert.equal(lending.includes("stage1PublicProbe"), false);

assert.equal(journey.includes("selectReusableDraft"), true);

const hlDraft = { id: "hl-draft", productCode: "HOME_LOAN", lifecycleStatus: "draft", isDeleted: false, archived: false };
const btDraft = { id: "bt-draft", productCode: "HOME_LOAN_BT", lifecycleStatus: "draft", isDeleted: false, archived: false };
const submitted = { id: "hl-live", productCode: "HOME_LOAN", lifecycleStatus: "active", isDeleted: false, archived: false };
assert.equal(selectReusableDraft([submitted, btDraft, hlDraft], "HOME_LOAN", "home-loan")?.id, "hl-draft");
assert.equal(selectReusableDraft([btDraft], "HOME_LOAN", "home-loan"), null);
assert.equal(selectReusableDraft([submitted], "HOME_LOAN", "home-loan"), null);

assert.equal(customerChecklistStatus("missing"), "missing");
assert.equal(customerChecklistStatus("pending_verification"), "pending_verification");
assert.equal(customerChecklistStatus("uploaded"), "verified");
assert.equal(customerChecklistStatus("rejected"), "rejected");

const resumed = omitSensitiveResumeAnswers({ mobile: "9999999999", city: "Pune", employmentTypeCode: "salaried" });
assert.equal("mobile" in resumed, false);
assert.equal(resumed.city, "Pune");

console.log("STAGE1_QUESTION_JOURNEY_VERIFY pass");
