/**
 * Controlled five-recipient Marketing send.
 * Local fixtures and a mock provider only. Does not send email.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
function ts(rel) {
  return pathToFileURL(resolve(root, rel)).href;
}

process.env.ENTERPRISE_PERSISTENCE_MODE = "memory";
process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE = "memory";
delete process.env.ENTERPRISE_MARKETING_EXECUTION_ENABLED;
delete process.env.ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED;
delete process.env.ENTERPRISE_MARKETING_CONTROLLED_TEST_SEND_ENABLED;

const five = await import(ts("src/lib/enterprise-marketing-engine/controlled-five-send.ts"));
const senderElig = await import(ts("src/lib/enterprise-marketing-engine/sender-eligibility.ts"));
const senderLink = await import(ts("src/lib/enterprise-marketing-engine/sender-link.ts"));
const entry = await import(ts("src/lib/enterprise-marketing-engine/campaign-entry-gate.ts"));
const cta = await import(ts("src/lib/product-journey/campaign-entry-url.ts"));
const personalisation = await import(ts("src/lib/enterprise-marketing-engine/snapshot-personalization.ts"));
const worker = await import(ts("src/lib/enterprise-marketing-engine/execution/snapshot-pacing-worker.ts"));
const durability = await import(ts("src/lib/enterprise-marketing-engine/durability/index.ts"));
const executionDefaults = await import(ts("src/constants/enterprise-marketing-engine/execution.ts"));
const smtp = await import(ts("src/constants/enterprise-marketing-engine/hostinger-smtp.ts"));
const execution = await import(ts("server/services/enterprise-marketing-engine/execution.service.ts"));
const campaigns = await import(ts("server/services/enterprise-marketing-engine/campaign.service.ts"));
const campaignStore = await import(ts("server/services/enterprise-marketing-engine/campaign-store.ts"));
const senderStore = await import(ts("server/services/enterprise-marketing-engine/sender-identity-store.ts"));
const smtpSecrets = await import(ts("src/lib/enterprise-communication-center/smtp-secret-resolver.ts"));
const mailboxCodes = await import(ts("src/lib/enterprise-communication-center/mailbox-profile.ts"));

const FROM = smtp.MARKETING_PHASE1_FROM_EMAIL;
const ORG = "org-controlled-five";

function verifiedSender(overrides = {}) {
  return {
    id: "sender-phase1",
    organizationId: ORG,
    displayName: "Rupee Catalyst Opportunities",
    fromAddress: FROM,
    replyTo: FROM,
    channel: "EMAIL",
    active: true,
    isDefault: true,
    simulated: false,
    approvalStatus: "APPROVED",
    verificationStatus: "VERIFIED",
    permittedCampaignCategories: ["Home Loan"],
    createdByUserId: "admin",
    approvedByUserId: "admin",
    approvedAt: "2026-10-25T00:00:00.000Z",
    lastValidationAt: "2026-10-25T00:00:00.000Z",
    validationFreshUntil: null,
    providerMapping: { providerType: "smtp", providerProfileId: null, credentialConfigured: false },
    createdAt: "2026-10-25T00:00:00.000Z",
    updatedAt: "2026-10-25T00:00:00.000Z",
    ...overrides,
  };
}

const AUTHORISED_CAMPAIGN = five.MARKETING_CONTROLLED_FIVE_AUTHORISED_CAMPAIGN_ID;
const openGates = {
  campaignId: AUTHORISED_CAMPAIGN,
  executionEnabled: false,
  providerConnectEnabled: false,
  controlledTestSendEnabled: true,
  emailMode: "live",
  pacingCronRegistered: false,
};
assert.equal(five.assessMarketingControlledFiveGates(openGates).ok, true);
assert.equal(five.assessMarketingControlledFiveGates({ ...openGates, campaignId: "another-campaign" }).ok, true);
assert.equal(five.assessMarketingControlledFiveGates({ ...openGates, campaignId: "" }).ok, true);
assert.equal(five.assessMarketingControlledFiveGates({ ...openGates, campaignId: undefined }).ok, true);
assert.equal(
  five.assessMarketingControlledFiveGates({
    ...openGates,
    controlledTestSendEnabled: false,
    productionLiveEnabled: true,
  }).ok,
  true,
);
assert.equal(
  five.assessMarketingControlledFiveGates({ ...openGates, executionEnabled: true }).code,
  "CONTROLLED_FIVE_SEND_EXECUTION_ENABLED",
);
assert.equal(
  five.assessMarketingControlledFiveGates({ ...openGates, providerConnectEnabled: true }).code,
  "CONTROLLED_FIVE_SEND_PROVIDER_CONNECT_ENABLED",
);
assert.equal(
  five.assessMarketingControlledFiveGates({ ...openGates, pacingCronRegistered: true }).code,
  "CONTROLLED_FIVE_SEND_CRON_REGISTERED",
);
assert.equal(
  five.assessMarketingControlledFiveGates({ ...openGates, controlledTestSendEnabled: false }).code,
  "CONTROLLED_FIVE_SEND_NOT_AUTHORIZED",
);

const readyAudience = {
  campaignStatus: "APPROVED",
  approvedAt: "2026-10-25T00:00:00.000Z",
  channel: "EMAIL",
  eligibleCount: 5,
  recipientCount: 5,
  senderIdentityId: "sender-phase1",
  fromAddress: FROM,
  sender: verifiedSender(),
};
assert.equal(five.assessMarketingControlledFiveAudience(readyAudience).ok, true);
assert.equal(
  five.assessMarketingControlledFiveAudience({ ...readyAudience, recipientCount: 4, eligibleCount: 4 }).code,
  "CONTROLLED_FIVE_RECIPIENT_COUNT",
);
assert.equal(
  five.assessMarketingControlledFiveAudience({ ...readyAudience, senderIdentityId: null }).code,
  "CONTROLLED_FIVE_SENDER",
);
assert.equal(five.assessMarketingLiveSenderLink(null).code, "SENDER_IDENTITY_REQUIRED");
assert.equal(five.assessMarketingLiveSenderLink("sender-phase1").ok, true);
const pending = five.assessMarketingControlledFiveAudience({
  ...readyAudience,
  sender: verifiedSender({ verificationStatus: "PENDING" }),
});
assert.equal(pending.ok, false);
assert.equal(pending.code, "AWAITING_PROVIDER_VERIFICATION");
assert.equal(
  five.assessMarketingControlledFiveAudience({ ...readyAudience, fromAddress: "other@example.com" }).code,
  "CONTROLLED_FIVE_SENDER",
);
assert.equal(
  five.assessMarketingControlledFiveAudience({
    ...readyAudience,
    senderIdentityId: "sender-connect",
    fromAddress: "connect@rupeecatalyst.com",
    fromName: "Rupee Catalyst Connect",
    sender: verifiedSender({
      id: "sender-connect",
      displayName: "Rupee Catalyst Connect",
      fromAddress: "connect@rupeecatalyst.com",
      replyTo: "connect@rupeecatalyst.com",
    }),
  }).ok,
  true,
);
const futureSender = verifiedSender({
  id: "sender-finance",
  displayName: "Rupee Catalyst Finance",
  fromAddress: "finance@rupeecatalyst.com",
  replyTo: "finance@rupeecatalyst.com",
});
assert.equal(
  five.assessMarketingControlledFiveAudience({
    ...readyAudience,
    senderIdentityId: futureSender.id,
    fromAddress: "finance@rupeecatalyst.com",
    fromName: "Rupee Catalyst Finance",
    sender: futureSender,
  }).ok,
  true,
);
assert.equal(
  five.assessMarketingControlledFiveAudience({
    ...readyAudience,
    senderIdentityId: futureSender.id,
    fromAddress: "finance@rupeecatalyst.com",
    fromName: "Different Name",
    sender: futureSender,
  }).code,
  "CONTROLLED_FIVE_SENDER",
);
assert.doesNotThrow(() =>
  senderElig.assertLinkedCampaignSender({
    senderIdentityId: null,
    identity: null,
    campaignFromAddress: "legacy@example.com",
  }),
);
assert.throws(
  () =>
    senderElig.assertLinkedCampaignSender({
      senderIdentityId: "sender-finance",
      identity: verifiedSender({ verificationStatus: "PENDING" }),
      campaignFromAddress: FROM,
    }),
  (error) => error?.code === "AWAITING_PROVIDER_VERIFICATION",
);
assert.throws(
  () =>
    senderElig.assertLinkedCampaignSender({
      senderIdentityId: futureSender.id,
      identity: futureSender,
      campaignFromAddress: "other@example.com",
      campaignFromName: futureSender.displayName,
    }),
  (error) => error?.code === "SENDER_IDENTITY_MISMATCH",
);
assert.doesNotThrow(() =>
  senderElig.assertLinkedCampaignSender({
    senderIdentityId: futureSender.id,
    identity: futureSender,
    campaignFromAddress: futureSender.fromAddress,
    campaignFromName: futureSender.displayName,
  }),
);
assert.equal(smtpSecrets.smtpSecretEnvName("CUSTOMERS"), "ECC_CUSTOMERS_SMTP_PASSWORD");
assert.equal(smtpSecrets.smtpSecretEnvName("MAILBOX_SALES"), "ECC_MAILBOX_SALES_SMTP_PASSWORD");
assert.equal(mailboxCodes.mailboxProfileCode("sales@rupeecatalyst.com"), "MAILBOX_SALES");
assert.equal(smtpSecrets.resolveSmtpSecret("MAILBOX_SALES"), null);
assert.equal(senderElig.assessMarketingSenderLiveReadiness(verifiedSender()).eligible, true);
assert.equal(
  senderElig.assessMarketingSenderLiveReadiness(verifiedSender({ verificationStatus: "PENDING" })).eligible,
  false,
);
assert.throws(() =>
  senderElig.assertMarketingSenderEligibleForLiveSend({
    identity: verifiedSender({ verificationStatus: "UNVERIFIED" }),
  }),
);
assert.equal(
  senderElig.assertMarketingSenderEligibleForLiveSend({ identity: verifiedSender() }).eligible,
  true,
);

assert.equal(
  senderLink.senderIdentityIdForAddress(
    [
      { id: "inactive", fromAddress: FROM, active: false },
      { id: "sender-phase1", fromAddress: FROM, active: true },
    ],
    `  ${FROM.toUpperCase()}  `,
  ),
  "sender-phase1",
);
assert.equal(senderLink.senderIdentityIdForAddress([{ id: "a", fromAddress: FROM, active: true }], ""), null);

const attributed = entry.attributeHomeLoanCampaignDestination({
  product: "home-loan",
  intendedUrl: "https://rupeecatalyst.com/home-loan#section",
  campaignToken: "tok-five",
});
assert.equal(attributed.ok, true);
const attributedUrl = new URL(attributed.url);
assert.equal(attributedUrl.origin, "https://rupeecatalyst.com");
assert.equal(attributedUrl.pathname, "/home-loan");
assert.equal(attributedUrl.searchParams.get("campaign"), "tok-five");
assert.equal(attributedUrl.hash, "");

const fallback = entry.attributeHomeLoanCampaignDestination({
  product: "home-loan",
  intendedUrl: "https://evil.example/home-loan",
  campaignToken: "tok-five",
});
assert.equal(fallback.ok, true);
assert.match(fallback.url, /\/apply\/home-loan\?campaign=tok-five/);
assert.equal(
  entry.attributeHomeLoanCampaignDestination({
    product: "home-loan",
    intendedUrl: "https://user:secret@rupeecatalyst.com/home-loan",
    campaignToken: "tok-five",
  }).url.includes("user:secret"),
  false,
);
assert.equal(
  entry.attributeHomeLoanCampaignDestination({ product: "personal-loan", campaignToken: "tok-five" }).ok,
  false,
);

const rewritten = cta.withAttributedCampaignCtas(
  {
    version: 1,
    blocks: [
      {
        id: "cta-1",
        type: "cta",
        props: { label: "Discover My Advantage", url: "https://example.com" },
      },
    ],
  },
  { url: attributed.url, label: "Discover My Advantage" },
);
assert.equal(rewritten.blocks[0].props.label, "Discover My Advantage");
assert.equal(rewritten.blocks[0].props.url, attributed.url);

const row = personalisation.marketingPersonalizationRowFromRecipient({
  normalizedEmail: "aisha@example.com",
  displayName: "Aisha Shah",
  mappedAttributesJson: { firstName: "Aisha", lastName: "Shah", city: "Pune", product: "Home Loan" },
});
assert.equal(row["Full Name"], "Aisha Shah");
assert.equal(row.city, "Pune");
assert.equal(row.product, "Home Loan");
const values = personalisation.personalizationValuesFromSnapshotRecipient({
  normalizedEmail: "aisha@example.com",
  displayName: "Aisha Shah",
  mappedAttributesJson: { city: "Pune", product: "Home Loan" },
});
assert.equal(values.fullName, "Aisha Shah");
assert.equal(values.city, "Pune");
assert.equal(values.product, "Home Loan");

await assert.rejects(
  () => execution.marketingExecutionService.runControlledFiveRecipientSend("missing-campaign", ORG, "admin"),
  (err) => err.code === "CONTROLLED_FIVE_SEND_NOT_AUTHORIZED",
);

const actor = { userId: "admin", role: "SUPER_ADMIN", organizationId: ORG };
await senderStore.marketingSenderIdentityStore.upsert({
  organizationId: ORG,
  id: "sender-phase1",
  displayName: "Rupee Catalyst Opportunities",
  fromAddress: FROM,
  replyTo: FROM,
  simulated: false,
  active: true,
  approvalStatus: "APPROVED",
  verificationStatus: "VERIFIED",
});
const created = await campaignStore.marketingCampaignStore.create({
  organizationId: ORG,
  name: "RC Salaried Home Loan – Test 01",
  product: "home-loan",
  channel: "EMAIL",
  createdByUserId: "admin",
});
await campaigns.marketingCampaignService.save(actor, created.campaign.id, {
  sender: { fromName: "Rupee Catalyst Opportunities", fromAddress: FROM },
  ctaLabel: "Discover My Advantage",
  ctaUrl: "https://rupeecatalyst.com/home-loan",
});
const unlinked = await campaignStore.marketingCampaignStore.getForOrg(created.campaign.id, ORG);
assert.equal(unlinked.senderIdentityId ?? null, null);
assert.equal(unlinked.status, "DRAFT");
assert.equal(unlinked.sender.fromAddress, FROM);
assert.equal(unlinked.name, "RC Salaried Home Loan – Test 01");
await campaigns.marketingCampaignService.save(actor, created.campaign.id, {
  senderIdentityId: "sender-phase1",
  sender: { fromName: "Rupee Catalyst Opportunities", fromAddress: FROM },
});
const linked = await campaignStore.marketingCampaignStore.getForOrg(created.campaign.id, ORG);
assert.equal(linked.senderIdentityId, "sender-phase1");
assert.equal(linked.sender.fromAddress, FROM);
const version = await campaignStore.marketingCampaignStore.getVersion(linked.currentDraftVersionId);
assert.equal(version.ctaLabel, "Discover My Advantage");
assert.equal(version.ctaUrl, "https://rupeecatalyst.com/home-loan");

await campaignStore.marketingCampaignStore.updateCampaign(created.campaign.id, ORG, {
  status: "APPROVED",
  governance: { ...linked.governance, approvedAt: "2026-10-25T00:00:00.000Z", approvedByUserId: "admin" },
});
await campaigns.marketingCampaignService.save(actor, created.campaign.id, {
  subject: "Your Home Loan advantage",
});
const reopened = await campaignStore.marketingCampaignStore.getForOrg(created.campaign.id, ORG);
assert.equal(reopened.status, "DRAFT");
assert.equal(reopened.senderIdentityId, "sender-phase1");

function nowIso() {
  return new Date().toISOString();
}

async function seed(ports, emails, campaignId) {
  const ts = nowIso();
  const snapshot = await ports.snapshots.insert({
    id: `snap-${campaignId}`,
    organizationId: ORG,
    campaignId,
    campaignVersionId: "ver-five",
    sourceBindingId: "bind-1",
    sourceWorkbookId: "fixture-marketing-master",
    sourceTabId: "tab-test",
    sourceTabName: "Test",
    extractedAt: ts,
    frozenAt: ts,
    frozenByUserId: "admin",
    eligibleCount: emails.length,
    estimatedBatchCount: 1,
    columnMap: { email: "Email", name: "Full Name" },
    snapshotHash: "abc".padEnd(64, "0"),
    createdByUserId: "admin",
    updatedByUserId: "admin",
    createdAt: ts,
    updatedAt: ts,
  });
  await ports.snapshotRecipients.insertMany(
    emails.map((email, index) => ({
      id: `${snapshot.id}-r-${index + 1}`,
      organizationId: ORG,
      snapshotId: snapshot.id,
      campaignId,
      sourceWorkbookId: "fixture-marketing-master",
      sourceTabId: "tab-test",
      sourceTabName: "Test",
      sourceRowNumber: index + 2,
      sourceStableKey: `row:${index + 1}`,
      recipientFingerprint: `email:${email}`,
      normalizedEmail: email,
      displayName: `Recipient ${index + 1}`,
      normalizedMobile: null,
      mappedAttributesJson: { firstName: `Recipient`, city: "Pune", product: "Home Loan" },
      assignedBatchNumber: 1,
      createdAt: ts,
      updatedAt: ts,
    })),
  );
  return snapshot;
}

const policy = {
  ...executionDefaults.MARKETING_DEFAULT_BATCH_POLICY,
  batchSize: 5,
  dailyMax: 5,
  startAt: "2026-10-25T04:00:00.000Z",
};

function mockDeliverer(probe, calls) {
  return async (recipient) => {
    calls.push({
      email: recipient.normalizedEmail,
      name: recipient.displayName,
      city: recipient.mappedAttributesJson?.city ?? null,
    });
    probe.liveProviderCalls += 1;
    return {
      status: "sent",
      retryable: false,
      dryRun: false,
      providerMessageId: `prov-${recipient.normalizedEmail}`,
      liveProviderInvoked: true,
    };
  };
}

async function tick(ports, campaignId, holderId, extras = {}) {
  return worker.runMarketingSnapshotPacingTick({
    ports,
    organizationId: ORG,
    campaignId,
    campaignVersionId: "ver-five",
    channel: "EMAIL",
    policy,
    holderId,
    now: new Date("2026-10-25T04:00:00.000Z"),
    forceRun: true,
    campaignStatus: "APPROVED",
    ...extras,
  });
}

const authorised = [
  "one@example.com",
  "two@example.com",
  "three@example.com",
  "four@example.com",
  "five@example.com",
];
const ports = durability.createMemoryMarketingDurabilityPorts();
await seed(ports, authorised, "camp-five");
const calls = [];
const probe = worker.createMarketingPacingProviderProbe();
const first = await tick(ports, "camp-five", "worker-1", {
  probe,
  deliver: mockDeliverer(probe, calls),
  controlledRecipientDeliveryAuthorized: true,
});
assert.equal(first.processed, 5);
assert.equal(first.failed, 0);
assert.equal(first.claimed, 5);
assert.equal(first.dryRun, false);
assert.equal(first.liveProviderInvoked, true);
assert.equal(probe.liveProviderCalls, 5);
assert.deepEqual(
  calls.map((call) => call.email).sort(),
  [...authorised].sort(),
);
assert.ok(calls.every((call) => call.name?.startsWith("Recipient") && call.city === "Pune"));

const ledger = await ports.ledger.listByCampaign(ORG, "camp-five");
const sent = ledger.filter((row) => row.status === "sent");
assert.equal(sent.length, 5);
assert.equal(new Set(sent.map((row) => row.providerMessageId)).size, 5);
assert.equal(new Set(sent.map((row) => row.normalizedEmail)).size, 5);
assert.ok(sent.every((row) => row.providerMessageId === `prov-${row.normalizedEmail}`));

const secondCalls = [];
const second = await tick(ports, "camp-five", "worker-2", {
  probe: worker.createMarketingPacingProviderProbe(),
  deliver: mockDeliverer(worker.createMarketingPacingProviderProbe(), secondCalls),
  controlledRecipientDeliveryAuthorized: true,
});
assert.equal(second.claimed, 0);
assert.equal(second.processed, 0);
assert.equal(secondCalls.length, 0);
assert.equal((await ports.ledger.listByCampaign(ORG, "camp-five")).filter((row) => row.status === "sent").length, 5);

const suppressPorts = durability.createMemoryMarketingDurabilityPorts();
await seed(suppressPorts, ["keep1@example.com", "keep2@example.com", "suppress.me@example.com", "keep3@example.com", "keep4@example.com"], "camp-suppress");
const suppressCalls = [];
const suppressed = await tick(suppressPorts, "camp-suppress", "worker-suppress", {
  probe: worker.createMarketingPacingProviderProbe(),
  deliver: mockDeliverer(worker.createMarketingPacingProviderProbe(), suppressCalls),
  controlledRecipientDeliveryAuthorized: true,
  shouldSuppressDelivery: (recipient) => recipient.normalizedEmail.includes("suppress"),
});
assert.equal(suppressed.suppressed, 1);
assert.equal(suppressCalls.length, 4);
assert.equal(suppressCalls.some((call) => call.email.includes("suppress")), false);

const shortPorts = durability.createMemoryMarketingDurabilityPorts();
await seed(shortPorts, authorised.slice(0, 4), "camp-short");
await assert.rejects(
  () =>
    tick(shortPorts, "camp-short", "worker-short", {
      probe: worker.createMarketingPacingProviderProbe(),
      deliver: async () => {
        throw new Error("deliverer must not run");
      },
      controlledRecipientDeliveryAuthorized: true,
    }),
  (err) => err.code === "CONTROLLED_FIVE_RECIPIENT_COUNT",
);

const forbiddenPorts = durability.createMemoryMarketingDurabilityPorts();
await seed(forbiddenPorts, authorised, "camp-forbidden");
await assert.rejects(
  () =>
    tick(forbiddenPorts, "camp-forbidden", "worker-forbidden", {
      probe: worker.createMarketingPacingProviderProbe(),
      deliver: async (recipient) => ({
        status: "sent",
        retryable: false,
        dryRun: false,
        providerMessageId: `prov-${recipient.normalizedEmail}`,
        liveProviderInvoked: true,
      }),
    }),
  (err) => err.code === "LIVE_PROVIDER_FORBIDDEN",
);

const builder = readFileSync(
  resolve(root, "src/components/catalyst-one/admin/marketing/marketing-campaign-builder-page.tsx"),
  "utf8",
);
assert.match(builder, /\/api\/admin\/marketing\/sender-identities/);
assert.match(builder, /senderIdentityId: selectedSenderIdentityId/);
assert.match(builder, /identity\.displayName/);
assert.match(builder, /identity\.fromAddress/);
assert.doesNotMatch(builder, /listMarketingAuthorisedMailboxes/);
assert.doesNotMatch(builder, /opportunities@rupeecatalyst\.com/);

console.log("co-marketing-controlled-five-verify: PASS");
process.exit(0);
