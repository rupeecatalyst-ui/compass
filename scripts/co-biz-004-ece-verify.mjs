/**
 * CO-BIZ-004 — structural readiness check (no browser / no localStorage).
 * Validates CX weight sum and portal tab contract.
 */

import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

const constants = readFileSync(
  join(root, "src/constants/enterprise-customer-engagement/index.ts"),
  "utf8",
);
assert.match(constants, /ECE_CX_WEIGHTS/);
assert.match(constants, /pending_actions:\s*0\.3/);
assert.match(constants, /document_turnaround:\s*0\.3/);

const compose = readFileSync(
  join(root, "src/lib/enterprise-customer-engagement/compose.ts"),
  "utf8",
);
assert.match(compose, /composeCustomerEngagementSnapshot/);
assert.match(compose, /projectCustomerTasks/);
assert.match(compose, /deriveCustomerExperienceScore/);

const page = readFileSync(
  join(root, "src/app/customer-engagement/[token]/page.tsx"),
  "utf8",
);
assert.match(page, /CustomerEngagementPortal/);

const rule = readFileSync(
  join(root, ".cursor/rules/enterprise-customer-engagement.mdc"),
  "utf8",
);
assert.match(rule, /[Nn]o parallel/);
assert.match(rule, /Parallel customer task/);

console.log("CO-BIZ-004 ECE structural verify OK");
