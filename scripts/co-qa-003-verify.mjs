#!/usr/bin/env node
/**
 * CO-QA-003 — static engineering gate for lender search regression fix.
 * Does NOT satisfy CO-QA-001 Business Certification.
 */
import { readFileSync, existsSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];

function mustContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing file: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (!text.includes(needle)) failures.push(`${label ?? rel}: expected "${needle}"`);
}

function mustNotContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing file: ${rel}`);
    return;
  }
  const text = readFileSync(abs, "utf8");
  if (text.includes(needle)) failures.push(`${label ?? rel}: must not contain "${needle}"`);
}

mustContain("src/lib/api-client.ts", "flushTokenRefreshWaiters", "auth waiter flush");
mustContain(
  "src/lib/enterprise-lender-registry/published-directory.ts",
  "Session expired. Sign in again",
  "API error surfacing",
);
mustNotContain(
  "src/lib/enterprise-lender-registry/published-directory.ts",
  "if (!res.ok) return [];",
  "silent empty on !res.ok",
);
mustContain(
  "src/components/catalyst-one/opportunity-workspace/workspace-life-strategy-board.tsx",
  "registryError",
  "Manual column error state",
);
mustContain(
  "src/lib/deal-workspace/lender-program-api.ts",
  "authenticatedJsonFetch",
  "Deal lender search uses refresh-safe fetch",
);
mustContain("docs/co-qa-003/CO-QA-003-E2E-SCENARIO.md", "CO-QA-003-E2E-001", "E2E pack");

if (failures.length) {
  console.error("CO-QA-003 verify FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}
console.log(
  "CO-QA-003 verify PASS (engineering gate only — run CO-QA-003-E2E-001 on live app).",
);
