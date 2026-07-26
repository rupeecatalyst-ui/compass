/**
 * ADR-018 Wave 1 — persistence verification against target DB.
 * Run: npx tsx scripts/adr-018-w1-verify-persistence.ts
 * Does not change UI. Cleans up verification rows (soft-delete).
 */
import { PrismaClient } from "@prisma/client";
import {
  resolveProductUniquenessKey,
} from "../src/constants/opportunity-active-uniqueness";

const prisma = new PrismaClient();

type Step = { name: string; ok: boolean; detail: string };

async function main() {
  const steps: Step[] = [];
  const stamp = Date.now();
  const productKey = `w1_verify_${stamp}`;
  const productLabel = `W1 Verify ${stamp}`;

  // Schema version
  const migrations = await prisma.$queryRaw<
    Array<{ migration_name: string; finished_at: Date | null; rolled_back_at: Date | null }>
  >`SELECT migration_name, finished_at, rolled_back_at FROM "_prisma_migrations" ORDER BY finished_at ASC NULLS LAST`;

  const applied = migrations
    .filter((m) => m.finished_at && !m.rolled_back_at)
    .map((m) => m.migration_name);
  const last = applied[applied.length - 1] ?? "(none)";
  steps.push({
    name: "schema_version",
    ok: applied.includes("20260725010000_adr_018_w1_opportunity_lifecycle") &&
      applied.includes("20260725010100_adr_018_w1_opportunity_uniqueness_index"),
    detail: `latest=${last}; w1a=${applied.includes("20260725010000_adr_018_w1_opportunity_lifecycle")}; w1b=${applied.includes("20260725010100_adr_018_w1_opportunity_uniqueness_index")}; count=${applied.length}`,
  });

  const enumVals = await prisma.$queryRaw<Array<{ enumlabel: string }>>`
    SELECT e.enumlabel
    FROM pg_type t
    JOIN pg_enum e ON t.oid = e.enumtypid
    WHERE t.typname = 'OpportunityLifecycleStatus'
    ORDER BY e.enumsortorder
  `;
  const labels = enumVals.map((e) => e.enumlabel);
  steps.push({
    name: "enum_values",
    ok: labels.includes("draft") && labels.includes("requirement_captured"),
    detail: labels.join(", "),
  });

  const idx = await prisma.$queryRaw<Array<{ indexdef: string }>>`
    SELECT indexdef FROM pg_indexes
    WHERE indexname = 'eopp_active_contact_product_uidx'
  `;
  const indexdef = idx[0]?.indexdef ?? "";
  steps.push({
    name: "uniqueness_index",
    ok:
      indexdef.includes("requirement_captured") &&
      indexdef.includes("active") &&
      !indexdef.includes("'draft'"),
    detail: indexdef.slice(0, 280) || "MISSING",
  });

  const org = await prisma.organization.findFirst({
    where: { isActive: true },
    orderBy: { createdAt: "asc" },
  });
  if (!org) throw new Error("No organization found for verification");

  const contact = await prisma.ecmContact.findFirst({
    where: { organizationId: org.id, isDeleted: false },
    orderBy: { updatedAt: "desc" },
  });
  if (!contact) throw new Error("No ECM contact found for verification");

  // 1) Draft persists — no product key, no uniqueness
  const draft = await prisma.enterpriseOpportunity.create({
    data: {
      organizationId: org.id,
      opportunityNumber: `OPP-W1V-${stamp}-D`,
      productFamily: "lending",
      requirementStage: "draft",
      lifecycleStatus: "draft",
      stageEnteredAt: new Date(),
      primaryContactId: contact.id,
      primaryContactName: contact.name,
      primaryContactMobile: contact.mobilePrimary,
      productUniquenessKey: null,
      productLabel: null,
      productCode: null,
      requestedAmount: null,
      createdBy: "adr-018-w1-verify",
      updatedBy: "adr-018-w1-verify",
    },
  });
  steps.push({
    name: "draft_persist",
    ok: draft.lifecycleStatus === "draft" && draft.productUniquenessKey == null,
    detail: `id=${draft.id} status=${draft.lifecycleStatus} key=${draft.productUniquenessKey}`,
  });

  // Second draft same contact — must succeed (no uniqueness on draft)
  const draft2 = await prisma.enterpriseOpportunity.create({
    data: {
      organizationId: org.id,
      opportunityNumber: `OPP-W1V-${stamp}-D2`,
      productFamily: "lending",
      requirementStage: "draft",
      lifecycleStatus: "draft",
      stageEnteredAt: new Date(),
      primaryContactId: contact.id,
      primaryContactName: contact.name,
      productUniquenessKey: null,
      createdBy: "adr-018-w1-verify",
      updatedBy: "adr-018-w1-verify",
    },
  });
  steps.push({
    name: "draft_no_uniqueness",
    ok: Boolean(draft2.id),
    detail: `second draft id=${draft2.id} (same contact, no product — allowed)`,
  });

  // 2) Requirement Captured persists + uniqueness
  const captured = await prisma.enterpriseOpportunity.update({
    where: { id: draft.id },
    data: {
      productCode: productKey.toUpperCase(),
      productLabel,
      productUniquenessKey: resolveProductUniquenessKey({
        productCode: productKey.toUpperCase(),
        productLabel,
      }),
      requestedAmount: 2_500_000,
      lifecycleStatus: "requirement_captured",
      requirementStage: "raw_lead",
      updatedBy: "adr-018-w1-verify",
    },
  });
  const key = captured.productUniquenessKey;
  steps.push({
    name: "requirement_captured_persist",
    ok:
      captured.lifecycleStatus === "requirement_captured" &&
      captured.requestedAmount != null &&
      Boolean(key),
    detail: `status=${captured.lifecycleStatus} amount=${captured.requestedAmount} key=${key}`,
  });

  // Duplicate Requirement Captured same contact+product must fail
  let uniqBlocked = false;
  let uniqError = "";
  try {
    await prisma.enterpriseOpportunity.create({
      data: {
        organizationId: org.id,
        opportunityNumber: `OPP-W1V-${stamp}-DUP`,
        productFamily: "lending",
        requirementStage: "raw_lead",
        lifecycleStatus: "requirement_captured",
        stageEnteredAt: new Date(),
        primaryContactId: contact.id,
        productCode: productKey.toUpperCase(),
        productLabel,
        productUniquenessKey: key,
        requestedAmount: 1,
        createdBy: "adr-018-w1-verify",
        updatedBy: "adr-018-w1-verify",
      },
    });
  } catch (err) {
    uniqBlocked = true;
    uniqError = err instanceof Error ? err.message.slice(0, 160) : String(err);
  }
  steps.push({
    name: "uniqueness_at_requirement_captured",
    ok: uniqBlocked,
    detail: uniqBlocked ? `blocked: ${uniqError}` : "FAILED — duplicate was allowed",
  });

  // 3) Active transition
  const active = await prisma.enterpriseOpportunity.update({
    where: { id: draft.id },
    data: {
      lifecycleStatus: "active",
      updatedBy: "adr-018-w1-verify",
    },
  });
  steps.push({
    name: "active_transition",
    ok: active.lifecycleStatus === "active",
    detail: `status=${active.lifecycleStatus}`,
  });

  // Cleanup — soft delete verification rows
  await prisma.enterpriseOpportunity.updateMany({
    where: {
      organizationId: org.id,
      opportunityNumber: { startsWith: `OPP-W1V-${stamp}` },
    },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: "adr-018-w1-verify",
      deletionReason: "ADR-018 Wave 1 verification cleanup",
      lifecycleStatus: "cancelled",
      closedAt: new Date(),
    },
  });
  steps.push({
    name: "cleanup",
    ok: true,
    detail: `soft-deleted OPP-W1V-${stamp}*`,
  });

  const allOk = steps.every((s) => s.ok);
  const report = {
    ok: allOk,
    certifiedReady: allOk,
    database: "supabase postgres (from DATABASE_URL)",
    contactId: contact.id,
    organizationId: org.id,
    appliedMigrationsTail: applied.slice(-5),
    schemaVersionLatest: last,
    steps,
  };
  console.log(JSON.stringify(report, null, 2));
  if (!allOk) process.exitCode = 1;
}

main()
  .catch((err) => {
    console.error(JSON.stringify({ ok: false, error: String(err) }, null, 2));
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
