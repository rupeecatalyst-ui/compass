import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import test from "node:test";

import { classifyStatus } from "./prisma-migrate-status-build-probe.mjs";

const policyMigration = "20260917120000_co_credit_risk_policy_lifecycle_status";
const propertyMigration = "20260920160000_co_hl_property_model";
const customFieldMigration = "20260927193000_field_control_classification_custom_field";
const placementValueMigration = "20260928140000_field_control_custom_placement_value";
const employmentApplicabilityMigration = "20260929180000_field_control_employment_applicability";
const canonicalFactsMigration = "20260930153000_opportunity_canonical_recommendation_facts";
const similarCanonicalFactsMigration = "20260930153000_opportunity_canonical_recommendation_facts_extra";
const canonicalFactsPrefixMigration = "20260930153000_opportunity_canonical_recommendation";
const canonicalFactsSuffixMigration = "20260930153000_opportunity_canonical_recommendation_facts_v2";
const similarEmploymentMigration = "20260929180000_field_control_employment_applicability_extra";
const similarPlacementMigration = "20260928140000_field_control_custom_placement_value_extra";
const placementPrefixMigration = "20260928140000_field_control_custom_placement";
const unknownMigration = "20260921120000_unapproved_change";
const known = [
  policyMigration,
  propertyMigration,
  customFieldMigration,
  placementValueMigration,
  employmentApplicabilityMigration,
  canonicalFactsMigration,
  similarCanonicalFactsMigration,
  canonicalFactsPrefixMigration,
  canonicalFactsSuffixMigration,
  similarEmploymentMigration,
  similarPlacementMigration,
  placementPrefixMigration,
  unknownMigration,
];
const probeSource = readFileSync(new URL("./prisma-migrate-status-build-probe.mjs", import.meta.url), "utf8");
const deploySource = readFileSync(new URL("./prisma-migrate-deploy-on-build.mjs", import.meta.url), "utf8");
const buildScript = JSON.parse(readFileSync(resolve(process.cwd(), "package.json"), "utf8")).scripts.build;

function approvedNames(source) {
  const block = source.match(/const APPROVED = new Set\(\[([\s\S]*?)\]\);/);
  assert.ok(block, "APPROVED set must remain an explicit string set");
  return [...block[1].matchAll(/"([^"]+)"/g)].map((match) => match[1]);
}

function pendingOutput(names) {
  return `${names.length} migrations have not yet been applied\n${names.join("\n")}\n`;
}

test("fully up-to-date migration state passes", () => {
  assert.deepEqual(classifyStatus("Database schema is up to date", 0, known), {
    kind: "UP_TO_DATE",
    pending: [],
  });
});

test("the approved Product Programme migration is explicitly accepted", () => {
  assert.deepEqual(classifyStatus(pendingOutput([propertyMigration]), 1, known), {
    kind: "APPROVED_PENDING_ONLY",
    pending: [propertyMigration],
  });
});

test("multiple explicitly approved migrations are accepted", () => {
  assert.deepEqual(
    classifyStatus(pendingOutput([policyMigration, propertyMigration]), 1, known),
    { kind: "APPROVED_PENDING_ONLY", pending: [policyMigration, propertyMigration] },
  );
});

test("unknown and mixed pending migrations fail closed", () => {
  assert.equal(classifyStatus(pendingOutput([unknownMigration]), 1, known).kind, "OTHER_PENDING");
  assert.equal(
    classifyStatus(pendingOutput([propertyMigration, unknownMigration]), 1, known).kind,
    "OTHER_PENDING",
  );
});

test("failed and divergent migration histories fail closed", () => {
  assert.equal(classifyStatus("P3009: failed migrations found", 1, known).kind, "FAILED_HISTORY");
  assert.equal(
    classifyStatus("Migration history is divergent from the database", 1, known).kind,
    "DIVERGED_HISTORY",
  );
});

test("classification never returns raw Prisma output or credentials", () => {
  const secret = "postgresql://user:password@private-host/database";
  const result = classifyStatus(`P1001: can't reach database ${secret}`, 1, known);
  assert.deepEqual(result, { kind: "PROBE_UNAVAILABLE", pending: [] });
  assert.equal(JSON.stringify(result).includes(secret), false);
});

test("approved set is exactly the reviewed migration names", () => {
  assert.deepEqual(approvedNames(probeSource), [
    policyMigration,
    propertyMigration,
    customFieldMigration,
    placementValueMigration,
    employmentApplicabilityMigration,
    canonicalFactsMigration,
  ]);
  assert.equal(probeSource.includes(`${customFieldMigration.slice(0, 8)}*`), false);
  assert.equal(probeSource.includes(`${placementValueMigration.slice(0, 8)}*`), false);
  assert.equal(probeSource.includes("2026092814*"), false);
  assert.match(probeSource, /pending\.every\(\(name\) => APPROVED\.has\(name\)\)/);
  assert.doesNotMatch(probeSource, /APPROVED\.has\(name\.(?:slice|startsWith|endsWith)\)/);
});

test("the approved custom field migration is explicitly accepted", () => {
  assert.deepEqual(classifyStatus(pendingOutput([customFieldMigration]), 1, known), {
    kind: "APPROVED_PENDING_ONLY",
    pending: [customFieldMigration],
  });
});

test("one unapproved migration beside the custom field migration fails closed", () => {
  assert.equal(
    classifyStatus(pendingOutput([customFieldMigration, unknownMigration]), 1, known).kind,
    "OTHER_PENDING",
  );
});

