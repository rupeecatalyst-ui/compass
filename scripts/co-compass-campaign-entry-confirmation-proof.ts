/**
 * Campaign entry URL and application-confirmation summary.
 * No database, no SMTP, and no live email.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { issueCampaignRecipientToken, verifyCampaignRecipientToken } from "../src/lib/product-journey/campaign-link";
import {
  compassCampaignEntryPath,
  compassCampaignEntryUrl,
  productFromCompassUrl,
  resolveCompassCampaignProduct,
  withCampaignEntryCtas,
} from "../src/lib/product-journey/campaign-entry-url";
import {
  applicationConfirmationBody,
  COMPASS_ADVANTAGE_ELIGIBILITY_NOTE,
  confirmationAttempt,
  confirmationSourceEventId,
  customerAssessmentLines,
} from "../src/lib/compass-customer-gateway/application-confirmation";
import { resolveCompassLenderSelection } from "../src/lib/compass-customer-gateway/borrower-lender-selection";

assert.equal(resolveCompassCampaignProduct("home-loan"), "home-loan");
assert.equal(resolveCompassCampaignProduct("Home Loan"), "home-loan");
assert.equal(resolveCompassCampaignProduct("home loan balance transfer"), "home-loan-balance-transfer");
assert.equal(resolveCompassCampaignProduct("personal_loan"), "personal-loan");
assert.equal(resolveCompassCampaignProduct("not-a-product"), null);

assert.equal(compassCampaignEntryPath("home-loan"), "/apply/home-loan");
assert.equal(
  compassCampaignEntryPath("home-loan-balance-transfer", "tok"),
  "/apply/home-loan-balance-transfer?campaign=tok",
);
assert.equal(productFromCompassUrl("https://www.rupeecatalyst.com/home-loan"), "home-loan");
assert.equal(productFromCompassUrl("https://www.rupeecatalyst.com/home-loan?product=home-loan-balance-transfer"), "home-loan-balance-transfer");
assert.equal(productFromCompassUrl("https://www.rupeecatalyst.com/apply/personal-loan"), "personal-loan");

const secret = "proof-secret";
const token = issueCampaignRecipientToken(
  {
    campaignId: "camp-1",
    recipientRef: "contact-1",
    productCode: "home-loan",
    sourceCode: "marketing_email",
    campaignLabel: "Salaried Home Loan",
  },
  secret,
);
assert.equal(token.includes("@"), false);
const claims = verifyCampaignRecipientToken(token, secret);
assert.equal(claims.productCode, "home-loan");
const entry = compassCampaignEntryUrl({
  productCode: "home-loan",
  campaignToken: token,
  origin: "https://www.rupeecatalyst.com",
});
assert.match(entry, /^https:\/\/www\.rupeecatalyst\.com\/apply\/home-loan\?campaign=/);
assert.equal(productFromCompassUrl(entry), "home-loan");

const rewritten = withCampaignEntryCtas(
  {
    version: 1,
    blocks: [
      { id: "cta", type: "cta", props: { label: "Discover My Advantage", url: "https://www.rupeecatalyst.com/home-loan" } },
      { id: "web", type: "social", props: { website: "https://www.rupeecatalyst.com" } },
    ],
  },
  entry,
);
assert.equal(rewritten.blocks[0]?.props.url, entry);
assert.equal(rewritten.blocks[1]?.props.website, "https://www.rupeecatalyst.com");

const selection = resolveCompassLenderSelection({
  previous: null,
  submitted: {
    selectedLenderRef: "lender-1",
    selectedLenderName: "Central Bank of India",
    selectedProgrammeRef: "prog-1",
  },
  eligible: [
    {
      lenderRef: "lender-1",
      displayName: "Central Bank of India",
      programmeId: "prog-1",
      programmeVersion: 2,
      interestRateLabel: "8.50%",
      estimatedEmiLabel: "₹42,000",
      tenureLabel: "20 years",
      processingTimeLabel: "7 days",
      tentativeOfferLabel: "₹50,00,000",
    },
  ],
});
assert.equal(selection?.interestRateLabel, "8.50%");
assert.equal(selection?.tentativeOfferLabel, "₹50,00,000");

const assessment = customerAssessmentLines({
  incomeType: "salaried",
  city: "Pune",
  approxCibilScore: "750",
  monthlyIncome: 100000,
  personalEmail: "person@example.com",
  pan: "ABCDE1234F",
});
assert.deepEqual(assessment, { Employment: "salaried", City: "Pune" });

const body = applicationConfirmationBody({
  customerName: "Asha Rao",
  reference: "OPP-1",
  productLabel: "New Home Loan",
  requestedAmount: "₹50,00,000",
  submittedAt: "2026-10-23T00:00:00.000Z",
  assessment,
  lenderName: "Central Bank of India",
  commercials: {
    eligibleOffer: "₹50,00,000",
    interestRate: "8.50%",
    emi: "₹42,000",
    tenure: "20 years",
    processingTime: "7 days",
  },
  advantageAmount: "₹75,000",
  documents: [{ label: "PAN", status: "missing" }],
  documentCompletionPercent: 0,
  nextSteps: "Our team will review your details and contact you with next steps.",
});
assert.match(body, /Asha Rao/);
assert.match(body, /OPP-1/);
assert.match(body, /₹75,000/);
assert.match(body, new RegExp(COMPASS_ADVANTAGE_ELIGIBILITY_NOTE.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
assert.match(body, /PAN: missing/);
assert.equal(body.includes("750"), false);
assert.equal(body.includes("ABCDE1234F"), false);
assert.equal(body.includes("person@example.com"), false);
assert.equal(body.includes("100000"), false);

const withoutAdvantage = applicationConfirmationBody({
  customerName: "Asha Rao",
  reference: "OPP-1",
  productLabel: "New Home Loan",
  requestedAmount: "₹50,00,000",
  submittedAt: "2026-10-23T00:00:00.000Z",
  assessment: {},
  lenderName: null,
  commercials: { eligibleOffer: null, interestRate: null, emi: null, tenure: null, processingTime: null },
  advantageAmount: null,
  documents: [],
  documentCompletionPercent: null,
  nextSteps: "Next steps.",
});
assert.equal(withoutAdvantage.includes(COMPASS_ADVANTAGE_ELIGIBILITY_NOTE), false);

const at = "2026-10-23T00:00:00.000Z";
assert.equal(confirmationAttempt(null, at), "send");
assert.equal(confirmationAttempt({ submissionAt: at, status: "queued" }, at), "skip");
assert.equal(confirmationAttempt({ submissionAt: at, status: "sent" }, at), "skip");
assert.equal(confirmationAttempt({ submissionAt: at, status: "pending" }, at), "skip");
assert.equal(confirmationAttempt({ submissionAt: at, status: "failed" }, at), "skip");
assert.equal(confirmationSourceEventId("opp", at), confirmationSourceEventId("opp", at));

const journey = readFileSync("server/services/compass-customer-gateway/compass-journey.service.ts", "utf8");
assert.match(journey, /queueCompassApplicationConfirmation/);
assert.match(journey, /CAMPAIGN_TOKEN_INVALID/);
assert.equal(journey.includes("return { valid: false"), false);

const dispatch = readFileSync(
  "server/services/enterprise-communication-center/operational-email-dispatch.service.ts",
  "utf8",
);
assert.match(dispatch, /initiation === "system"/);
const confirmation = readFileSync(
  "server/services/compass-customer-gateway/compass-application-confirmation.service.ts",
  "utf8",
);
assert.match(confirmation, /eventType: "customer_notification"/);
assert.match(confirmation, /primaryToRole: "customer"/);
assert.match(confirmation, /initiation: "system"/);
assert.equal(confirmation.includes("fileName"), false);

const delivery = readFileSync("server/services/enterprise-marketing-engine/email-delivery.service.ts", "utf8");
assert.match(delivery, /withCampaignEntryCtas/);
assert.match(delivery, /issueCampaignRecipientToken/);

console.log("co-compass-campaign-entry-confirmation-proof: pass");
