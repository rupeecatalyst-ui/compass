/**
 * CO-C1-COMMUNICATION-001 — static verification for unified transaction email architecture.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const checks = [
  ["unified dispatch", read("server/services/enterprise-communication-center/operational-email-dispatch.service.ts"), "dispatchOperationalTransactionEmail"],
  ["mandatory RM router", read("src/lib/enterprise-communication-center/recipient-router.ts"), "resolveMandatoryManagerCc"],
  ["transaction router loader", read("server/services/enterprise-communication-center/recipient-router.service.ts"), "loadAndResolveTransactionOperationalRecipients"],
  ["transaction email send api", read("src/app/api/enterprise-transaction-email/send/route.ts"), "dispatchOperationalTransactionEmail"],
  ["transaction email preview api", read("src/app/api/enterprise-transaction-email/preview/route.ts"), "previewOperationalTransactionEmail"],
  ["client transaction email api", read("src/lib/enterprise-communication-center/operational-transaction-email-api.ts"), "sendTransactionOperationalEmail"],
  ["action center server send", read("src/components/catalyst-one/action-center/workspaces/email-context-workspace.tsx"), "sendTransactionOperationalEmail"],
  ["outbox email retired", read("src/components/catalyst-one/action-center/enterprise-outbox-provider.tsx"), "Email outbox retired"],
  ["smtp message-id", read("server/services/enterprise-communication-center/smtp-transport.service.ts"), "Message-ID:"],
  ["ene transaction sent", read("src/types/enterprise-notification-engine.ts"), "TRANSACTION_EMAIL_SENT"],
  ["document request uses unified", read("server/services/enterprise-communication-center/operational-email-dispatch.service.ts"), "dispatchOperationalTransactionEmail"],
];

let failed = 0;
for (const [label, content, needle] of checks) {
  if (!content.includes(needle)) {
    console.error(`FAIL  ${label} missing ${needle}`);
    failed++;
  } else {
    console.log(`PASS  ${label}`);
  }
}

const outbox = read("src/components/catalyst-one/action-center/enterprise-outbox-provider.tsx");
if (outbox.includes('simulateEnceCommunication') && outbox.includes('message.channel === "email"') && !outbox.includes("Email outbox retired")) {
  console.error("FAIL  outbox still simulates email");
  failed++;
} else {
  console.log("PASS  outbox does not simulate transactional email");
}

if (failed) {
  console.error(`\nCO-C1-COMMUNICATION-001: FAIL (${failed})`);
  process.exit(1);
}
console.log("\nCO-C1-COMMUNICATION-001: PASS");
