#!/usr/bin/env node
/**
 * CO-COMPASS-PRE-STAGING-001 — consolidated engineering gate runner.
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const scripts = [
  "co-compass-customer-gateway-verify.mjs",
  "co-compass-product-routing-verify.mjs",
  "co-compass-journey-config-authority-verify.mjs",
  "co-compass-recommendation-authority-verify.mjs",
  "co-compass-advantage-boundary-verify.mjs",
  "co-compass-advantage-commercial-verify.mjs",
  "co-compass-submission-handoff-verify.mjs",
  "co-compass-upload-validation-verify.mjs",
  "co-compass-document-repository-verify.mjs",
  "co-compass-route-legal-seo-verify.mjs",
  "co-compass-products-page-verify.mjs",
  "co-compass-requested-amount-limits-verify.mjs",
  "co-compass-income-conditionality-verify.mjs",
  "co-compass-expected-cibil-field-verify.mjs",
  "co-compass-opportunity-registry-visibility-verify.mjs",
  "co-compass-contact-information-verify.mjs",
];

let failed = false;
for (const script of scripts) {
  const path = join(root, "scripts", script);
  if (!existsSync(path)) {
    console.error(`Missing verifier: ${script}`);
    failed = true;
    continue;
  }
  const needsTsx = /authority|advantage|upload-validation|product-routing|products-page|requested-amount|income-conditionality|expected-cibil/.test(script);
  const args = needsTsx ? ["--import", "tsx", path] : [path];
  const result = spawnSync(process.execPath, args, { stdio: "inherit", cwd: root });
  if (result.status !== 0) failed = true;
}

const pwa = join(root, "compass", "scripts", "co-compass-pwa-verify.mjs");
if (existsSync(pwa)) {
  const result = spawnSync(process.execPath, [pwa], { stdio: "inherit", cwd: join(root, "compass") });
  if (result.status !== 0) failed = true;
}

if (failed) {
  console.error("CO-COMPASS-PRE-STAGING-001: FAIL");
  process.exit(1);
}
console.log("CO-COMPASS-PRE-STAGING-001: PASS");
