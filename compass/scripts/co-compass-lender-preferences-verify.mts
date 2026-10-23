import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  lenderPreferencesFromAnswers,
  parseLenderPreferences,
  toggleLenderPreference,
  type LenderPreference,
} from "../src/lib/lender-preferences.ts";

const hdfc: LenderPreference = { lenderRef: "lender:hdfc", lenderName: "HDFC Bank", programmeRef: "prog-hdfc" };
const icici: LenderPreference = { lenderRef: "lender:icici", lenderName: "ICICI Bank", programmeRef: "prog-icici" };
const sbi: LenderPreference = { lenderRef: "lender:sbi", lenderName: "State Bank of India", programmeRef: "prog-sbi" };
const axis: LenderPreference = { lenderRef: "lender:axis", lenderName: "Axis Bank", programmeRef: "prog-axis" };

const first = toggleLenderPreference([], hdfc);
assert.equal(first.status, "selected");
const second = toggleLenderPreference(first.preferences, icici);
const third = toggleLenderPreference(second.preferences, sbi);
assert.deepEqual(third.preferences.map((item) => item.lenderName), ["HDFC Bank", "ICICI Bank", "State Bank of India"]);
const blocked = toggleLenderPreference(third.preferences, axis);
assert.equal(blocked.status, "limit");
assert.equal(blocked.preferences.length, 3);
const removed = toggleLenderPreference(third.preferences, hdfc);
assert.equal(removed.status, "removed");
assert.deepEqual(removed.preferences.map((item) => item.lenderName), ["ICICI Bank", "State Bank of India"]);

assert.deepEqual(
  lenderPreferencesFromAnswers({
    selectedLenderRef: "lender:hdfc",
    selectedLenderName: "HDFC Bank",
    selectedProgrammeRef: "prog-hdfc",
  }).map((item) => item.lenderName),
  ["HDFC Bank"],
);
assert.deepEqual(parseLenderPreferences("[]"), []);
assert.equal(parseLenderPreferences("{").length, 0);

const lenders = readFileSync("src/components/home-loan-experience/discovery/discovery-lenders-step.tsx", "utf8");
assert.match(lenders, /Preference \{preference\}/);
assert.match(lenders, /You can choose up to three lenders/);
assert.match(lenders, /text-accent/);
assert.match(lenders, /sm:grid-cols-3/);
assert.match(lenders, /sm:text-base/);

console.log("co-compass-lender-preferences-verify: pass");
