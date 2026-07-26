/**
 * CO-ARCH-007 — Idempotent backfill + recovery for multi-lender snapshots.
 * Creates missing EnterpriseLender drafts when names are not in registry.
 * Restores lender list from historical EnterpriseDealSnapshot when working snapshot was slimmed.
 */

const { PrismaClient } = require("@prisma/client");

const prisma = new PrismaClient();
const opportunityFilter = process.argv
  .find((a) => a.startsWith("--opportunity="))
  ?.slice("--opportunity=".length);
const createMissingLenders = !process.argv.includes("--no-create-lenders");

function normalizeName(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .replace(/\bco-?operative\b/g, "cooperative")
    .replace(/\bbank\b/g, "")
    .replace(/\blimited\b/g, "")
    .replace(/\bltd\b/g, "")
    .replace(/\bof india\b/g, "")
    .trim();
}

function namesLooselyMatch(a, b) {
  const na = normalizeName(a);
  const nb = normalizeName(b);
  if (!na || !nb) return false;
  return na.includes(nb) || nb.includes(na);
}

async function allocateDealNumber(organizationId) {
  const year = new Date().getUTCFullYear();
  const issued = await prisma.$transaction(async (tx) => {
    const existing = await tx.enterpriseDealNumberSequence.findUnique({
      where: { organizationId_year: { organizationId, year } },
    });
    if (!existing) {
      await tx.enterpriseDealNumberSequence.create({
        data: { organizationId, year, nextValue: 2 },
      });
      return 1;
    }
    const updated = await tx.enterpriseDealNumberSequence.update({
      where: { organizationId_year: { organizationId, year } },
      data: { nextValue: { increment: 1 } },
    });
    return updated.nextValue - 1;
  });
  return `DEAL-${year}-${String(issued).padStart(6, "0")}`;
}

function caseStageToGross(caseStage) {
  switch (String(caseStage || "identified")) {
    case "identified":
    case "prelogin":
      return "pre_login";
    case "logged_in_wip":
      return "logged_in";
    case "soft_approved":
      return "soft_approved";
    case "final_approved":
      return "final_approved";
    case "closure_wip":
      return "closure_wip";
    case "disbursed":
      return "won";
    default:
      return "pre_login";
  }
}

async function ensureLender(organizationId, name) {
  const existing = await prisma.enterpriseLender.findMany({
    where: { organizationId, isDeleted: false },
    select: { id: true, displayName: true, legalName: true, label: true, shortName: true },
    take: 8000,
  });
  const hit = existing.find(
    (l) =>
      namesLooselyMatch(name, l.displayName) ||
      namesLooselyMatch(name, l.legalName) ||
      namesLooselyMatch(name, l.label) ||
      namesLooselyMatch(name, l.shortName),
  );
  if (hit) return hit.id;

  if (!createMissingLenders) return null;

  const category = await prisma.enterpriseLenderCategory.findFirst({
    where: { organizationId, isDeleted: false },
    orderBy: { createdAt: "asc" },
  });
  if (!category) {
    console.log(`  WARN no lender category for org ${organizationId}`);
    return null;
  }

  const codeBase = normalizeName(name)
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_|_$/g, "")
    .slice(0, 24)
    .toUpperCase() || "LENDER";
  let code = `BF_${codeBase}`.slice(0, 32);
  const codeClash = await prisma.enterpriseLender.findFirst({
    where: { organizationId, code },
  });
  if (codeClash) code = `BF_${Date.now().toString(36).toUpperCase()}`.slice(0, 32);

  const created = await prisma.enterpriseLender.create({
    data: {
      organizationId,
      categoryId: category.id,
      code,
      label: name,
      displayName: name,
      legalName: name,
      institutionCategory: "bank",
      lifecycleStatus: "active",
      operationalStatus: "active",
      status: "active",
      enabled: true,
          createdBy: "co-arch-007-backfill",
          modifiedBy: "co-arch-007-backfill",
    },
  });
  console.log(`  CREATED LENDER ${created.code} ← ${name}`);
  return created.id;
}

async function resolveLenderId(organizationId, snapLender) {
  const registryId = snapLender.lenderRegistryId?.trim();
  if (registryId) {
    const byId = await prisma.enterpriseLender.findFirst({
      where: { id: registryId, organizationId, isDeleted: false },
      select: { id: true, displayName: true, legalName: true, label: true, shortName: true },
    });
    if (
      byId &&
      (!snapLender.name ||
        namesLooselyMatch(snapLender.name, byId.displayName) ||
        namesLooselyMatch(snapLender.name, byId.legalName) ||
        namesLooselyMatch(snapLender.name, byId.label) ||
        namesLooselyMatch(snapLender.name, byId.shortName))
    ) {
      return byId.id;
    }
  }
  return ensureLender(organizationId, snapLender.name || "Unknown Lender");
}

async function loadSourceLenders(deal) {
  const snap = deal.snapshot && typeof deal.snapshot === "object" ? deal.snapshot : {};
  let lenders = Array.isArray(snap.lenders) ? snap.lenders : [];

  const history = await prisma.enterpriseDealSnapshot.findMany({
    where: { dealId: deal.id },
    orderBy: { versionNumber: "asc" },
    select: { snapshot: true, versionNumber: true },
  });
  for (const h of history) {
    const hl = h.snapshot && Array.isArray(h.snapshot.lenders) ? h.snapshot.lenders : [];
    if (hl.length > lenders.length) {
      lenders = hl;
      console.log(`  RECOVERED ${hl.length} lenders from snapshot v${h.versionNumber}`);
    }
  }
  return { snap, lenders };
}

