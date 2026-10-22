#!/usr/bin/env node
/** Stage 3 — bounded sheet ranges, consent fail-closed, resumable cursor. No live send. */
import assert from "node:assert/strict";
import { sheetsBoundedRanges } from "../server/services/enterprise-marketing-engine/adapters/google-sheets.adapter.ts";
import { marketingConsentDecision } from "../src/lib/enterprise-marketing-engine/data-quality.ts";
import {
  ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED,
} from "../src/constants/enterprise-marketing-engine/safety.ts";

const far = sheetsBoundedRanges("Home Loan", "250000", 100);
assert.equal(far.headerRange, "'Home Loan'!A1:ZZ1");
assert.equal(far.dataRange, "'Home Loan'!A250002:ZZ250101");
assert.equal(far.dataRange.includes("A2:"), false);
assert.ok(!far.dataRange.includes("A1:ZZ250"));

assert.equal(marketingConsentDecision({ Consent: "Yes" }, "Consent"), "granted");
assert.equal(marketingConsentDecision({ Consent: "No" }, "Consent"), "denied");
assert.equal(marketingConsentDecision({ Consent: "" }, "Consent"), "missing");
assert.equal(marketingConsentDecision({}, null), "missing");

assert.equal(ENTERPRISE_MARKETING_EXECUTION_ENABLED, false);
assert.equal(ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED, false);

console.log("CO-HL-CAMPAIGN marketing verify: PASS");
