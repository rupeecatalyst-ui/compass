#!/usr/bin/env node
/** COMPASS customer upload validation — policy + gateway enforcement. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateCompassCustomerUpload } from "../server/services/compass-customer-gateway/compass-upload-validation.ts";

const root = process.cwd();
const journey = readFileSync(
  join(root, "server/services/compass-customer-gateway/compass-journey.service.ts"),
  "utf8",
);
const route = readFileSync(join(root, "src/app/api/compass/journey/documents/route.ts"), "utf8");
const policy = readFileSync(
  join(root, "src/constants/compass-customer-gateway/upload-policy.ts"),
  "utf8",
);

assert.match(journey, /validateCompassCustomerUpload/);
assert.match(journey, /CompassUploadRejectedError/);
assert.match(journey, /compass-upload-rejected:/);
assert.match(route, /CompassUploadRejectedError/);

assert.match(policy, /COMPASS_CUSTOMER_BLOCKED_EXTENSIONS/);
assert.match(policy, /application\/pdf/);
assert.match(policy, /image\/jpeg/);

const pdfOk = validateCompassCustomerUpload({
  fileName: "statement.pdf",
  mimeType: "application/pdf",
  sizeBytes: 1024,
});
assert.equal(pdfOk.ok, true, "PDF should be allowed");

const pngOk = validateCompassCustomerUpload({
  fileName: "photo.png",
  mimeType: "image/png",
  sizeBytes: 2048,
});
assert.equal(pngOk.ok, true, "PNG should be allowed");

const exeBlocked = validateCompassCustomerUpload({
  fileName: "virus.exe",
  mimeType: "application/x-msdownload",
  sizeBytes: 64,
});
assert.equal(exeBlocked.ok, false, "EXE must be rejected");
assert.ok(exeBlocked.httpStatus >= 400 && exeBlocked.httpStatus < 500);

const emptyBlocked = validateCompassCustomerUpload({
  fileName: "empty.pdf",
  mimeType: "application/pdf",
  sizeBytes: 0,
});
assert.equal(emptyBlocked.ok, false, "Empty file must be rejected");
assert.equal(emptyBlocked.code, "EMPTY_FILE");

const mismatchBlocked = validateCompassCustomerUpload({
  fileName: "fake.pdf",
  mimeType: "image/png",
  sizeBytes: 128,
});
assert.equal(mismatchBlocked.ok, false, "MIME/extension mismatch must be rejected");
assert.equal(mismatchBlocked.code, "MIME_EXTENSION_MISMATCH");

console.log("CO-COMPASS-UPLOAD-VALIDATION verify: PASS");
