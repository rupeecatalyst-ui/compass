/**
 * Post-send corrections: campaign token, official logo render, recipient explorer dates.
 * No SMTP, no campaign publish, no migration, no ledger writes.
 */
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { pathToFileURL } from "node:url";

const root = resolve(import.meta.dirname, "..");
const secret = "post-send-correction-proof-secret";
const campaignId = "mkt-camp-cmrtlilr60001weys1xv2uu5t-1792906011799";
const approvedSnapshotId = "mkt-snap-approved";
const sendSnapshotId = "mkt-snap-approved-later";
const recipientId = `${sendSnapshotId}-r-1`;
const versionId = "mkt-ver-approved-2";

const linkUrl = pathToFileURL(resolve(root, "src/lib/product-journey/campaign-link.ts")).href;
const bindingUrl = pathToFileURL(resolve(root, "src/lib/product-journey/campaign-recipient-binding.ts")).href;
const entryUrl = pathToFileURL(resolve(root, "src/lib/product-journey/campaign-entry-url.ts")).href;
const renderUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/email-render.ts")).href;
const logoUrl = pathToFileURL(resolve(root, "src/lib/enterprise-marketing-engine/official-email-logo.ts")).href;
const explorerUrl = pathToFileURL(
  resolve(root, "src/lib/enterprise-marketing-engine/campaign-recipient-explorer.ts"),
).href;

const link = await import(linkUrl);
const binding = await import(bindingUrl);
const entry = await import(entryUrl);
const render = await import(renderUrl);
const logo = await import(logoUrl);
const explorer = await import(explorerUrl);

const approved = { id: approvedSnapshotId, campaignId, campaignVersionId: versionId };
const laterSnapshot = { id: sendSnapshotId, campaignId, campaignVersionId: versionId };
const recipient = {
  id: recipientId,
  campaignId,
  snapshotId: sendSnapshotId,
  normalizedMobile: "9000000201",
};

const token = link.issueCampaignRecipientToken(
  {
    campaignId,
    recipientRef: recipientId,
    productCode: "home-loan",
    sourceCode: "marketing_email",
    campaignLabel: "RC Salaried Home Loan – Test 01",
  },
  secret,
);
assert.equal(token.includes("@"), false);
const claims = link.verifyCampaignRecipientToken(token, secret);
assert.equal(claims.recipientRef, recipientId);
assert.equal(claims.productCode, "home-loan");
assert.equal(JSON.stringify(claims).includes("@"), false);
const href = entry.compassCampaignEntryUrl({
  productCode: "home-loan",
  campaignToken: token,
  origin: "https://www.rupeecatalyst.com",
});
assert.match(href, /^https:\/\/www\.rupeecatalyst\.com\/apply\/home-loan\?campaign=/);
assert.equal(new URL(href).searchParams.get("campaign"), token);

const bound = binding.bindFrozenSnapshotRecipient({
  claims,
  recipient,
  snapshot: laterSnapshot,
  approvedSnapshot: approved,
});
assert.equal(bound.ok, true);
if (!bound.ok) throw new Error("binding");
assert.equal(bound.snapshotId, sendSnapshotId);
assert.equal(bound.mobile, "9000000201");
assert.equal(JSON.stringify(bound).includes("@"), false);

const matched = link.decideCampaignIdentity({
  recipientMobile: bound.mobile,
  enteredMobile: "9000000201",
});
assert.equal(matched, "matched");
const conflict = link.decideCampaignIdentity({
  recipientMobile: bound.mobile,
  enteredMobile: "9000000202",
});
assert.equal(conflict, "conflict");
const unbound = link.decideCampaignIdentity({ recipientMobile: null, enteredMobile: "9000000202" });
assert.equal(unbound, "separate");

