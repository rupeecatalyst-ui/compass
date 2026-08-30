#!/usr/bin/env node
/** Every applicable COMPASS product public IDC projection contains canonical Expected CIBIL. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const { buildCompassJourneyConfig } = await import(
  "../server/services/compass-customer-gateway/compass-journey-config.service.ts"
);
const { COMPASS_ACTIVE_PRODUCT_CODES } = await import(
  "../src/constants/compass-customer-gateway/product-registry.ts"
);
const { APPROX_CIBIL_SCORE_OPTIONS } = await import("../src/constants/cibil-score-master.ts");

const CANONICAL_ID = "approxCibilScore";
const CANONICAL_LABEL = "Expected CIBIL Score";

for (const productCode of COMPASS_ACTIVE_PRODUCT_CODES) {
  const config = buildCompassJourneyConfig(productCode);
  const field = config.fields.find((f) => f.fieldId === CANONICAL_ID);
  assert.ok(field, `${productCode} must include ${CANONICAL_ID}`);
  assert.equal(field.label, CANONICAL_LABEL, `${productCode} CIBIL label`);
  assert.equal(field.fieldType, "select", `${productCode} CIBIL control`);
  const values = (field.options || []).map((o) => o.value);
  assert.ok(values.includes("not_known"), `${productCode} must preserve Not Known`);
  for (const option of APPROX_CIBIL_SCORE_OPTIONS) {
    assert.ok(values.includes(option.value), `${productCode} missing CIBIL option ${option.value}`);
  }
  assert.equal(values.length, APPROX_CIBIL_SCORE_OPTIONS.length, `${productCode} must not invent CIBIL options`);
}

const snapshot = readFileSync(
  join(process.cwd(), "src/constants/compass-customer-gateway/snapshot-answers.ts"),
  "utf8",
);
assert.match(snapshot, /approxCibilScore/);
const compassPersist = readFileSync(
  join(process.cwd(), "compass/src/config/compass-lending-products.ts"),
  "utf8",
);
assert.match(compassPersist, /approxCibilScore/);
const review = readFileSync(
  join(process.cwd(), "compass/src/components/home-loan-experience/discovery/discovery-review-step.tsx"),
  "utf8",
);
assert.match(review, /approxCibilScore/);
assert.doesNotMatch(review, /bureau-verified|verified CIBIL/i);

console.log("CO-COMPASS-EXPECTED-CIBIL-FIELD verify: PASS");
