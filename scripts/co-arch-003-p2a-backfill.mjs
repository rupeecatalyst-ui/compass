/**
 * CO-ARCH-003 Phase 2A — Backfill Opportunities + per-lender Deal links.
 * Non-destructive. Idempotent. Does not drop data.
 *
 * For each engagement Deal without opportunity_id:
 *  1. Create Opportunity (requires primary_contact_id)
 *  2. Link Deal.opportunity_id
 *  3. If primary_counterparty_id is a valid lender → set lender_id
 *  4. Additional counterparty assignments → new Deal rows (Option A)
 *  5. Deals still without lender → soft-delete (BI-3; Opportunity retained)
 *
 * Usage: node --env-file=.env.local scripts/co-arch-003-p2a-backfill.mjs
 */
import { createRequire } from "node:module";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";
import { createHash, randomBytes } from "node:crypto";

const require = createRequire(import.meta.url);

function loadEnvFile(name) {
  const path = resolve(process.cwd(), name);
  if (!existsSync(path)) return;
  for (const line of readFileSync(path, "utf8").split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eq = trimmed.indexOf("=");
    if (eq <= 0) continue;
    const key = trimmed.slice(0, eq).trim();
    let val = trimmed.slice(eq + 1).trim();
    if (
      (val.startsWith('"') && val.endsWith('"')) ||
      (val.startsWith("'") && val.endsWith("'"))
    ) {
      val = val.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = val;
  }
}

loadEnvFile(".env");
loadEnvFile(".env.local");

const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("FAIL: DATABASE_URL / DIRECT_URL missing");
  process.exit(1);
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ datasources: { db: { url } } });

function cuidLike() {
  return "c" + createHash("sha256").update(randomBytes(16)).digest("hex").slice(0, 24);
}

function formatOpp(year, seq) {
  return `OPP-${year}-${String(seq).padStart(6, "0")}`;
}

function formatDeal(year, seq) {
  return `DEAL-${year}-${String(seq).padStart(6, "0")}`;
}

async function allocateOppNumber(organizationId) {
  const year = new Date().getUTCFullYear();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.enterpriseOpportunityNumberSequence.findUnique({
      where: { organizationId_year: { organizationId, year } },
    });
    if (!existing) {
      await tx.enterpriseOpportunityNumberSequence.create({
        data: { organizationId, year, nextValue: 2, updatedAt: new Date() },
      });
      return formatOpp(year, 1);
    }
    const updated = await tx.enterpriseOpportunityNumberSequence.update({
      where: { organizationId_year: { organizationId, year } },
      data: { nextValue: { increment: 1 } },
    });
    return formatOpp(year, updated.nextValue - 1);
  });
}

async function allocateDealNumber(organizationId) {
  const year = new Date().getUTCFullYear();
  return prisma.$transaction(async (tx) => {
    const existing = await tx.enterpriseDealNumberSequence.findUnique({
      where: { organizationId_year: { organizationId, year } },
    });
    if (!existing) {
      await tx.enterpriseDealNumberSequence.create({
        data: { organizationId, year, nextValue: 2, updatedAt: new Date() },
      });
      return formatDeal(year, 1);
    }
    const updated = await tx.enterpriseDealNumberSequence.update({
      where: { organizationId_year: { organizationId, year } },
      data: { nextValue: { increment: 1 } },
    });
    return formatDeal(year, updated.nextValue - 1);
  });
}

function mapRequirementStage(grossStage) {
  const s = String(grossStage || "").toLowerCase();
  if (!s || s.includes("raw") || s.includes("lead")) return "raw_lead";
  if (s.includes("qualif")) return "qualified";
  if (s.includes("document")) return "documents_received";
  if (s.includes("ready")) return "ready_for_market";
  if (s.includes("disbur") || s.includes("fulfil")) return "fulfilled";
  return "in_market";
}