const attribution = binding.campaignOpportunityAttributionFields({
  claims,
  decision: conflict,
  snapshotId: bound.snapshotId,
});
assert.equal(attribution.compassCampaignId, campaignId);
assert.equal(attribution.compassCampaignRecipientRef, recipientId);
assert.equal(attribution.compassCampaignSnapshotId, sendSnapshotId);
assert.equal(attribution.compassCampaignIdentity, "conflict");
assert.equal(JSON.stringify(attribution).includes("@"), false);

assert.throws(
  () =>
    link.issueCampaignRecipientToken(
      {
        campaignId,
        recipientRef: "audience:email:person@example.com",
        productCode: "home-loan",
        sourceCode: "marketing_email",
        campaignLabel: "legacy",
      },
      secret,
    ),
  /CAMPAIGN_TOKEN_INVALID/,
);
assert.equal(binding.classifyCampaignRecipientRef("audience:email:person@example.com"), "rejected");
assert.equal(binding.classifyCampaignRecipientRef("email:person@example.com"), "rejected");

function legacyEmailToken() {
  const payload = {
    v: 1,
    kind: "campaign-recipient",
    campaignId,
    recipientRef: "audience:email:person@example.com",
    productCode: "home-loan",
    sourceCode: "marketing_email",
    campaignLabel: "legacy",
    exp: Math.floor(Date.now() / 1000) + 3600,
  };
  const body = Buffer.from(JSON.stringify(payload), "utf8").toString("base64url");
  const sig = createHmac("sha256", secret).update(`campaign-recipient.${body}`).digest("base64url");
  return `${body}.${sig}`;
}
assert.throws(() => link.verifyCampaignRecipientToken(legacyEmailToken(), secret), /CAMPAIGN_TOKEN_INVALID/);
assert.equal(binding.classifyCampaignRecipientRef("ctc_stage1b_browser"), "contact");
const contactToken = link.issueCampaignRecipientToken(
  {
    campaignId,
    recipientRef: "ctc_stage1b_browser",
    productCode: "home-loan",
    sourceCode: "marketing_email",
    campaignLabel: "legacy contact",
  },
  secret,
);
assert.equal(link.verifyCampaignRecipientToken(contactToken, secret).recipientRef, "ctc_stage1b_browser");
assert.equal(
  binding.bindFrozenSnapshotRecipient({
    claims: link.verifyCampaignRecipientToken(contactToken, secret),
    recipient,
    snapshot: laterSnapshot,
    approvedSnapshot: approved,
  }).ok,
  false,
);

const forged = `${token.slice(0, -1)}${token.endsWith("a") ? "b" : "a"}`;
assert.throws(() => link.verifyCampaignRecipientToken(forged, secret), /CAMPAIGN_TOKEN_INVALID/);
assert.throws(
  () => link.verifyCampaignRecipientToken(token, "different-secret"),
  /CAMPAIGN_TOKEN_INVALID/,
);
const expired = link.issueCampaignRecipientToken(
  {
    campaignId,
    recipientRef: recipientId,
    productCode: "home-loan",
    sourceCode: "marketing_email",
    campaignLabel: "expired",
    ttlSec: -10,
  },
  secret,
);
assert.throws(() => link.verifyCampaignRecipientToken(expired, secret), /CAMPAIGN_TOKEN_EXPIRED/);

assert.equal(
  binding.bindFrozenSnapshotRecipient({
    claims,
    recipient: { ...recipient, campaignId: "other-campaign" },
    snapshot: laterSnapshot,
    approvedSnapshot: approved,
  }).reason,
  "campaign_mismatch",
);
assert.equal(
  binding.bindFrozenSnapshotRecipient({
    claims,
    recipient,
    snapshot: { ...laterSnapshot, campaignVersionId: "draft-version" },
    approvedSnapshot: approved,
  }).reason,
  "not_approved_snapshot",
);
assert.equal(
  binding.bindFrozenSnapshotRecipient({
    claims,
    recipient,
    snapshot: { ...laterSnapshot, campaignVersionId: "draft-version" },
    approvedSnapshot: null,
    approvedVersionId: versionId,
  }).reason,
  "not_approved_snapshot",
);
assert.equal(
  binding.bindFrozenSnapshotRecipient({
    claims,
    recipient,
    snapshot: laterSnapshot,
    approvedSnapshot: null,
    approvedVersionId: versionId,
  }).ok,
  true,
);
assert.equal(
  binding.bindFrozenSnapshotRecipient({
    claims,
    recipient,
    snapshot: laterSnapshot,
    approvedSnapshot: null,
    approvedVersionId: null,
  }).reason,
  "not_approved_snapshot",
);

