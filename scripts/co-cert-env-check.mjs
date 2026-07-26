#!/usr/bin/env node
/**
 * CO-CERT-005 — Script 1: Infrastructure / Environment Certification
 * Never prints secret values.
 *
 * Usage: node scripts/co-cert-env-check.mjs
 */

import {
  exitCode,
  overallFromResults,
  printGateRow,
  printSection,
  validateConnectionVar,
  validateExact,
  validateSecret,
} from "./_lib/cert-toolkit.mjs";

printSection("Infrastructure Certification");

const checks = [
  ["JWT_SECRET", validateSecret("JWT_SECRET", { minLength: 32, mustDifferFrom: "JWT_REFRESH_SECRET" })],
  [
    "JWT_REFRESH_SECRET",
    validateSecret("JWT_REFRESH_SECRET", { minLength: 32, mustDifferFrom: "JWT_SECRET" }),
  ],
  ["DATABASE_URL", validateConnectionVar("DATABASE_URL")],
  ["DIRECT_URL", validateConnectionVar("DIRECT_URL")],
  [
    "NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE",
    validateExact("NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE", "prisma"),
  ],
];

for (const [label, result] of checks) {
  printGateRow(label, result);
}

const overall = overallFromResults(checks.map(([, r]) => r));
printSection("Overall Result");
console.log(overall);

process.exit(exitCode(overall));