async function main() {
  const stats = {
    opportunitiesCreated: 0,
    dealsLinked: 0,
    lendersSet: 0,
    siblingDealsCreated: 0,
    dealsSoftDeletedNoLender: 0,
    skippedNoContact: 0,
  };

  const deals = await prisma.enterpriseDeal.findMany({
    where: { isDeleted: false, opportunityId: null },
    orderBy: { createdAt: "asc" },
  });

  console.log(`Backfill candidates (no opportunity_id): ${deals.length}`);

  for (const deal of deals) {
    if (!deal.primaryContactId) {
      stats.skippedNoContact += 1;
      console.warn(`SKIP ${deal.dealNumber}: missing primary_contact_id`);
      continue;
    }

    let opportunity = deal.legacyLoanFileId
      ? await prisma.enterpriseOpportunity.findFirst({
          where: {
            organizationId: deal.organizationId,
            legacyLoanFileId: deal.legacyLoanFileId,
            isDeleted: false,
          },
        })
      : null;

    if (!opportunity) {
      const opportunityNumber = await allocateOppNumber(deal.organizationId);
      opportunity = await prisma.enterpriseOpportunity.create({
        data: {
          id: cuidLike(),
          organizationId: deal.organizationId,
          opportunityNumber,
          legacyLoanFileId: deal.legacyLoanFileId,
          productId: deal.productId,
          productCode: deal.productCode,
          productLabel: deal.productLabel,
          productFamily: deal.productFamily,
          transactionType: deal.transactionType,
          requirementStage: mapRequirementStage(deal.grossStage),
          stageEnteredAt: deal.stageEnteredAt || new Date(),
          primaryContactId: deal.primaryContactId,
          primaryContactName: deal.primaryContactName,
          primaryContactMobile: deal.primaryContactMobile,
          primaryContactEmail: deal.primaryContactEmail,
          companyId: deal.companyId,
          relationshipManagerUserId: deal.relationshipManagerUserId,
          relationshipManagerName: deal.relationshipManagerName,
          primaryOwnerUserId: deal.primaryOwnerUserId,
          priority: deal.priority,
          requestedAmount: deal.requestedAmount,
          currencyCode: deal.currencyCode || "INR",
          snapshot: deal.snapshot ?? undefined,
          lendingExtension: deal.lendingExtension ?? undefined,
          createdBy: deal.createdBy,
          updatedBy: deal.updatedBy,
          updatedAt: new Date(),
        },
      });
      stats.opportunitiesCreated += 1;
    }

    let lenderId = null;
    if (deal.primaryCounterpartyId) {
      const lender = await prisma.enterpriseLender.findFirst({
        where: {
          id: deal.primaryCounterpartyId,
          organizationId: deal.organizationId,
          isDeleted: false,
        },
      });
      if (lender) lenderId = lender.id;
    }

    await prisma.enterpriseDeal.update({
      where: { id: deal.id },
      data: {
        opportunityId: opportunity.id,
        lenderId,
        primaryCounterpartyType: lenderId ? "lender" : deal.primaryCounterpartyType,
        updatedAt: new Date(),
      },
    });
    stats.dealsLinked += 1;
    if (lenderId) stats.lendersSet += 1;

    const assignments = await prisma.enterpriseDealCounterpartyAssignment.findMany({
      where: {
        dealId: deal.id,
        organizationId: deal.organizationId,
        isDeleted: false,
        counterpartyType: "lender",
      },
    });

    for (const asg of assignments) {
      if (lenderId && asg.counterpartyRegistryId === lenderId) continue;
      const lender = await prisma.enterpriseLender.findFirst({
        where: {
          id: asg.counterpartyRegistryId,
          organizationId: deal.organizationId,
          isDeleted: false,
        },
      });
      if (!lender) continue;

      const existing = await prisma.enterpriseDeal.findFirst({
        where: {
          organizationId: deal.organizationId,
          opportunityId: opportunity.id,
          lenderId: lender.id,
          isDeleted: false,
        },
      });
      if (existing) continue;

      const dealNumber = await allocateDealNumber(deal.organizationId);
      await prisma.enterpriseDeal.create({
        data: {
          id: cuidLike(),
          organizationId: deal.organizationId,
          dealNumber,
          opportunityId: opportunity.id,
          lenderId: lender.id,
          lenderProgramId: asg.programId,
          legacyLoanFileId: deal.legacyLoanFileId,
          fileNumber: deal.fileNumber,
          productFamily: deal.productFamily,
          productId: deal.productId,
          productCode: deal.productCode,
          productLabel: deal.productLabel,
          transactionType: deal.transactionType,
          grossStage: asg.pipelineStage || deal.grossStage || "identified",
          subStage: asg.pipelineSubStage,
          stageEnteredAt: asg.createdAt || new Date(),
          primaryContactId: deal.primaryContactId,
          primaryContactName: deal.primaryContactName,
          primaryContactMobile: deal.primaryContactMobile,
          primaryContactEmail: deal.primaryContactEmail,
          companyId: deal.companyId,
          relationshipManagerUserId: deal.relationshipManagerUserId,
          relationshipManagerName: deal.relationshipManagerName,
          priority: deal.priority,
          requestedAmount: deal.requestedAmount,
          currencyCode: deal.currencyCode || "INR",
          primaryCounterpartyType: "lender",
          primaryCounterpartyId: lender.id,
          primaryCounterpartyName: lender.displayName || lender.label,
          primaryCounterpartyProgramId: asg.programId,
          createdBy: "co-arch-003-p2a-backfill",
          updatedBy: "co-arch-003-p2a-backfill",
          updatedAt: new Date(),
        },
      });
      stats.siblingDealsCreated += 1;
    }

    const refreshed = await prisma.enterpriseDeal.findUnique({ where: { id: deal.id } });
    if (refreshed && !refreshed.lenderId) {
      await prisma.enterpriseDeal.update({
        where: { id: deal.id },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: "co-arch-003-p2a-backfill",
          deletionReason: "BI-3: engagement Deal without lender converted to Opportunity-only",
          updatedAt: new Date(),
        },
      });
      stats.dealsSoftDeletedNoLender += 1;
    }
  }

  console.log("Backfill complete:", stats);
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
