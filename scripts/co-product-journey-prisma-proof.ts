/**
 * Isolated Postgres proof. The caller must point DATABASE_URL and DIRECT_URL at
 * the local throwaway cluster. This script does not create a Contact,
 * Opportunity, Deal, Loan File, recommendation, or document.
 */
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";
import { join } from "node:path";
import { prisma } from "../server/lib/prisma";
import {
  previewProductJourney,
  publishProductJourney,
  resolvePublishedJourney,
  saveProductJourneyDraft,
  type JourneyDraft,
} from "../src/lib/product-journey/publication";

const actorId = "proof-admin";
const productCode = "synthetic-postgres-proof";

function draft(): JourneyDraft {
  return {
    productCode,
    productLabel: "Synthetic Postgres Proof",
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
      { stageId: "email", kind: "email", label: "Email", sequence: 2 },
    ],
    fields: [
      { fieldId: "mobile", stageId: "mobile", label: "Mobile", fieldType: "mobile", required: true, sequence: 1, purpose: "identity" },
      { fieldId: "personalEmail", stageId: "email", label: "Email", fieldType: "email", required: true, sequence: 1, purpose: "identity" },
    ],
  };
}

async function counts() {
  const [contacts, opportunities, deals, documents] = await Promise.all([
    prisma.ecmContact.count(),
    prisma.enterpriseOpportunity.count(),
    prisma.enterpriseDeal.count(),
    prisma.enterpriseTransactionDocument.count(),
  ]);
  return { contacts, opportunities, deals, documents };
}

async function main() {
  if (process.argv[2] === "read") {
    const organizationId = process.argv[3];
    const version = await resolvePublishedJourney(organizationId, productCode, null);
    assert.equal(version?.journeyVersion, 1);
    assert.equal(version?.configurationHash?.length, 64);
    return;
  }

  const before = await counts();
  const org = await prisma.organization.create({
    data: { slug: "journey-registry-proof", name: "Journey Registry Proof" },
  });
  await saveProductJourneyDraft(org.id, draft(), actorId);
  await previewProductJourney(org.id, productCode, {}, actorId);
  const published = await publishProductJourney(org.id, productCode, actorId);
  assert.equal(published.ok, true);

  const tsxCli = join(process.cwd(), "node_modules", "tsx", "dist", "cli.mjs");
  const child = spawnSync(process.execPath, [tsxCli, process.argv[1], "read", org.id], {
    cwd: process.cwd(),
    env: process.env,
    encoding: "utf8",
  });
  if (child.status !== 0) throw new Error(`second process failed\n${child.stdout}\n${child.stderr}`);

  const stored = await prisma.enterpriseProductJourneyVersion.findFirst({
    where: { organizationId: org.id, productCode, versionNumber: 1 },
  });
  assert.equal(stored?.lifecycle, "published");
  const after = await counts();
  assert.deepEqual(after, before);
  console.log("PRODUCT_JOURNEY_PRISMA_VERIFY pass");
  await prisma.$disconnect();
}

main().catch(async (error) => {
  console.error(error);
  await prisma.$disconnect();
  process.exit(1);
});