test("exact pending placement value migration returns approved pending only", () => {
  assert.deepEqual(classifyStatus(pendingOutput([placementValueMigration]), 1, known), {
    kind: "APPROVED_PENDING_ONLY",
    pending: [placementValueMigration],
  });
});

test("placement value migration beside an unknown migration fails closed", () => {
  assert.equal(
    classifyStatus(pendingOutput([placementValueMigration, unknownMigration]), 1, known).kind,
    "OTHER_PENDING",
  );
});

test("exact pending employment applicability migration returns approved pending only", () => {
  assert.deepEqual(classifyStatus(pendingOutput([employmentApplicabilityMigration]), 1, known), {
    kind: "APPROVED_PENDING_ONLY",
    pending: [employmentApplicabilityMigration],
  });
});

test("employment applicability migration beside an unknown migration fails closed", () => {
  assert.equal(
    classifyStatus(pendingOutput([employmentApplicabilityMigration, unknownMigration]), 1, known).kind,
    "OTHER_PENDING",
  );
});

test("exact pending canonical facts migration returns approved pending only", () => {
  assert.deepEqual(classifyStatus(pendingOutput([canonicalFactsMigration]), 1, known), {
    kind: "APPROVED_PENDING_ONLY",
    pending: [canonicalFactsMigration],
  });
});

test("canonical facts migration beside an unknown migration fails closed", () => {
  assert.equal(
    classifyStatus(pendingOutput([canonicalFactsMigration, unknownMigration]), 1, known).kind,
    "OTHER_PENDING",
  );
});

test("a similarly named canonical facts migration does not pass", () => {
  assert.equal(classifyStatus(pendingOutput([similarCanonicalFactsMigration]), 1, known).kind, "OTHER_PENDING");
});

test("a canonical facts prefix or suffix does not pass", () => {
  assert.equal(classifyStatus(pendingOutput([canonicalFactsPrefixMigration]), 1, known).kind, "OTHER_PENDING");
  assert.equal(classifyStatus(pendingOutput([canonicalFactsSuffixMigration]), 1, known).kind, "OTHER_PENDING");
  assert.equal(
    approvedNames(probeSource).some(
      (name) => name.startsWith("20260930153000") && name !== canonicalFactsMigration,
    ),
    false,
  );
});

test("a similarly named employment applicability migration does not pass", () => {
  assert.equal(classifyStatus(pendingOutput([similarEmploymentMigration]), 1, known).kind, "OTHER_PENDING");
});

test("a similarly named migration does not pass", () => {
  assert.equal(classifyStatus(pendingOutput([similarPlacementMigration]), 1, known).kind, "OTHER_PENDING");
});

test("a date or prefix match does not pass", () => {
  assert.equal(classifyStatus(pendingOutput([placementPrefixMigration]), 1, known).kind, "OTHER_PENDING");
  assert.equal(
    approvedNames(probeSource).some((name) => name.startsWith("20260928140000") && name !== placementValueMigration),
    false,
  );
});

test("migration deploy remains controlled solely by the build flag", () => {
  assert.match(deploySource, /const enabled = gate === "true" \|\| gate === "1"/);
  assert.match(deploySource, /if \(!enabled\)/);
  assert.doesNotMatch(deploySource, /field_control_custom_placement_value/);
  assert.doesNotMatch(probeSource, /PRISMA_MIGRATE_DEPLOY_ON_BUILD\s*=/);
  assert.doesNotMatch(buildScript, /PRISMA_MIGRATE_DEPLOY_ON_BUILD\s*=\s*true/);
});

test("pending-count mismatch and authentication failure fail closed", () => {
  assert.equal(
    classifyStatus(`2 migrations have not yet been applied\n${customFieldMigration}\n`, 1, known).kind,
    "UNCLASSIFIED",
  );
  assert.equal(classifyStatus("P1000 authentication failed for database role postgres", 1, known).kind, "PROBE_UNAVAILABLE");
  assert.equal(classifyStatus("Environment variable not found: DIRECT_URL", 1, known).kind, "PROBE_UNAVAILABLE");
});

test("status probe stays read-only and deploy stays gated behind it", () => {
  assert.match(probeSource, /prismaCli, "migrate", "status"/);
  assert.doesNotMatch(probeSource, /migrate deploy|migrate", "deploy"|db push|migrate reset|migrate dev/);
  assert.match(
    probeSource,
    /classification\.kind === "UP_TO_DATE" \|\| classification\.kind === "APPROVED_PENDING_ONLY" \? 0 : 1/,
  );

  const probeAt = buildScript.indexOf("node scripts/prisma-migrate-status-build-probe.mjs");
  const deployAt = buildScript.indexOf("node scripts/prisma-migrate-deploy-on-build.mjs");
  const nextAt = buildScript.indexOf("next build");
  assert.equal(buildScript.startsWith("prisma generate &&"), true);
  assert.ok(probeAt > 0 && deployAt > probeAt && nextAt > deployAt);

  const unchanged = spawnSync(
    "git",
    ["diff", "--numstat", "--", "package.json", "scripts/prisma-migrate-deploy-on-build.mjs"],
    { encoding: "utf8" },
  );
  assert.equal(unchanged.status, 0);
  assert.equal(unchanged.stdout.trim(), "");
  assert.match(deploySource, /gate === "true" \|\| gate === "1"/);
  assert.doesNotMatch(buildScript, /PRISMA_MIGRATE_DEPLOY_ON_BUILD\s*=\s*true/);
  assert.doesNotMatch(probeSource, /PRISMA_MIGRATE_DEPLOY_ON_BUILD\s*=/);
  assert.doesNotMatch(deploySource, /custom_field|field_control_classification_custom_field/);
});