async function main() {
  const deals = await prisma.enterpriseDeal.findMany({
    where: {
      isDeleted: false,
      opportunityId: { not: null },
      ...(opportunityFilter
        ? {
            OR: [
              { opportunity: { opportunityNumber: opportunityFilter } },
              { opportunityId: opportunityFilter },
            ],
          }
        : {}),
    },
    select: {
      id: true,
      organizationId: true,
      opportunityId: true,
      dealNumber: true,
      lenderId: true,
      primaryCounterpartyName: true,
      snapshot: true,
      productLabel: true,
      productFamily: true,
      requestedAmount: true,
      primaryContactId: true,
      primaryContactName: true,
      primaryContactMobile: true,
      primaryContactEmail: true,
      relationshipManagerName: true,
      currencyCode: true,
      createdBy: true,
    },
  });

  let scanned = 0;
  let created = 0;
  let skippedExisting = 0;
  let skippedUnresolved = 0;
  let slimmed = 0;

  for (const deal of deals) {
    scanned += 1;
    const { snap, lenders } = await loadSourceLenders(deal);
    if (lenders.length <= 1) continue;

    const opportunityId = deal.opportunityId;
    if (!opportunityId) continue;

    console.log(
      `\nDeal ${deal.dealNumber} opportunity=${opportunityId} sourceLenders=${lenders.length}`,
    );

    for (const snapLender of lenders) {
      const lenderId = await resolveLenderId(deal.organizationId, snapLender);
      if (!lenderId) {
        console.log(`  SKIP unresolved: ${snapLender.name}`);
        skippedUnresolved += 1;
        continue;
      }

      const existing = await prisma.enterpriseDeal.findFirst({
        where: {
          organizationId: deal.organizationId,
          opportunityId,
          lenderId,
          isDeleted: false,
        },
      });
      if (existing) {
        console.log(`  EXISTS ${existing.dealNumber} ← ${snapLender.name}`);
        skippedExisting += 1;
        continue;
      }

      const dealNumber = await allocateDealNumber(deal.organizationId);
      const grossStage = caseStageToGross(snapLender.caseStage);
      const now = new Date();
      const derivedSnapshot = {
        source: "co_arch_007_backfill",
        opportunityId,
        lenders: [
          {
            id: snapLender.id || `backfill-${lenderId}`,
            name: snapLender.name,
            status: snapLender.status || "active",
            caseStage: snapLender.caseStage || "identified",
            lenderRegistryId: lenderId,
            isPrimary: Boolean(snapLender.isPrimary),
            opportunityId,
            expectedLoanAmount: snapLender.expectedLoanAmount,
            product: snapLender.product || deal.productLabel,
          },
        ],
      };

      const createdDeal = await prisma.enterpriseDeal.create({
        data: {
          organizationId: deal.organizationId,
          dealNumber,
          opportunityId,
          lenderId,
          productFamily: deal.productFamily || "lending",
          grossStage,
          lifecycleStatus: "active",
          operationalStatus: "on_track",
          stageEnteredAt: now,
          productLabel: deal.productLabel,
          requestedAmount: deal.requestedAmount,
          currencyCode: deal.currencyCode || "INR",
          primaryContactId: deal.primaryContactId,
          primaryContactName: deal.primaryContactName,
          primaryContactMobile: deal.primaryContactMobile,
          primaryContactEmail: deal.primaryContactEmail,
          relationshipManagerName: deal.relationshipManagerName,
          primaryCounterpartyType: "lender",
          primaryCounterpartyId: lenderId,
          primaryCounterpartyName: snapLender.name || null,
          snapshot: derivedSnapshot,
          createdBy: deal.createdBy,
          rowVersion: 1,
        },
      });

      derivedSnapshot.lenders[0].enterpriseDealId = createdDeal.id;
      await prisma.enterpriseDeal.update({
        where: { id: createdDeal.id },
        data: { snapshot: derivedSnapshot },
      });

      console.log(`  CREATED ${dealNumber} ← ${snapLender.name} (${lenderId})`);
      created += 1;
    }

    // Slim original deal to its own lender by NAME/counterparty, not corrupted registry id.
    if (deal.lenderId) {
      const own =
        lenders.find((l) =>
          namesLooselyMatch(l.name, deal.primaryCounterpartyName),
        ) ||
        lenders.find((l) => l.lenderRegistryId === deal.lenderId && namesLooselyMatch(l.name, deal.primaryCounterpartyName)) ||
        lenders.find((l) => namesLooselyMatch(l.name, "Axis")) ||
        null;

      if (own) {
        const slim = {
          ...snap,
          source: "enterprise_deal_derived",
          lenders: [
            {
              ...own,
              lenderRegistryId: deal.lenderId,
              enterpriseDealId: deal.id,
              isPrimary: true,
              name: deal.primaryCounterpartyName || own.name,
            },
          ],
        };
        await prisma.enterpriseDeal.update({
          where: { id: deal.id },
          data: { snapshot: slim },
        });
        slimmed += 1;
        console.log(`  SLIMMED ${deal.dealNumber} → ${slim.lenders[0].name}`);
      }
    }
  }

  console.log("\n=== CO-ARCH-007 backfill summary ===");
  console.log({ scanned, created, skippedExisting, skippedUnresolved, slimmed });
}

main()
  .catch((e) => {
    console.error(e);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
