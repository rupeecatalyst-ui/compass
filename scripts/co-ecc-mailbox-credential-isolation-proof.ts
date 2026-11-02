/**
 * Local mocked proof for mailbox SMTP credential isolation.
 * Uses fixture strings only. Never prints secret values.
 */
import { readFileSync } from "node:fs";
import { MARKETING_SMTP_ENV } from "@/constants/enterprise-marketing-engine/hostinger-smtp";
import { INBOUND_EMAIL_IMAP_PASSWORD_ENV } from "@/lib/enterprise-inbound-email/imap-secret-resolver";
import {
  resolveSmtpSecret,
  smtpSecretEnvName,
} from "@/lib/enterprise-communication-center/smtp-secret-resolver";
import { probeSmtpProfile } from "@server/services/enterprise-communication-center/smtp-probe.service";
import { createHostingerSmtpEmailDeliveryPort } from "@server/services/enterprise-marketing-engine/adapters/hostinger-smtp.adapter";
import { createHostingerSmtpTransport } from "@server/services/enterprise-marketing-engine/adapters/hostinger-smtp-transport";
import type { MarketingEmailDeliveryRequest } from "@/types/enterprise-marketing-email-delivery";

const CUSTOMERS_FIXTURE = "fixture-customers-credential";
const OPPORTUNITIES_FIXTURE = "fixture-opportunities-credential";
const SHARED_FIXTURE = "fixture-shared-marketing-credential";
const CUSTOMERS_KEY = "ECC_CUSTOMERS_SMTP_PASSWORD";
const OPPORTUNITIES_KEY = "ECC_MAILBOX_OPPORTUNITIES_SMTP_PASSWORD";
const OPPORTUNITIES_ADDRESS = "opportunities@rupeecatalyst.com";

function assertOk(label: string, ok: boolean): void {
  if (!ok) throw new Error(label);
  console.log(`ok ${label}`);
}

function containsFixture(value: unknown): boolean {
  const text = JSON.stringify(value);
  return (
    text.includes(CUSTOMERS_FIXTURE) ||
    text.includes(OPPORTUNITIES_FIXTURE) ||
    text.includes(SHARED_FIXTURE)
  );
}

const saved = new Map<string, string | undefined>([
  [CUSTOMERS_KEY, process.env[CUSTOMERS_KEY]],
  [OPPORTUNITIES_KEY, process.env[OPPORTUNITIES_KEY]],
  [MARKETING_SMTP_ENV.password, process.env[MARKETING_SMTP_ENV.password]],
]);

