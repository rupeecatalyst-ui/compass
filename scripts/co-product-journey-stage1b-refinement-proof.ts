/**
 * Stage 1B refinement proof.
 * Synthetic campaign data only. Does not open a database or create contacts.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  decideCampaignIdentity,
  issueCampaignRecipientToken,
  knownCampaignEmailMaySkipEntry,
  verifyCampaignRecipientToken,
} from "../src/lib/product-journey/campaign-link";
import { governedPublicStages, normalizeOtpVerification } from "../src/lib/product-journey/publication";
import { publicJourneyStages } from "../src/lib/compass-customer-gateway/public-question-plan";
import { requestCompassCustomerOtp } from "../server/services/compass-customer-gateway/compass-otp.service";

const secret = "stage1b-refinement-proof-secret";

const offStages = governedPublicStages(
  [
    { stageId: "welcome", kind: "welcome" },
    { stageId: "mobile", kind: "mobile" },
    { stageId: "otp", kind: "otp" },
    { stageId: "displayName", kind: "name" },
  ],
  "required",
  "off",
);
assert.deepEqual(offStages.map((stage) => stage.stageId), ["welcome", "mobile", "displayName"]);
assert.equal(offStages.some((stage) => stage.kind === "otp"), false);
assert.equal(normalizeOtpVerification(undefined), "off");

const onStages = publicJourneyStages({ advantageEnabled: true, otpVerification: "on" });
assert.ok(onStages.includes("otp"));
assert.throws(() => requestCompassCustomerOtp("9999999999"));

const token = issueCampaignRecipientToken(
  {
    campaignId: "cmp_synthetic",
    recipientRef: "ctc_synthetic",
    productCode: "home-loan",
    sourceCode: "email_campaign",
    campaignLabel: "Synthetic Home Loan",
  },
  secret,
);
assert.equal(token.includes("@"), false);
assert.equal(token.includes("person@example.com"), false);
const claims = verifyCampaignRecipientToken(token, secret);
assert.equal(claims.campaignId, "cmp_synthetic");
assert.equal(claims.recipientRef, "ctc_synthetic");
assert.equal(claims.productCode, "home-loan");
assert.equal(claims.sourceCode, "email_campaign");
assert.equal(JSON.stringify(claims).includes("@"), false);

assert.throws(() => verifyCampaignRecipientToken(`${token}x`, secret));
assert.throws(() => verifyCampaignRecipientToken(token, "other-secret"));
const expired = issueCampaignRecipientToken(
  {
    campaignId: "cmp_synthetic",
    recipientRef: "ctc_synthetic",
    productCode: "home-loan",
    sourceCode: "email_campaign",
    campaignLabel: "Synthetic Home Loan",
    ttlSec: 1,
  },
  secret,
  10,
);
assert.throws(() => verifyCampaignRecipientToken(expired, secret, 20));

assert.equal(
  decideCampaignIdentity({ recipientMobile: "9999999999", enteredMobile: "9999999999" }),
  "matched",
);
assert.equal(
  decideCampaignIdentity({ recipientMobile: "9999999999", enteredMobile: "8888888888" }),
  "conflict",
);
assert.equal(
  decideCampaignIdentity({ recipientMobile: null, enteredMobile: "8888888888" }),
  "separate",
);
assert.deepEqual(
  knownCampaignEmailMaySkipEntry({
    decision: "matched",
    emailOnFile: "synthetic.person@example.com",
  }),
  { skip: true, independentlyVerified: false },
);
assert.equal(
  knownCampaignEmailMaySkipEntry({ decision: "conflict", emailOnFile: "synthetic.person@example.com" }).skip,
  false,
);
assert.equal(
  knownCampaignEmailMaySkipEntry({ decision: "separate", emailOnFile: "synthetic.person@example.com" }).skip,
  false,
);

const invest = readFileSync("compass/src/config/platform-architecture.ts", "utf8");
const investStart = invest.indexOf("export const investGoals");
const investEnd = invest.indexOf("export const ADVANTAGE_PRODUCTS");
const investBlock = invest.slice(investStart, investEnd);
assert.equal(investBlock.includes("home-loan"), false);
assert.ok(investBlock.includes("ROUTES.INVEST}?goal=mutual-funds"));
const pathname = readFileSync("compass/src/config/compass-lending-products.ts", "utf8");
assert.equal(pathname.includes('?? "home-loan"'), false);
assert.ok(pathname.includes("?? null"));

console.log("STAGE_1B_REFINEMENT_PROOF pass");
