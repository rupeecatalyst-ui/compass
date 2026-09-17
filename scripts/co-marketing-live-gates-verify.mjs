import assert from "node:assert/strict";
import { marketingGateEnabled } from "../src/constants/enterprise-marketing-engine/safety.ts";
import { assertMarketingLiveExecutionGate } from "../src/lib/enterprise-marketing-engine/safety.ts";
import { createHostingerSmtpTransport } from "../server/services/enterprise-marketing-engine/adapters/hostinger-smtp-transport.ts";
import { composeMarketingReadinessReview } from "../src/lib/enterprise-marketing-engine/readiness-review.ts";
import { assertMarketingPhase1LiveAudienceCeiling } from "../src/lib/enterprise-marketing-engine/phase1-live-ceiling.ts";

for (const value of [undefined, "", "false", "0", "TRUE", " true ", "yes"]) {
  assert.equal(marketingGateEnabled(value), false);
}
assert.equal(marketingGateEnabled("true"), true);

const message = {
  to: "fixture@example.invalid", fromName: "Fixture", fromEmail: "fixture@example.invalid",
  replyTo: "fixture@example.invalid", subject: "Fixture", html: "<p>Fixture</p>",
  text: "Fixture", idempotencyKey: "fixture-only",
};
for (const gates of [
  { executionEnabled: false, providerConnectEnabled: false },
  { executionEnabled: false, providerConnectEnabled: true },
  { executionEnabled: true, providerConnectEnabled: false },
]) {
  let created = 0;
  const transport = createHostingerSmtpTransport({
    gates, env: {}, clientFactory: () => { created++; throw new Error("SMTP client must not be created"); },
  });
  const result = await transport.send(message);
  assert.equal(result.accepted, false);
  assert.equal(created, 0);
  if (!gates.providerConnectEnabled) {
    const verify = await transport.verify();
    assert.equal(verify.status, "BLOCKED");
    assert.equal(created, 0);
  }
  if (!gates.executionEnabled) {
    assert.throws(() => assertMarketingLiveExecutionGate(gates.executionEnabled), { code: "EME_SAFETY_BLOCKED" });
  }
}

assert.doesNotThrow(() => assertMarketingLiveExecutionGate(true));
const enabledTransport = createHostingerSmtpTransport({
  gates: { executionEnabled: true, providerConnectEnabled: true }, env: {},
  clientFactory: () => { throw new Error("No SMTP client expected without complete config"); },
});
assert.equal((await enabledTransport.send(message)).accepted, false, "SMTP config remains a downstream gate");
assert.throws(() => assertMarketingPhase1LiveAudienceCeiling(51), { code: "marketing.phase1.audience_limit_exceeded" });

const reviewInput = {
  campaign: {
    name: "Fixture", objective: "Fixture", channel: "EMAIL", sender: { fromName: "Fixture", fromAddress: "fixture@example.invalid" },
    routingPlaceholder: { ownerUserId: null }, schedulePlaceholder: { startAt: null },
    governance: { approvedByUserId: null, approvedAt: null },
  },
  version: { content: { blocks: [] }, subject: "Fixture", previewText: "", versionNumber: 1, immutable: false, trackingEnabled: false },
};
function field(review, label) { return review.fields.find((item) => item.label === label)?.value; }
const off = composeMarketingReadinessReview({ ...reviewInput, liveGates: { executionEnabled: false, providerConnectEnabled: false } });
const on = composeMarketingReadinessReview({ ...reviewInput, liveGates: { executionEnabled: true, providerConnectEnabled: true } });
assert.equal(field(off, "Live execution"), "OFF");
assert.equal(field(off, "Provider connect"), "OFF");
assert.match(field(off, "Email provider adapter"), /live gates OFF/);
assert.equal(field(on, "Live execution"), "ON");
assert.equal(field(on, "Provider connect"), "ON");
assert.match(field(on, "Email provider adapter"), /live gates ON/);
console.log("OK: fail-closed gate matrix, SMTP isolation, downstream checks, and dynamic readiness labels");
