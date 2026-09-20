import assert from "node:assert/strict";
import test from "node:test";

import { classifyStatus } from "./prisma-migrate-status-build-probe.mjs";

const policyMigration = "20260917120000_co_credit_risk_policy_lifecycle_status";
const propertyMigration = "20260920160000_co_hl_property_model";
const unknownMigration = "20260921120000_unapproved_change";
const known = [policyMigration, propertyMigration, unknownMigration];

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
