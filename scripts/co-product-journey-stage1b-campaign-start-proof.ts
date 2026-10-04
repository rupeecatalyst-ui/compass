/**
 * Stage 1B campaign start persistence proof.
 * Local disposable Postgres only. Refuses any non-loopback database.
 * Does not print campaign tokens or secrets.
 */
import assert from "node:assert/strict";
import { prisma } from "../server/lib/prisma";
import { issueCampaignRecipientToken } from "../src/lib/product-journey/campaign-link";

const databaseUrl = process.env.DATABASE_URL ?? "";
const parsed = new URL(databaseUrl);
if (parsed.hostname !== "127.0.0.1" || parsed.port !== "54335" || parsed.pathname !== "/stage1b_campaign") {
  throw new Error("REFUSING_NON_LOCAL_DATABASE");
}
const secret = process.env.COMPASS_JOURNEY_SESSION_SECRET?.trim();
if (!secret) throw new Error("CAMPAIGN_SECRET_MISSING");
const compass = process.env.COMPASS_PROOF_URL ?? "http://127.0.0.1:3001";

async function start(body: Record<string, unknown>) {
  const response = await fetch(`${compass}/api/journey/start`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Origin: compass },
    body: JSON.stringify(body),
  });
  const payload = (await response.json().catch(() => null)) as { error?: string } | null;
  return { status: response.status, error: payload?.error ?? null };
}

async function opportunity(mobile: string) {
  return prisma.enterpriseOpportunity.findFirst({
    where: { primaryContactMobile: mobile },
    orderBy: { createdAt: "desc" },
    select: {
      sourceCode: true,
      sourceCampaignLabel: true,
      primaryContactId: true,
      snapshot: true,
    },
  });
}

function snapshotOf(row: { snapshot: unknown } | null) {
  return (row?.snapshot ?? {}) as Record<string, unknown>;
}

async function main() {
  const org = await prisma.organization.findUnique({ where: { slug: "stage1b-campaign-fix" } });
  if (!org) throw new Error("ORG_MISSING");

  const plain = await start({
    productCode: "home-loan",
    mobile: "9000000101",
    consentAccepted: true,
    campaignId: "cmp_forged",
    sourceCode: "forged_source",
    campaignLabel: "Forged Label",
    recipientRef: "ctc_forged",
  });
  assert.equal(plain.status, 201);
  const plainRow = await opportunity("9000000101");
  assert.equal(plainRow?.sourceCode, "website_compass");
  assert.equal(plainRow?.sourceCampaignLabel, "COMPASS Website");
  assert.equal(snapshotOf(plainRow).compassCampaignId, undefined);

  const token = issueCampaignRecipientToken(
    {
      campaignId: "cmp_stage1b_browser",
      recipientRef: "ctc_stage1b_browser",
      productCode: "home-loan",
      sourceCode: "email_campaign",
      campaignLabel: "Stage 1B Browser Smoke",
    },
    secret,
  );
  assert.equal(token.includes("@"), false);
  const valid = await start({
    productCode: "home-loan",
    mobile: "9000000102",
    consentAccepted: true,
    campaignToken: token,
    sourceCode: "forged_source",
    campaignLabel: "Forged Label",
    campaignId: "cmp_forged",
  });
  assert.equal(valid.status, 201);
  const validRow = await opportunity("9000000102");
  assert.equal(validRow?.sourceCode, "email_campaign");
  assert.equal(validRow?.sourceCampaignLabel, "Stage 1B Browser Smoke");
  const validSnapshot = snapshotOf(validRow);
  assert.equal(validSnapshot.compassCampaignId, "cmp_stage1b_browser");
  assert.equal(validSnapshot.compassCampaignRecipientRef, "ctc_stage1b_browser");
  assert.equal(validSnapshot.compassCampaignIdentity, "separate");
  assert.equal(validSnapshot.compassMobileVerified, false);
  assert.equal(validSnapshot.compassJourneyVersion, 1);

  const tampered = await start({
    productCode: "home-loan",
    mobile: "9000000103",
    consentAccepted: true,
    campaignToken: `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`,
    sourceCode: "forged_source",
    campaignLabel: "Forged Label",
  });
  assert.notEqual(tampered.status, 201);
  assert.equal(await opportunity("9000000103"), null);

  const recipient = await prisma.ecmContact.create({
    data: {
      organizationId: org.id,
      name: "Stage 1B Synthetic Recipient",
      mobilePrimary: "9000000201",
      primaryRole: "customer",
      roles: ["customer"],
      createdBy: "stage1b-campaign-proof",
      modifiedBy: "stage1b-campaign-proof",
    },
  });
  const conflictToken = issueCampaignRecipientToken(
    {
      campaignId: "cmp_stage1b_browser",
      recipientRef: recipient.id,
      productCode: "home-loan",
      sourceCode: "email_campaign",
      campaignLabel: "Stage 1B Browser Smoke",
    },
    secret,
  );
  const conflict = await start({
    productCode: "home-loan",
    mobile: "9000000202",
    consentAccepted: true,
    campaignToken: conflictToken,
  });
  assert.notEqual(conflict.status, 201);
  assert.match(conflict.error ?? "", /different mobile number/i);
  assert.equal(await opportunity("9000000202"), null);
  const unchanged = await prisma.ecmContact.findUnique({ where: { id: recipient.id } });
  assert.equal(unchanged?.mobilePrimary, "9000000201");
  assert.equal(unchanged?.name, "Stage 1B Synthetic Recipient");

  console.log(
    JSON.stringify({
      proof: "STAGE_1B_CAMPAIGN_START_PROOF",
      website: plainRow?.sourceCode,
      campaign: validRow?.sourceCode,
      campaignLabel: validRow?.sourceCampaignLabel,
      tamperedStatus: tampered.status,
      conflictStatus: conflict.status,
      mobileVerified: validSnapshot.compassMobileVerified,
      journeyVersion: validSnapshot.compassJourneyVersion,
    }),
  );
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error instanceof Error ? error.message : "PROOF_FAILED");
  await prisma.$disconnect();
  process.exit(1);
});