assert.equal(
  binding.bindFrozenSnapshotRecipient({
    claims,
    recipient: null,
    snapshot: laterSnapshot,
    approvedSnapshot: approved,
    approvedVersionId: versionId,
  }).reason,
  "missing_recipient",
);

const draftUrl = `https://catalyst-one.rupeecatalyst.com/api/marketing/public-assets/${logo.HOME_LOAN_UNAPPROVED_DRAFT_LOGO_ASSET_ID}?c=abc`;
const html = render.renderMarketingEmailHtml({
  content: {
    version: 1,
    blocks: [
      {
        id: "logo-image",
        type: "image",
        props: { url: draftUrl, alt: "Rupee Catalyst – Financial Fitness Champion" },
      },
      {
        id: "other",
        type: "image",
        props: { url: "https://example.com/other-campaign.png", alt: "Other campaign" },
      },
      { id: "empty", type: "image", props: { url: "", alt: "Missing" } },
      { id: "wordmark", type: "logo", props: { url: "/brand/rupee-catalyst-logo.png", alt: "" } },
    ],
  },
  subject: "Home Loan",
  previewText: "Preview",
  mode: "desktop",
});
assert.equal(html.includes(logo.HOME_LOAN_UNAPPROVED_DRAFT_LOGO_ASSET_ID), false);
assert.equal((html.match(new RegExp(logo.RUPEE_CATALYST_OFFICIAL_LOGO_EMAIL_URL.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "g")) ?? []).length, 2);
assert.match(html, /alt="Rupee Catalyst – Financial Fitness Champion"/);
assert.match(html, /alt="Rupee Catalyst"/);
assert.match(html, /width="180"/);
assert.match(html, /https:\/\/example\.com\/other-campaign\.png/);
assert.equal(html.includes('alt="Missing"'), false);
assert.match(html, /<!--\[if mso\]>/);
assert.equal(html.includes("position:absolute"), false);