function restoreEnv(): void {
  for (const [key, value] of saved) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

async function main(): Promise<void> {
  process.env[CUSTOMERS_KEY] = CUSTOMERS_FIXTURE;
  process.env[OPPORTUNITIES_KEY] = OPPORTUNITIES_FIXTURE;
  process.env[MARKETING_SMTP_ENV.password] = SHARED_FIXTURE;

  assertOk("customers env name", smtpSecretEnvName("CUSTOMERS") === CUSTOMERS_KEY);
  assertOk(
    "opportunities env name",
    smtpSecretEnvName("MAILBOX_OPPORTUNITIES") === OPPORTUNITIES_KEY,
  );
  assertOk(
    "customers resolves its own credential",
    resolveSmtpSecret("CUSTOMERS") === CUSTOMERS_FIXTURE,
  );
  assertOk(
    "opportunities resolves its own credential",
    resolveSmtpSecret("MAILBOX_OPPORTUNITIES") === OPPORTUNITIES_FIXTURE,
  );
  assertOk(
    "customers cannot read the opportunities credential",
    resolveSmtpSecret("CUSTOMERS") !== OPPORTUNITIES_FIXTURE,
  );
  assertOk(
    "opportunities cannot read the customers credential",
    resolveSmtpSecret("MAILBOX_OPPORTUNITIES") !== CUSTOMERS_FIXTURE,
  );

  const senderMatch = {
    fromEmail: OPPORTUNITIES_ADDRESS,
    fromName: "Rupee Catalyst",
    replyTo: OPPORTUNITIES_ADDRESS,
  };
  const projected = {
    [MARKETING_SMTP_ENV.host]: "smtp.hostinger.com",
    [MARKETING_SMTP_ENV.port]: "465",
    [MARKETING_SMTP_ENV.secure]: "true",
    [MARKETING_SMTP_ENV.username]: OPPORTUNITIES_ADDRESS,
    [MARKETING_SMTP_ENV.password]: resolveSmtpSecret("MAILBOX_OPPORTUNITIES") ?? "",
    [MARKETING_SMTP_ENV.fromEmail]: OPPORTUNITIES_ADDRESS,
    [MARKETING_SMTP_ENV.fromName]: "Rupee Catalyst",
    [MARKETING_SMTP_ENV.replyTo]: OPPORTUNITIES_ADDRESS,
  };
  let capturedPass = "";
  let capturedUser = "";
  const transport = createHostingerSmtpTransport({
    env: projected,
    gates: { executionEnabled: true, providerConnectEnabled: true },
    senderMatch,
    clientFactory: (input) => {
      capturedUser = input.auth.user;
      capturedPass = input.auth.pass;
      return { sendMail: async () => ({ messageId: "mock" }), verify: async () => true };
    },
  });
  const verified = await transport.verify();
  assertOk("mocked smtp probe connected", verified.status === "CONNECTED");
  assertOk("mocked send authenticates as opportunities", capturedUser === OPPORTUNITIES_ADDRESS);
  assertOk("mocked send uses the opportunities credential", capturedPass === OPPORTUNITIES_FIXTURE);
  assertOk("mocked send does not use the customers credential", capturedPass !== CUSTOMERS_FIXTURE);
  assertOk("mocked send does not use the shared marketing credential", capturedPass !== SHARED_FIXTURE);
  assertOk("reply-to stays the opportunities address", projected[MARKETING_SMTP_ENV.replyTo] === OPPORTUNITIES_ADDRESS);

  delete process.env[OPPORTUNITIES_KEY];
  assertOk("missing opportunities credential resolves empty", resolveSmtpSecret("MAILBOX_OPPORTUNITIES") === null);
  assertOk("customers credential remains after opportunities is removed", resolveSmtpSecret("CUSTOMERS") === CUSTOMERS_FIXTURE);

  const missing = await probeSmtpProfile({
    profileCode: "MAILBOX_OPPORTUNITIES",
    smtpProvider: "smtp",
    smtpHost: "smtp.hostinger.com",
    smtpPort: 465,
    smtpUsername: OPPORTUNITIES_ADDRESS,
    active: true,
  });
  assertOk("smtp probe fails closed when the opportunities credential is missing", missing.ok === false && missing.credentialSource === "missing");
  assertOk("smtp probe payload contains no fixture secrets", !containsFixture(missing));

  let fallbackCalled = false;
  const closed = createHostingerSmtpEmailDeliveryPort({
    smtpEnv: {},
    senderMatch,
    gates: { executionEnabled: true, providerConnectEnabled: true },
    transport: createHostingerSmtpTransport({
      env: {},
      gates: { executionEnabled: true, providerConnectEnabled: true },
      senderMatch,
      clientFactory: () => {
        fallbackCalled = true;
        return { sendMail: async () => ({ messageId: "should-not-send" }), verify: async () => true };
      },
    }),
  });
  const failed = await closed.deliver({ idempotencyKey: "missing-opportunities" } as MarketingEmailDeliveryRequest);
  assertOk("missing opportunities credential does not send", failed.outcome === "FAILED" && fallbackCalled === false);
  assertOk("failed delivery payload contains no fixture secrets", !containsFixture(failed));

  const projectionSource = readFileSync(
    "server/services/enterprise-marketing-engine/operational-mailbox-smtp.ts",
    "utf8",
  );
  assertOk(
    "marketing projection resolves the selected profile",
    projectionSource.includes("resolveSmtpSecret(row.profileCode)") &&
      projectionSource.includes("sender.replyTo?.trim() || row.replyToEmail?.trim()"),
  );
  const deliverySource = readFileSync(
    "server/services/enterprise-marketing-engine/email-delivery.service.ts",
    "utf8",
  );
  assertOk(
    "selected sender does not fall back to process environment",
    !deliverySource.includes("createHostingerSmtpTransport({ gates: productionGates, senderMatch })") &&
      !deliverySource.includes("createHostingerSmtpTransport({ gates: controlledGates, senderMatch })") &&
      deliverySource.includes("providerProfileId: byId.providerMapping.providerProfileId"),
  );
  const uiSource = readFileSync(
    "src/components/catalyst-one/admin/enterprise-communication/enterprise-communication-center-admin.tsx",
    "utf8",
  );
  assertOk(
    "credential label follows the selected profile",
    uiSource.includes("smtpSecretEnvName(draft.profileCode") &&
      !uiSource.includes("Configure ECC_CUSTOMERS_SMTP_PASSWORD"),
  );
  const imapSource = readFileSync("src/lib/enterprise-inbound-email/imap-secret-resolver.ts", "utf8");
  assertOk(
    "inbound imap still uses one password variable",
    INBOUND_EMAIL_IMAP_PASSWORD_ENV === "INBOUND_EMAIL_IMAP_PASSWORD" &&
      imapSource.includes('export const INBOUND_EMAIL_IMAP_PASSWORD_ENV = "INBOUND_EMAIL_IMAP_PASSWORD"'),
  );

  console.log("co-ecc-mailbox-credential-isolation-proof: ok");
}

main()
  .catch((error: unknown) => {
    const message = error instanceof Error ? error.message : "proof failed";
    console.error(message);
    process.exitCode = 1;
  })
  .finally(restoreEnv);
