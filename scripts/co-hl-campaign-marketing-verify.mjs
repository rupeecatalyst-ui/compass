#!/usr/bin/env node
/** Stage 3 — bounded sheet ranges, consent fail-closed, resumable cursor. No live send. */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
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

const nearEnd = sheetsBoundedRanges("Home Loan", "299900", 100);
assert.equal(nearEnd.headerRange, "'Home Loan'!A1:ZZ1");
assert.equal(nearEnd.dataRange, "'Home Loan'!A299902:ZZ300001");
const following = sheetsBoundedRanges("Home Loan", "300000", 100);
assert.equal(following.dataRange, "'Home Loan'!A300002:ZZ300101");
assert.ok(!nearEnd.dataRange.includes("A1:ZZ299"));
assert.ok(!following.dataRange.includes("A2:"));

const adapter = readFileSync(
  "server/services/enterprise-marketing-engine/adapters/google-sheets.adapter.ts",
  "utf8",
);
assert.equal(adapter.includes("A1:ZZ${"), false);
assert.ok(adapter.includes("ranges.headerRange"));
assert.ok(adapter.includes("ranges.dataRange"));

function onePage(cursor, limit, total) {
  const start = cursor ? Number(cursor) : 0;
  const end = Math.min(start + limit, total);
  const bounded = sheetsBoundedRanges("Home Loan", cursor, limit);
  const rows = [];
  for (let index = start; index < end; index += 1) rows.push(index);
  return {
    rows,
    bounded,
    nextCursor: end < total ? String(end) : undefined,
  };
}

const seen = new Set();
const windows = [];
let cursor = "299800";
let pages = 0;
while (cursor && pages < 5) {
  const page = onePage(cursor, 100, 300000);
  assert.ok(page.rows.length <= 100);
  assert.ok(page.bounded.dataRange.length < 80);
  windows.push(page.bounded.dataRange);
  for (const row of page.rows) {
    assert.equal(seen.has(row), false);
    seen.add(row);
  }
  cursor = page.nextCursor;
  pages += 1;
}
assert.deepEqual(windows, [
  "'Home Loan'!A299802:ZZ299901",
  "'Home Loan'!A299902:ZZ300001",
]);
assert.equal(seen.size, 200);
assert.equal(pages, 2);
assert.equal(cursor, undefined);

assert.equal(marketingConsentDecision({ Consent: "Yes" }, "Consent"), "granted");
assert.equal(marketingConsentDecision({ Consent: "No" }, "Consent"), "denied");
assert.equal(marketingConsentDecision({ Consent: "" }, "Consent"), "missing");
assert.equal(marketingConsentDecision({}, null), "missing");

assert.equal(ENTERPRISE_MARKETING_EXECUTION_ENABLED, false);
assert.equal(ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED, false);

console.log("CO-HL-CAMPAIGN marketing verify: PASS");
