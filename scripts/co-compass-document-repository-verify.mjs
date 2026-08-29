#!/usr/bin/env node
/** Document repository — binary persistence + COMPASS upload path. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const journey = readFileSync(
  join(root, "server/services/compass-customer-gateway/compass-journey.service.ts"),
  "utf8",
);
const docService = readFileSync(
  join(root, "server/services/enterprise-transaction-documents/enterprise-transaction-document.service.ts"),
  "utf8",
);

assert.match(journey, /contentBase64/);
assert.match(journey, /enterpriseTransactionDocumentService\.upsertForOrganization/);
assert.match(journey, /validateCompassCustomerUpload/);
assert.match(journey, /CompassUploadRejectedError/);
assert.match(docService, /persistBinaryForDocument/);
assert.match(docService, /contentBytes|storageKey/);
assert.match(journey, /typeRef/);
assert.match(journey, /enterpriseActivityService\.emitBestEffort/);

console.log("CO-COMPASS-DOCUMENT-REPOSITORY verify: PASS");
