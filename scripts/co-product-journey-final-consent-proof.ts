/**
 * Final consent is recorded only when the applicant accepts the review declarations.
 * Disposable local Postgres only. Refuses any non-loopback database.
 * Does not call production and does not print secrets.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { prisma } from "../server/lib/prisma";
import { CompassJourneyError } from "../server/services/compass-customer-gateway/compass-journey-errors";
import { compassJourneyService } from "../server/services/compass-customer-gateway/compass-journey.service";
import { issueCampaignRecipientToken } from "../src/lib/product-journey/campaign-link";

const databaseUrl = process.env.DATABASE_URL ?? "";
const parsed = new URL(databaseUrl);
if (parsed.hostname !== "127.0.0.1" || parsed.port !== "54335" || parsed.pathname !== "/stage1b_campaign") {
  throw new Error("REFUSING_NON_LOCAL_DATABASE");
}
const secret = process.env.COMPASS_JOURNEY_SESSION_SECRET?.trim();
if (!secret) throw new Error("CAMPAIGN_SECRET_MISSING");

const WEBSITE_MOBILE = "9000000511";
const CAMPAIGN_MOBILE = "9000000512";
for (const mobile of [WEBSITE_MOBILE, CAMPAIGN_MOBILE]) {
  assert.notEqual(mobile, "9000410392");
  assert.notEqual(mobile, "9000615481");
}

function snapshotOf(row: { snapshot: unknown } | null) {
  return (row?.snapshot ?? {}) as Record<string, unknown>;
}

function assertNoFinalConsent(snapshot: Record<string, unknown>, label: string) {
  assert.equal(snapshot.compassConsentVersion ?? null, null, label);
  assert.equal(snapshot.compassConsentAt ?? null, null, label);
  assert.equal(snapshot.compassSubmissionConsent ?? null, null, label);
}

async function opportunity(mobile: string) {
  return prisma.enterpriseOpportunity.findFirst({
    where: { primaryContactMobile: mobile },
    orderBy: { createdAt: "desc" },
  });
}

async function main() {
  const serviceSource = readFileSync(
    join(__dirname, "../server/services/compass-customer-gateway/compass-journey.service.ts"),
    "utf8",
  );
  const startSource = serviceSource.slice(
    serviceSource.indexOf("async startJourney"),
    serviceSource.indexOf("async patchAnswers"),
  );
  assert.equal(startSource.includes("compassChannel: campaign"), true);
  assert.doesNotMatch(startSource, /compassConsentAt|compassConsentVersion/);
  assert.equal((startSource.match(/snapshot:\s*\{/g) ?? []).length, 1);

  const website = await compassJourneyService.startJourney({
    productCode: "home-loan",
    mobile: WEBSITE_MOBILE,
    consentAccepted: true,
  });
  const websiteRow = await opportunity(WEBSITE_MOBILE);
  const websiteSnapshot = snapshotOf(websiteRow);
  assert.equal(websiteRow?.sourceCode, "website_compass");
  assert.equal(websiteRow?.sourceCampaignLabel, "COMPASS Website");
  assert.equal(websiteSnapshot.compassChannel, "website");
  assert.equal(websiteSnapshot.compassCampaignId, undefined);
  assert.equal(websiteSnapshot.compassMobileVerified, false);
  assert.equal(websiteSnapshot.compassJourneyVersion, 1);
  assert.equal(website.mobileVerified, false);
  assert.equal(website.otpRequired, false);
  assertNoFinalConsent(websiteSnapshot, "website-start");

  const token = issueCampaignRecipientToken(
    {
      campaignId: "cmp_g5a_consent",
      recipientRef: "ctc_g5a_consent",
      productCode: "home-loan",
      sourceCode: "email_campaign",
      campaignLabel: "G5A Consent Proof",
    },
    secret,
  );
  const campaign = await compassJourneyService.startJourney({
    productCode: "home-loan",
    mobile: CAMPAIGN_MOBILE,
    campaignToken: token,
    consentAccepted: true,
  });
  const campaignRow = await opportunity(CAMPAIGN_MOBILE);
  const campaignSnapshot = snapshotOf(campaignRow);
  assert.equal(campaignRow?.sourceCode, "email_campaign");
  assert.equal(campaignRow?.sourceCampaignLabel, "G5A Consent Proof");
  assert.equal(campaignSnapshot.compassChannel, "campaign");
  assert.equal(campaignSnapshot.compassCampaignId, "cmp_g5a_consent");
  assert.equal(campaignSnapshot.compassCampaignRecipientRef, "ctc_g5a_consent");
  assert.equal(campaignSnapshot.compassMobileVerified, false);
  assert.equal(campaignSnapshot.compassJourneyVersion, 1);
  assert.equal(campaign.otpRequired, false);
  assertNoFinalConsent(campaignSnapshot, "campaign-start");

  await compassJourneyService.patchAnswers(website.journeySessionToken, {
    answers: {
      displayName: "STAGE1B CONSENT PROOF",
      employmentTypeCode: "salaried",
      employerName: "STAGE1B SYNTHETIC EMPLOYER",
      monthlyIncomeLabel: "150000",
      approxCibilScore: "750_799",
      propertyCategory: "residential",
      constructionStatus: "ready",
      requestedAmountLabel: "5000000",
      occupation: "doctor",
      annualTurnoverLabel: "9000000",
    },
  });
  const answered = await opportunity(WEBSITE_MOBILE);
  const answeredSnapshot = snapshotOf(answered);
  assertNoFinalConsent(answeredSnapshot, "after-answers");
  assert.equal(answered?.primaryContactName, "Stage1b Consent Proof");
  const answers = (answeredSnapshot.compassAnswers ?? {}) as Record<string, unknown>;
  assert.equal(answers.employmentTypeCode, "salaried");
  assert.equal(answers.employerName, "STAGE1B SYNTHETIC EMPLOYER");
  assert.equal(answers.occupation, undefined);
  assert.equal(answers.annualTurnoverLabel, undefined);
  assert.equal(answered?.requestedAmount?.toString(), "5000000");

  try {
    await compassJourneyService.analyze(website.journeySessionToken);
  } catch {
    /* A local catalogue gap must not become a consent write. */
  }
  const analysed = await opportunity(WEBSITE_MOBILE);
  assertNoFinalConsent(snapshotOf(analysed), "after-analyse");

  await assert.rejects(
    () =>
      compassJourneyService.submit(website.journeySessionToken, {
        consentAccepted: false,
        lenderShareAccepted: true,
        declarationsAccepted: true,
      }),
    (error: unknown) => {
      assert.ok(error instanceof CompassJourneyError);
      assert.equal(error.code, "CONSENT_REQUIRED");
      return true;
    },
  );
  const rejected = await opportunity(WEBSITE_MOBILE);
  assertNoFinalConsent(snapshotOf(rejected), "rejected-submit");

  const before = Date.now();
  const submitted = await compassJourneyService.submit(website.journeySessionToken, {
    consentAccepted: true,
    lenderShareAccepted: true,
    declarationsAccepted: true,
  });
  const after = Date.now();
  assert.equal(submitted.submitted, true);
  const accepted = await opportunity(WEBSITE_MOBILE);
  const acceptedSnapshot = snapshotOf(accepted);
  assert.equal(acceptedSnapshot.compassConsentVersion, "compass-consent-v1");
  assert.equal(typeof acceptedSnapshot.compassConsentAt, "string");
  assert.equal(acceptedSnapshot.compassConsentAt, acceptedSnapshot.compassSubmittedAt);
  const acceptedMs = Date.parse(String(acceptedSnapshot.compassConsentAt));
  assert.ok(acceptedMs >= before - 2000 && acceptedMs <= after + 2000);

  await compassJourneyService.resume(website.journeySessionToken);
  const reread = await opportunity(WEBSITE_MOBILE);
  assert.equal(snapshotOf(reread).compassConsentAt, acceptedSnapshot.compassConsentAt);
  const again = await compassJourneyService.submit(website.journeySessionToken, {
    consentAccepted: true,
    lenderShareAccepted: true,
    declarationsAccepted: true,
  });
  assert.equal(again.submitted, true);
  const rereadAgain = await opportunity(WEBSITE_MOBILE);
  assert.equal(snapshotOf(rereadAgain).compassConsentAt, acceptedSnapshot.compassConsentAt);

  const preserved = await prisma.enterpriseOpportunity.findFirst({
    where: { opportunityNumber: { in: ["OPP-2026-000142", "OPP-2026-000143"] } },
  });
  assert.equal(preserved, null);

  console.log(
    JSON.stringify({
      proof: "FINAL_CONSENT_PROOF",
      websiteSource: websiteRow?.sourceCode,
      campaignSource: campaignRow?.sourceCode,
      journeyVersion: websiteSnapshot.compassJourneyVersion,
      consentVersion: acceptedSnapshot.compassConsentVersion,
      mobileVerified: websiteSnapshot.compassMobileVerified,
    }),
  );
  await prisma.$disconnect();
}

main().catch(async (error) => {
  const message = error instanceof Error ? error.message : "PROOF_FAILED";
  console.error(message.replace(/postgres(?:ql)?:\/\/\S+/gi, "postgres://redacted"));
  await prisma.$disconnect();
  process.exit(1);
});
