/**
 * CO-WP-OPP-REFINEMENT-001 — Opportunity Source Name Wealth Partner selectability.
 * Static + unit checks. No migrate / no deploy / no production data mutation.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

const { resolveWealthPartnerOpportunitySelectability } = await import(
  "../src/lib/enterprise-wealth-partner-legal-docket/compose.ts"
);
const {
  wealthPartnerLifecycleLabel,
  isWealthPartnerOpportunitySourceLifecycle,
  isWealthPartnerRegistryStatusSourceExcluded,
} = await import("../src/constants/enterprise-wealth-partner-registry/index.ts");

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

// --- A–D / E–I selectability matrix ---
const base = {
  operationalStatus: "active",
  agreementStatus: "not_started",
  registryStatus: "active",
  enabled: true,
};

for (const life of ["draft", "onboarding", "active"]) {
  const r = resolveWealthPartnerOpportunitySelectability({
    ...base,
    lifecycleStatus: life,
  });
  assert.notEqual(
    r.selectability,
    "not_selectable",
    `${life} must be selectable as Opportunity source`,
  );
  assert.ok(isWealthPartnerOpportunitySourceLifecycle(life));
}

for (const life of ["suspended", "retired"]) {
  const r = resolveWealthPartnerOpportunitySelectability({
    ...base,
    lifecycleStatus: life,
  });
  assert.equal(r.selectability, "not_selectable", `${life} must be excluded`);
}

assert.equal(
  resolveWealthPartnerOpportunitySelectability({
    ...base,
    lifecycleStatus: "active",
    registryStatus: "archived",
  }).selectability,
  "not_selectable",
);
assert.equal(
  resolveWealthPartnerOpportunitySelectability({
    ...base,
    lifecycleStatus: "active",
    registryStatus: "inactive",
  }).selectability,
  "not_selectable",
);
assert.equal(
  resolveWealthPartnerOpportunitySelectability({
    ...base,
    lifecycleStatus: "draft",
    enabled: false,
  }).selectability,
  "not_selectable",
);
assert.equal(
  resolveWealthPartnerOpportunitySelectability({
    ...base,
    lifecycleStatus: "onboarding",
    operationalStatus: "inactive",
  }).selectability,
  "not_selectable",
);
assert.equal(
  resolveWealthPartnerOpportunitySelectability({
    ...base,
    lifecycleStatus: "active",
    agreementStatus: "expired",
  }).selectability,
  "not_selectable",
);

assert.equal(wealthPartnerLifecycleLabel("draft"), "Draft");
assert.equal(wealthPartnerLifecycleLabel("onboarding"), "Onboarding");
assert.equal(wealthPartnerLifecycleLabel("active"), "Active");
assert.ok(isWealthPartnerRegistryStatusSourceExcluded("archived"));
assert.ok(isWealthPartnerRegistryStatusSourceExcluded("inactive"));
assert.ok(!isWealthPartnerRegistryStatusSourceExcluded("draft"));
assert.ok(!isWealthPartnerRegistryStatusSourceExcluded("active"));

// --- J payout protection unchanged ---
const commercial = read("src/lib/enterprise-commercial-participation/index.ts");
assert.match(commercial, /commercialStatus/);
assert.match(commercial, /status !== "active"/);
assert.ok(!commercial.includes("lifecycleStatus"));

const oppService = read("server/services/enterprise-opportunity/index.ts");
assert.match(oppService, /resolveCommercialRevenueSharePercent/);
assert.match(oppService, /commercialStatus: true/);

// --- L / M SSOT — lookup still uses Registry id, no free-text master ---
const lookup = read(
  "src/components/catalyst-one/lead-information/business-source-contact-lookup.tsx",
);
assert.match(lookup, /wealthPartnerId: option\.id/);
assert.match(lookup, /wealthPartnerLifecycleLabel/);
assert.match(lookup, /enabled:\s*true/);
assert.ok(!/status:\s*"active"/.test(lookup));
assert.match(lookup, /CO-WP-OPP-REFINEMENT-001/);

const compose = read(
  "src/lib/enterprise-wealth-partner-legal-docket/compose.ts",
);
assert.match(compose, /lifecycle === "draft"/);
assert.match(compose, /lifecycle === "onboarding"/);
assert.match(compose, /Payout remains subject/);

console.log("CO-WP-OPP-REFINEMENT-001 verify: PASS");
console.log(
  "A–D lifecycle matrix · E–I selectable draft/onboarding/active · J payout commercialStatus-only · L Registry SSOT",
);
console.log("NOTE: No deploy / no production data mutation.");
