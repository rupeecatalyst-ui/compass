/**
 * ECC live-test classification and official logo rendering.
 * Does not open SMTP or send email.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
process.env.ECC_CUSTOMERS_SMTP_PASSWORD = process.env.ECC_CUSTOMERS_SMTP_PASSWORD || "test-only-not-a-secret";
const ts = (rel) => pathToFileURL(resolve(root, rel)).href;
const read = (rel) => readFileSync(resolve(root, rel), "utf8");

const live = await import(ts("server/services/enterprise-communication-center/ecc-live-test-email.service.ts"));
const probeMod = await import(ts("server/services/enterprise-communication-center/smtp-probe.service.ts"));
const render = await import(ts("src/lib/enterprise-marketing-engine/email-render.ts"));
const notSmtp = await probeMod.probeSmtpProfile({
  profileCode: "CHANNEL_PARTNERS",
  smtpProvider: "none",
  smtpHost: null,
  smtpPort: null,
  smtpUsername: null,
  active: true,
});
assert.equal(notSmtp.ok, false);
assert.match(notSmtp.message, /CHANNEL_PARTNERS provider is none, not smtp/);
const inactive = await probeMod.probeSmtpProfile({
  profileCode: "CUSTOMERS",
  smtpProvider: "smtp",
  smtpHost: "smtp.example",
  smtpPort: 465,
  smtpUsername: "connect@rupeecatalyst.com",
  active: false,
});
assert.match(inactive.message, /CUSTOMERS is inactive/);

assert.equal(live.assessEccLiveTestRequest({ role: "ADMIN", confirmationPhrase: "SEND TEST", recipientEmail: "a@example.com" }).code, "FORBIDDEN");
assert.equal(
  live.assessEccLiveTestRequest({ role: "SUPER_ADMIN", confirmationPhrase: "send test", recipientEmail: "a@example.com" }).code,
  "CONFIRMATION_REQUIRED",
);
assert.equal(
  live.assessEccLiveTestRequest({ role: "SUPER_ADMIN", confirmationPhrase: "SEND TEST", recipientEmail: "a@example.com,b@example.com" }).code,
  "RECIPIENT_REQUIRED",
);
assert.equal(
  live.assessEccLiveTestRequest({ role: "SUPER_ADMIN", confirmationPhrase: "SEND TEST", recipientEmail: "a@example.com" }).ok,
  true,
);
assert.equal(live.classifyOperationalSmtpSubmission({ ok: true, message: "accepted", smtpResponse: "250 OK" }), "submitted");
assert.equal(live.classifyOperationalSmtpSubmission({ ok: false, message: "SMTP send timed out", smtpResponse: null }), "ambiguous");
assert.equal(live.classifyOperationalSmtpSubmission({ ok: false, message: "550 mailbox unavailable", smtpResponse: null }), "failed");

let calls = 0;
const once = await live.runEccLiveTestEmail({
  profile: {
    profileCode: "CUSTOMERS",
    displayName: "Rupee Catalyst Connect",
    senderEmail: "connect@rupeecatalyst.com",
    replyToEmail: "connect@rupeecatalyst.com",
    smtpProvider: "smtp",
    smtpHost: "smtp.example",
    smtpPort: 465,
    smtpUsername: "connect@rupeecatalyst.com",
    active: true,
  },
  recipientEmail: "a@example.com",
  send: async () => {
    calls += 1;
    return { ok: false, message: "SMTP send timed out", smtpResponse: null };
  },
});
assert.equal(calls, 1);
assert.equal(once.outcome, "ambiguous");

const html = render.renderMarketingEmailHtml({
  content: {
    version: 1,
    blocks: [
      { id: "logo", type: "logo", props: { url: "", alt: "Rupee Catalyst" } },
      { id: "cta", type: "cta", props: { label: "Discover My Advantage", url: "https://rupeecatalyst.com/home-loan" } },
      { id: "unsub", type: "unsubscribe", props: { label: "Unsubscribe", href: "{{unsubscribeUrl}}" } },
    ],
  },
  subject: "Home Loan",
  previewText: "Your advantage",
  mode: "desktop",
});
assert.match(html, /\/brand\/rupee-catalyst-logo\.png/);
assert.match(html, /^[\s\S]*https?:\/\//);
assert.doesNotMatch(html, /src=""/);
assert.match(html, /Discover My Advantage/);
assert.match(html, /unsubscribeUrl/);
assert.match(html, /Your advantage/);

const route = read("src/app/api/admin/enterprise-communication/live-test/route.ts");
assert.match(route, /getStoredProfile/);
assert.doesNotMatch(route, /ensureProfilesSeeded|listProfiles/);
assert.match(route, /delivered: false/);
const simulation = read("src/app/api/admin/enterprise-communication/test-send/route.ts");
assert.match(simulation, /mode: "simulation"/);
assert.match(simulation, /status: "simulated"/);
const deal = read("server/services/enterprise-communication-center/operational-email-dispatch.service.ts");
assert.match(deal, /sendOperationalSmtpMessage/);
assert.match(deal, /profileCode === "CUSTOMERS"/);
assert.match(deal, /resolveSmtpSecret\("CUSTOMERS"\)/);
const probe = read("server/services/enterprise-communication-center/smtp-probe.service.ts");
assert.doesNotMatch(probe, /verificationStatus|VERIFIED/);
assert.match(probe, /provider is \$\{profile\.smtpProvider \|\| "unset"\}, not smtp/);
const panel = read("src/components/catalyst-one/admin/enterprise-communication/operational-email-activation-panel.tsx");
assert.match(panel, /profileCode: testProfile \|\| selectedCode \|\| "CUSTOMERS"/);
const admin = read("src/components/catalyst-one/admin/enterprise-communication/enterprise-communication-center-admin.tsx");
assert.match(admin, /p\.profileCode === "CUSTOMERS"/);

console.log("co-ecc-live-test-verify: PASS");
process.exit(0);