const ts = "2026-10-26T08:00:00.000Z";
const page = explorer.composeMarketingCampaignRecipientExplorer({
  organizationId: "org-a",
  durableAvailable: true,
  campaignId,
  recipients: [
    {
      id: recipientId,
      organizationId: "org-a",
      snapshotId: sendSnapshotId,
      campaignId,
      sourceWorkbookId: "wb",
      sourceTabId: "tab",
      sourceTabName: "Master",
      sourceRowNumber: 2,
      sourceStableKey: "row:2",
      recipientFingerprint: "email:hidden@example.com",
      normalizedEmail: "hidden@example.com",
      assignedBatchNumber: 1,
      createdAt: ts,
      updatedAt: ts,
    },
  ],
  ledger: [
    {
      id: "led-1",
      organizationId: "org-a",
      campaignId,
      campaignVersionId: versionId,
      snapshotId: sendSnapshotId,
      snapshotRecipientId: recipientId,
      channel: "EMAIL",
      normalizedEmail: "hidden@example.com",
      sourceStableKey: "row:2",
      idempotencyKey: "idem-1",
      batchId: "batch-1",
      batchNumber: 1,
      status: "sent",
      scheduledAt: ts,
      claimedAt: null,
      processedAt: new Date("2026-10-26T08:30:00.000Z"),
      attemptCount: 1,
      providerMessageId: "smtp-1",
      openedAt: null,
      clickedAt: null,
      repliedAt: null,
      unsubscribedAt: null,
      suppressionReason: null,
      linkedContactId: null,
      linkedOpportunityId: null,
      createdByUserId: null,
      updatedByUserId: null,
      createdAt: ts,
      updatedAt: new Date("not-a-date"),
    },
  ],
  engagements: [
    {
      id: "evt-1",
      organizationId: "org-a",
      campaignId,
      ledgerId: "led-1",
      eventType: "Clicked",
      providerEventId: "p1",
      idempotencyKey: "e1",
      occurredAt: "2026-10-26T09:00:00.000Z",
      createdAt: ts,
    },
    {
      id: "evt-2",
      organizationId: "org-a",
      campaignId,
      ledgerId: "led-1",
      eventType: "Opened",
      providerEventId: "p2",
      idempotencyKey: "e2",
      occurredAt: new Date("2026-10-26T09:00:00.000Z"),
      createdAt: ts,
    },
    {
      id: "evt-bad",
      organizationId: "org-a",
      campaignId,
      ledgerId: "led-1",
      eventType: "Ignored",
      providerEventId: "p3",
      idempotencyKey: "e3",
      occurredAt: "not-a-date",
      createdAt: ts,
    },
  ],
});
assert.equal(page.total, 1);
assert.equal(page.rows[0]?.latestEvent, "Opened");
assert.equal(page.rows[0]?.latestEventAt, "2026-10-26T09:00:00.000Z");
assert.equal(page.rows[0]?.status, "sent");

const delivery = readFileSync(
  resolve(root, "server/services/enterprise-marketing-engine/email-delivery.service.ts"),
  "utf8",
);
assert.equal(delivery.includes("audience:${"), false);
assert.match(delivery, /snapshotRecipientId/);
const journey = readFileSync(
  resolve(root, "server/services/compass-customer-gateway/compass-journey.service.ts"),
  "utf8",
);
assert.match(journey, /bindFrozenSnapshotRecipient/);
assert.match(journey, /IDENTITY_CONFLICT/);
assert.match(journey, /CAMPAIGN_TOKEN_INVALID/);

const logoResponse = await fetch(logo.RUPEE_CATALYST_OFFICIAL_LOGO_EMAIL_URL, { method: "GET" });
assert.equal(logoResponse.status, 200);
assert.match(logoResponse.headers.get("content-type") ?? "", /image\/png/i);
const logoBytes = new Uint8Array(await logoResponse.arrayBuffer());
assert.equal(logoBytes.length > 8, true);
assert.equal(logoBytes[0], 0x89);
assert.equal(logoBytes[1], 0x50);
assert.equal(logoBytes[2], 0x4e);
assert.equal(logoBytes[3], 0x47);

const published = await fetch(
  "https://www.rupeecatalyst.com/api/journey/config?productCode=home-loan&requirePublished=1",
);
assert.equal(published.status, 200);
const publishedBody = await published.json();
assert.equal(publishedBody.journeyVersion, 2);
assert.equal(publishedBody.productCode, "home-loan");
assert.equal(publishedBody.journeyUnavailable ?? null, null);

const forgedLive = await fetch(
  "https://www.rupeecatalyst.com/api/journey/config?productCode=home-loan&requirePublished=1&campaign=not-a-token",
);
assert.notEqual(forgedLive.status, 200);
const forgedBody = await forgedLive.json();
assert.match(String(forgedBody.error ?? ""), /not valid|not available/i);

console.log(
  JSON.stringify({
    proof: "post-send-corrections",
    tokenKind: binding.classifyCampaignRecipientRef(claims.recipientRef),
    journeyVersion: publishedBody.journeyVersion,
    forgedStatus: forgedLive.status,
    logoBytes: logoBytes.length,
    explorerLatest: page.rows[0]?.latestEvent,
  }),
);
