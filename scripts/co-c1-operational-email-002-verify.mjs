/**
 * CO-C1-OPERATIONAL-EMAIL-002 — static verification for server-side document request email path.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

const checks = [
  ["operational delivery gate", read("src/constants/enterprise-communication-center/operational-delivery.ts"), "ECC_OPERATIONAL_SMTP_DELIVERY_ENABLED"],
  ["shared smtp transport", read("server/services/enterprise-communication-center/smtp-transport.service.ts"), "sendOperationalSmtpMessage"],
  ["operational dispatch service", read("server/services/enterprise-communication-center/operational-email-dispatch.service.ts"), "dispatchDocumentRequestOperationalEmail"],
  ["recipient router loader", read("server/services/enterprise-communication-center/recipient-router.service.ts"), "loadAndResolveCustomerFacingRecipients"],
  ["preview api route", read("src/app/api/enterprise-opportunities/[opportunityId]/document-request/operational-email/preview/route.ts"), "previewDocumentRequestOperationalEmail"],
  ["send api route", read("src/app/api/enterprise-opportunities/[opportunityId]/document-request/operational-email/send/route.ts"), "dispatchDocumentRequestOperationalEmail"],
  ["client api", read("src/lib/document-requests/operational-email-api.ts"), "sendDocumentRequestOperationalEmail"],
  ["document panel uses server send", read("src/components/catalyst-one/opportunity-workspace/workspace-document-requests-panel.tsx"), "sendDocumentRequestOperationalEmail"],
  ["email_failed kind", read("src/types/document-requests.ts"), "email_failed"],
  ["smoke test reuses transport", read("server/services/enterprise-communication-center/smtp-smoke-test.service.ts"), "sendOperationalSmtpMessage"],
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

if (failed) {
  console.error(`\nCO-C1-OPERATIONAL-EMAIL-002: FAIL (${failed})`);
  process.exit(1);
}
console.log("\nCO-C1-OPERATIONAL-EMAIL-002: PASS");
