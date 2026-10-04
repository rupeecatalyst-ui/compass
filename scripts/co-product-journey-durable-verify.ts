/**
 * Local durable-registry proof. Uses a file-backed store so two processes share
 * one book. It does not connect to the configured remote database and does not
 * create a Contact, Opportunity, Deal, Loan File, recommendation, or document.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import {
  previewProductJourney,
  publishProductJourney,
  recordMissingJourneyPin,
  resolvePublishedJourney,
  retireProductJourney,
  rollbackProductJourney,
  saveProductJourneyDraft,
  type JourneyDraft,
} from "../src/lib/product-journey/publication";
import { configureProductJourneyStore, createFileProductJourneyStore } from "../src/lib/product-journey/store";

const organizationId = "org-durable-proof";
const actorId = "proof-admin";
const productCode = "synthetic-lending-proof";

function draft(city: number, employment: number): JourneyDraft {
  return {
    productCode,
    productLabel: "Synthetic Lending Proof",
    lifecycle: "draft",
    previewed: false,
    publiclyEnabled: true,
    advantageEnabled: false,
    recommendationBinding: "unavailable",
    consentVersion: "synthetic-consent-v1",
    lodSource: "opportunity_lod",
    confirmation: { title: "Received", body: "No application was created." },
    stages: [
      { stageId: "mobile", kind: "mobile", label: "Mobile", sequence: 1 },
      { stageId: "name", kind: "name", label: "Name", sequence: 2 },
      { stageId: "about", kind: "questions", label: "About", sequence: 3 },
      { stageId: "email", kind: "email", label: "Email", sequence: 4 },
    ],
    fields: [
      { fieldId: "mobile", stageId: "mobile", label: "Mobile", fieldType: "mobile", required: true, sequence: 1, purpose: "identity" },
      { fieldId: "displayName", stageId: "name", label: "Name", fieldType: "short_text", required: true, sequence: 1, purpose: "identity" },
      { fieldId: "city", stageId: "about", label: "City", fieldType: "short_text", required: false, sequence: city, purpose: "application" },
      { fieldId: "employmentType", stageId: "about", label: "Employment", fieldType: "single_select", required: true, sequence: employment, purpose: "recommendation" },
      { fieldId: "personalEmail", stageId: "email", label: "Email", fieldType: "email", required: true, sequence: 1, purpose: "identity" },
    ],
  };
}

function configure(file: string) {
  configureProductJourneyStore("proof", createFileProductJourneyStore(file));
}

async function worker(file: string, command: string) {
  configure(file);
  if (command === "publish-v1") {
    await saveProductJourneyDraft(organizationId, draft(1, 2), actorId);
    await previewProductJourney(organizationId, productCode, {}, actorId);
    const published = await publishProductJourney(organizationId, productCode, actorId);
    assert.equal(published.ok, true);
    if (published.ok) assert.equal(published.journey.journeyVersion, 1);
  } else if (command === "read-effective") {
    const version = await resolvePublishedJourney(organizationId, productCode, null);
    assert.equal(version?.journeyVersion, 1);
  } else if (command === "publish-v2") {
    await saveProductJourneyDraft(organizationId, draft(2, 1), actorId);
    await previewProductJourney(organizationId, productCode, {}, actorId);
    const published = await publishProductJourney(organizationId, productCode, actorId);
    assert.equal(published.ok, true);
    if (published.ok) assert.equal(published.journey.journeyVersion, 2);
  } else if (command === "pin-v1-after-v2") {
    assert.equal((await resolvePublishedJourney(organizationId, productCode, null))?.journeyVersion, 2);
    assert.equal((await resolvePublishedJourney(organizationId, productCode, 1))?.journeyVersion, 1);
  } else if (command === "retire") {
    assert.equal((await retireProductJourney(organizationId, productCode, actorId)).ok, true);
    assert.equal(await resolvePublishedJourney(organizationId, productCode, null), null);
    assert.equal((await resolvePublishedJourney(organizationId, productCode, 1))?.journeyVersion, 1);
  } else if (command === "rollback") {
    const restored = await rollbackProductJourney(organizationId, productCode, 1, actorId);
    assert.equal(restored.ok, true);
    assert.equal((await resolvePublishedJourney(organizationId, productCode, null))?.journeyVersion, 1);
    assert.equal((await resolvePublishedJourney(organizationId, productCode, 2))?.lifecycle, "retired");
  } else if (command === "missing-pin") {
    await recordMissingJourneyPin({ organizationId, productCode, pinnedVersion: 99, actorId });
    assert.equal(await resolvePublishedJourney(organizationId, productCode, 99), null);
  } else {
    throw new Error(`Unknown command ${command}`);
  }
}

function runStep(file: string, command: string) {
  const tsxCli = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  const result = spawnSync(process.execPath, [tsxCli, process.argv[1], "worker", file, command], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });
  if (result.status !== 0) {
    throw new Error(`${command} failed\n${result.stdout}\n${result.stderr}`);
  }
}

async function main() {
  if (process.argv[2] === "worker") {
    await worker(process.argv[3], process.argv[4]);
    return;
  }

  const { requireProductRegistryAdmin } = await import("../src/lib/product-registry/admin-permission");
  assert.throws(() => requireProductRegistryAdmin({ role: "VIEWER" }));
  assert.throws(() => requireProductRegistryAdmin({ role: "MANAGER" }));
  requireProductRegistryAdmin({ role: "ADMIN" });
  requireProductRegistryAdmin({ role: "SUPER_ADMIN" });

  const file = join(mkdtempSync(join(tmpdir(), "journey-durable-")), "book.json");
  runStep(file, "publish-v1");
  runStep(file, "read-effective");
  runStep(file, "publish-v2");
  runStep(file, "pin-v1-after-v2");
  runStep(file, "retire");
  runStep(file, "rollback");
  runStep(file, "missing-pin");
  const stored = JSON.parse(readFileSync(file, "utf8")) as Record<string, { audits?: Array<{ action: string; version: number | null }> }>;
  const book = Object.values(stored)[0];
  assert.ok(book?.audits?.some((entry) => entry.action === "missing_pin" && entry.version === 99));
  assert.ok(book?.audits?.some((entry) => entry.action === "publish"));
  assert.ok(book?.audits?.some((entry) => entry.action === "rollback"));
  assert.ok(book?.audits?.some((entry) => entry.action === "retire"));
  console.log("PRODUCT_JOURNEY_DURABLE_VERIFY pass");
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
