#!/usr/bin/env node
/**
 * CO-PRODUCTION-REGRESSION-PREVENTION-014 — static framework verification.
 * No deploy · no production data · no browser required.
 */

import { existsSync, readFileSync } from "node:fs";
import path from "node:path";
import { CERT_ROOT } from "./_lib/cert-toolkit.mjs";

const root = CERT_ROOT;
const fail = (msg) => {
  console.error(`FAIL  ${msg}`);
  process.exitCode = 1;
};
const pass = (msg) => console.log(`PASS  ${msg}`);

const required = [
  "docs/co-production-regression-prevention-014/CO-PRODUCTION-REGRESSION-PREVENTION-014-FRAMEWORK.md",
  "docs/co-production-regression-prevention-014/DEPLOYMENT-CERTIFICATION-REPORT-TEMPLATE.md",
  "docs/co-production-regression-prevention-014/REGRESSION-BASELINE-538e733.md",
  "scripts/co-production-regression-014-clean-sha.mjs",
  "scripts/co-production-regression-014-shell-smoke.mjs",
  "scripts/co-production-regression-014-certify.mjs",
  "scripts/_lib/production-shell-metrics.mjs",
];

for (const rel of required) {
  if (!existsSync(path.join(root, rel))) fail(`missing ${rel}`);
  else pass(`exists ${rel}`);
}

const pkg = JSON.parse(readFileSync(path.join(root, "package.json"), "utf8"));
for (const script of [
  "cert:production-clean-sha",
  "cert:production-shell-smoke",
  "cert:production-regression-014",
  "verify:co-production-regression-014",
]) {
  if (!pkg.scripts?.[script]) fail(`package.json missing script ${script}`);
  else pass(`package.json script ${script}`);
}

const shell = readFileSync(
  path.join(root, "scripts/co-production-regression-014-shell-smoke.mjs"),
  "utf8",
);
for (const needle of [
  "CATALYST_BAT_EMAIL",
  "CATALYST_BAT_PASSWORD",
  "toastVisibleCount",
  "tickerOverlapsActions",
  "navigationFlow",
  "READY FOR PRODUCTION",
  "BLOCKED",
]) {
  if (!shell.includes(needle)) fail(`shell smoke missing ${needle}`);
  else pass(`shell smoke includes ${needle}`);
}

const clean = readFileSync(
  path.join(root, "scripts/co-production-regression-014-clean-sha.mjs"),
  "utf8",
);
if (!clean.includes("dirty_tracked")) fail("clean-sha missing dirty_tracked check");
else pass("clean-sha enforces committed SHA discipline");

const framework = readFileSync(
  path.join(
    root,
    "docs/co-production-regression-prevention-014/CO-PRODUCTION-REGRESSION-PREVENTION-014-FRAMEWORK.md",
  ),
  "utf8",
);
if (!framework.includes("538e733")) fail("framework missing baseline SHA");
else pass("framework documents baseline 538e733");
if (!framework.includes("BUILD PASS") || !framework.includes("PRODUCTION PASS")) {
  fail("framework missing build vs prod rule");
} else pass("framework states BUILD != PRODUCTION");

if (process.exitCode) {
  console.log("\nCO-PRODUCTION-REGRESSION-014 verify: FAIL");
} else {
  console.log("\nCO-PRODUCTION-REGRESSION-014 verify: PASS");
}
