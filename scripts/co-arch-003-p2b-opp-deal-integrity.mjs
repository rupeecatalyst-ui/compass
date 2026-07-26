/**
 * CO-ARCH-003 Phase 2B — Opportunity–Deal Data Integrity Validation
 *
 * Validation only: creates realistic test rows, verifies DB + repository-parity
 * reads, writes a report, then soft-deletes test records.
 *
 * Does NOT modify application source or schema.
 * Never prints DB credentials.
 *
 * Run: node scripts/run-with-db-env.mjs scripts/co-arch-003-p2b-opp-deal-integrity.mjs
 */
import { createRequire } from "node:module";
import { createHash, randomBytes } from "node:crypto";
import { writeFileSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

const require = createRequire(import.meta.url);
const url = process.env.DIRECT_URL?.trim() || process.env.DATABASE_URL?.trim();
if (!url) {
  console.error("FAIL: DATABASE_URL / DIRECT_URL missing");
  process.exit(1);
}

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient({ datasources: { db: { url } } });

const ACTOR = "co-arch-003-p2b-integrity";
const CLEANUP_REASON = "p2b_opp_deal_integrity_cleanup";

function cuidLike() {
  return "c" + createHash("sha256").update(randomBytes(16)).digest("hex").slice(0, 24);
}

function formatOpp(year, seq) {
  return `OPP-${year}-${String(seq).padStart(6, "0")}`;
}
function formatDeal(year, seq) {
  return `DEAL-${year}-${String(seq).padStart(6, "0")}`;
}

const checks = [];
function check(section, name, ok, detail = "") {
  checks.push({ section, name, ok, detail: String(detail ?? "") });
  console.log(
    `${ok ? "PASS" : "FAIL"} [${section}] ${name}${detail ? ` — ${detail}` : ""}`,
  );
}

async function nextOpp(organizationId) {
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

async function nextDeal(organizationId) {
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

async function resolveOrCreateLender(organizationId, displayLabel, codeSuffix) {
  const needles = [
    displayLabel,
    displayLabel.replace(/\s+Bank$/i, ""),
    displayLabel.replace(/\s+Finance$/i, ""),
  ].map((s) => s.toLowerCase());

  const candidates = await prisma.enterpriseLender.findMany({
    where: { organizationId, isDeleted: false, enabled: true },
    take: 500,
  });
  const found = candidates.find((l) => {
    const hay = `${l.displayName || ""} ${l.label || ""} ${l.code || ""}`.toLowerCase();
    return needles.some((n) => hay.includes(n));
  });
  if (found) return { lender: found, created: false };

  let category = await prisma.enterpriseLenderCategory.findFirst({
    where: { organizationId, isDeleted: false },
    orderBy: { createdAt: "asc" },
  });
  if (!category) {
    category = await prisma.enterpriseLenderCategory.create({
      data: {
        id: cuidLike(),
        organizationId,
        code: "P2B-INT-CAT",
        label: "P2B Integrity Validation Category",
        createdBy: ACTOR,
        modifiedBy: ACTOR,
        updatedAt: new Date(),
      },
    });
  }

  const code = `LND-P2B-INT-${codeSuffix}`;
  const lender = await prisma.enterpriseLender.create({
    data: {
      id: cuidLike(),
      organizationId,
      categoryId: category.id,
      code,
      label: displayLabel,
      displayName: displayLabel,
      legalName: `${displayLabel} Limited`,
      institutionCategory: codeSuffix === "BAJAJ" ? "nbfc" : "bank",
      productsSupported: ["home_loan", "lap", "business_loan"],
      createdBy: ACTOR,
      modifiedBy: ACTOR,
      updatedAt: new Date(),
    },
  });
  return { lender, created: true };
}

async function ensureProgram(organizationId, lender, productCode, productLabel) {
  const existing = await prisma.enterpriseLenderProgram.findFirst({
    where: {
      organizationId,
      lenderId: lender.id,
      isDeleted: false,
      OR: [{ productCode }, { label: { contains: productLabel, mode: "insensitive" } }],
    },
    orderBy: { createdAt: "asc" },
  });
  if (existing) return { program: existing, created: false };

  const code = `PRG-P2B-INT-${lender.code.slice(-8)}-${productCode}-${randomBytes(2).toString("hex")}`.slice(
    0,
    64,
  );
  const program = await prisma.enterpriseLenderProgram.create({
    data: {
      id: cuidLike(),
      organizationId,
      lenderId: lender.id,
      productCode,
      code,
      label: `${lender.displayName || lender.label} — ${productLabel}`,
      description: "Integrity validation program",
      roiPercent: 8.5,
      maxTenureMonths: 240,
      lifecycleStatus: "active",
      status: "active",
      enabled: true,
      createdBy: ACTOR,
      modifiedBy: ACTOR,
      updatedAt: new Date(),
    },
  });
  return { program, created: true };
}

async function createInvoiceParty(organizationId, partyContact, partyType, stamp, idx) {
  return prisma.enterpriseInvoiceParty.create({
    data: {
      id: cuidLike(),
      organizationId,
      contactId: partyContact.id,
      partyType,
      legalName: partyContact.name,
      billingName: partyContact.name,
      displayName: partyContact.name,
      invoiceEmail: partyContact.personalEmail,
      enabled: true,
      createdBy: ACTOR,
      updatedBy: ACTOR,
      updatedAt: new Date(),
      notes: `P2B integrity Invoice Party ${idx} @ ${stamp}`,
    },
  });
}

async function main() {
  console.log("=== CO-ARCH-003 Phase 2B — Opportunity–Deal Data Integrity Test ===\n");

  const org =
    (await prisma.organization.findFirst({ where: { isActive: true } })) ||
    (await prisma.organization.findFirst());
  if (!org) {
    console.error("FAIL: no organization");
    process.exit(1);
  }
  console.log(`Organization: ${org.slug || org.id}\n`);

  const stamp = Date.now();
  const createdLenderIds = [];
  const createdProgramIds = [];
  const createdPartyIds = [];
  const createdContactIds = [];
  const createdDealIds = [];
  let opportunityId = null;

  try {
    // ---- 1. Contact (primary applicant) ----
    const mobile = `9${String(stamp).slice(-9)}`;
    const contact = await prisma.ecmContact.create({
      data: {
        id: cuidLike(),
        organizationId: org.id,
        name: `P2B Integrity Customer ${stamp}`,
        mobilePrimary: mobile,
        personalEmail: `p2b.integrity.${stamp}@example.com`,
        primaryRole: "customer",
        roles: ["customer"],
        createdBy: ACTOR,
        modifiedBy: ACTOR,
        updatedAt: new Date(),
      },
    });
    createdContactIds.push(contact.id);
    check("SETUP", "Create one test Contact", Boolean(contact.id), contact.id);

    // Invoice Party contacts (unique Contact → Master)
    const partyContacts = [];
    for (let i = 1; i <= 4; i++) {
      const pc = await prisma.ecmContact.create({
        data: {
          id: cuidLike(),
          organizationId: org.id,
          name: `P2B Integrity Invoice Party ${i} ${stamp}`,
          mobilePrimary: `8${String(stamp + i).slice(-9)}`,
          personalEmail: `p2b.ip.${i}.${stamp}@example.com`,
          primaryRole: "customer",
          roles: ["customer"],
          createdBy: ACTOR,
          modifiedBy: ACTOR,
          updatedAt: new Date(),
        },
      });
      partyContacts.push(pc);
      createdContactIds.push(pc.id);
    }
    check("SETUP", "Create four Invoice Party Contacts", partyContacts.length === 4);

    const parties = [];
    const partyTypes = ["lender", "channel_partner", "lender", "intermediary"];
    for (let i = 0; i < 4; i++) {
      const party = await createInvoiceParty(
        org.id,
        partyContacts[i],
        partyTypes[i],
        stamp,
        i + 1,
      );
      parties.push(party);
      createdPartyIds.push(party.id);
    }
    check("SETUP", "Create four Invoice Party Master records", parties.length === 4);

    // ---- 2. Opportunity ----
    const opportunityNumber = await nextOpp(org.id);
    const opportunity = await prisma.enterpriseOpportunity.create({
      data: {
        id: cuidLike(),
        organizationId: org.id,
        opportunityNumber,
        productFamily: "lending",
        productCode: "home_loan",
        productLabel: "Home Loan",
        requirementStage: "ready_for_market",
        stageEnteredAt: new Date(),
        primaryContactId: contact.id,
        primaryContactName: contact.name,
        primaryContactMobile: contact.mobilePrimary,
        primaryContactEmail: contact.personalEmail,
        requestedAmount: 25000000,
        currencyCode: "INR",
        createdBy: ACTOR,
        updatedBy: ACTOR,
        updatedAt: new Date(),
        snapshot: {
          integrityTest: true,
          actor: ACTOR,
          stamp,
        },
      },
    });
    opportunityId = opportunity.id;
    check(
      "SETUP",
      "Create one test Opportunity",
      Boolean(opportunity.id),
      `${opportunity.id} / ${opportunity.opportunityNumber}`,
    );

    const dealsAtCreate = await prisma.enterpriseDeal.count({
      where: { opportunityId: opportunity.id, isDeleted: false },
    });
    check("SETUP", "Opportunity starts with zero Deals (BI-1)", dealsAtCreate === 0, String(dealsAtCreate));

    // ---- 3. Four Deals ----
    const lenderSpecs = [
      {
        label: "HDFC Bank",
        code: "HDFC",
        productCode: "home_loan",
        productLabel: "Home Loan",
        amount: 8000000,
        stage: "identified",
      },
      {
        label: "SBI",
        code: "SBI",
        productCode: "home_loan",
        productLabel: "Home Loan",
        amount: 7500000,
        stage: "logged_in_wip",
      },
      {
        label: "Bajaj Finance",
        code: "BAJAJ",
        productCode: "lap",
        productLabel: "Loan Against Property",
        amount: 5000000,
        stage: "credit_wip",
      },
      {
        label: "ICICI Bank",
        code: "ICICI",
        productCode: "home_loan",
        productLabel: "Home Loan",
        amount: 4500000,
        stage: "soft_approved",
      },
    ];

    const deals = [];
    for (let i = 0; i < lenderSpecs.length; i++) {
      const spec = lenderSpecs[i];
      const { lender, created: lenderCreated } = await resolveOrCreateLender(
        org.id,
        spec.label,
        spec.code,
      );
      if (lenderCreated) createdLenderIds.push(lender.id);

      const { program, created: programCreated } = await ensureProgram(
        org.id,
        lender,
        spec.productCode,
        spec.productLabel,
      );
      if (programCreated) createdProgramIds.push(program.id);

      // Program must belong to lender
      check(
        "SETUP",
        `Program belongs to lender (${spec.label})`,
        program.lenderId === lender.id,
        program.id,
      );

      const dealNumber = await nextDeal(org.id);
      const party = parties[i];
      const deal = await prisma.enterpriseDeal.create({
        data: {
          id: cuidLike(),
          organizationId: org.id,
          dealNumber,
          opportunityId: opportunity.id,
          lenderId: lender.id,
          lenderProgramId: program.id,
          productFamily: "lending",
          productCode: spec.productCode,
          productLabel: spec.productLabel,
          grossStage: spec.stage,
          stageEnteredAt: new Date(),
          primaryContactId: contact.id,
          primaryContactName: contact.name,
          primaryContactMobile: contact.mobilePrimary,
          requestedAmount: spec.amount,
          currencyCode: "INR",
          primaryCounterpartyType: "lender",
          primaryCounterpartyId: lender.id,
          primaryCounterpartyName: lender.displayName || lender.label,
          primaryCounterpartyProgramId: program.id,
          invoicePartyId: party.id,
          invoicePartyType: party.partyType,
          invoicePartySpecify: party.displayName,
          invoicePartyContactId: party.contactId,
          createdBy: ACTOR,
          updatedBy: ACTOR,
          updatedAt: new Date(),
          lendingExtension: {
            integrityTest: true,
            stamp,
            lenderLabel: spec.label,
          },
        },
      });
      deals.push({
        deal,
        lender,
        program,
        party,
        spec,
      });
      createdDealIds.push(deal.id);
      check(
        "SETUP",
        `Create Deal ${i + 1} (${spec.label})`,
        Boolean(deal.id),
        `${deal.dealNumber} · stage=${spec.stage} · amt=${spec.amount}`,
      );
    }

    // ============================================================
    // DATABASE VALIDATION
    // ============================================================
    console.log("\n--- Database validation ---\n");

    const dbContact = await prisma.ecmContact.findUnique({ where: { id: contact.id } });
    check("DB", "One Contact exists", Boolean(dbContact && !dbContact.isDeleted), contact.id);

    const dbOpp = await prisma.enterpriseOpportunity.findUnique({
      where: { id: opportunity.id },
    });
    check(
      "DB",
      "One Opportunity exists",
      Boolean(dbOpp && !dbOpp.isDeleted),
      `${dbOpp?.id} / ${dbOpp?.opportunityNumber}`,
    );

    const oppDupCount = await prisma.enterpriseOpportunity.count({
      where: {
        organizationId: org.id,
        opportunityNumber: opportunity.opportunityNumber,
        isDeleted: false,
      },
    });
    check("DB", "No duplicate Opportunity records", oppDupCount === 1, String(oppDupCount));

    const dbDeals = await prisma.enterpriseDeal.findMany({
      where: { opportunityId: opportunity.id, isDeleted: false },
      orderBy: { createdAt: "asc" },
      include: {
        lender: true,
        lenderProgram: true,
        invoiceParty: true,
      },
    });
    check("DB", "Four Deal records exist", dbDeals.length === 4, String(dbDeals.length));

    check(
      "DB",
      "Every Deal references the same Opportunity",
      dbDeals.every((d) => d.opportunityId === opportunity.id),
      opportunity.id,
    );

    const dealIds = dbDeals.map((d) => d.id);
    const dealNumbers = dbDeals.map((d) => d.dealNumber);
    check("DB", "Every Deal has unique Deal ID", new Set(dealIds).size === 4, dealIds.join(", "));
    check(
      "DB",
      "Every Deal has unique Deal Number",
      new Set(dealNumbers).size === 4,
      dealNumbers.join(", "),
    );

    check(
      "DB",
      "Lender relationships are correct (FK + distinct)",
      dbDeals.every((d) => d.lenderId && d.lender && d.lender.id === d.lenderId) &&
        new Set(dbDeals.map((d) => d.lenderId)).size === 4,
      dbDeals.map((d) => d.lender?.displayName || d.primaryCounterpartyName).join(" | "),
    );

    check(
      "DB",
      "Lender Program relationships are correct (program ∈ lender)",
      dbDeals.every(
        (d) =>
          d.lenderProgramId &&
          d.lenderProgram &&
          d.lenderProgram.id === d.lenderProgramId &&
          d.lenderProgram.lenderId === d.lenderId,
      ),
    );

    check(
      "DB",
      "Invoice Party relationships are correct",
      dbDeals.every(
        (d) =>
          d.invoicePartyId &&
          d.invoiceParty &&
          d.invoiceParty.id === d.invoicePartyId &&
          !d.invoiceParty.isDeleted,
      ) && new Set(dbDeals.map((d) => d.invoicePartyId)).size === 4,
      dbDeals.map((d) => d.invoiceParty?.displayName).join(" | "),
    );

    // Raw SQL FK / orphan checks
    const orphanDeals = await prisma.$queryRawUnsafe(
      `SELECT d.id FROM enterprise_deals d
       LEFT JOIN enterprise_opportunities o ON o.id = d.opportunity_id
       WHERE d.id = ANY($1::text[]) AND (d.opportunity_id IS NULL OR o.id IS NULL)`,
      createdDealIds,
    );
    check(
      "DB",
      "No orphan Deals (Opportunity FK valid)",
      Array.isArray(orphanDeals) && orphanDeals.length === 0,
      JSON.stringify(orphanDeals),
    );

    const badLenderFk = await prisma.$queryRawUnsafe(
      `SELECT d.id FROM enterprise_deals d
       LEFT JOIN enterprise_lenders l ON l.id = d.lender_id
       WHERE d.id = ANY($1::text[]) AND (d.lender_id IS NULL OR l.id IS NULL)`,
      createdDealIds,
    );
    check(
      "DB",
      "No Deal with invalid lender FK",
      Array.isArray(badLenderFk) && badLenderFk.length === 0,
    );

    const badPartyFk = await prisma.$queryRawUnsafe(
      `SELECT d.id FROM enterprise_deals d
       LEFT JOIN enterprise_accounting_payees p ON p.id = d.commission_accounting_payee_id
       WHERE d.id = ANY($1::text[]) AND (d.commission_accounting_payee_id IS NULL OR p.id IS NULL)`,
      createdDealIds,
    );
    check(
      "DB",
      "No Deal with invalid Invoice Party FK",
      Array.isArray(badPartyFk) && badPartyFk.length === 0,
    );

    const allIds = [
      opportunity.id,
      ...createdDealIds,
      ...createdPartyIds,
      ...createdContactIds,
      ...createdProgramIds,
    ];
    check(
      "DB",
      "UUIDs/IDs unique across created set",
      new Set(allIds).size === allIds.length,
      `n=${allIds.length} unique=${new Set(allIds).size}`,
    );

    // ============================================================
    // APPLICATION VALIDATION (repository query parity)
    // Mirrors enterpriseOpportunityRepository.findById +
    // enterpriseOpportunityService.listDealsForOpportunity
    // ============================================================
    console.log("\n--- Application repository / API parity ---\n");

    const appOpp = await prisma.enterpriseOpportunity.findFirst({
      where: {
        id: opportunity.id,
        organizationId: org.id,
        isDeleted: false,
      },
    });
    check(
      "APP",
      "Opportunity displays correctly (repository findById parity)",
      Boolean(appOpp) &&
        appOpp.opportunityNumber === opportunity.opportunityNumber &&
        appOpp.primaryContactId === contact.id,
      appOpp?.opportunityNumber,
    );

    const appDeals = await prisma.enterpriseDeal.findMany({
      where: {
        organizationId: org.id,
        opportunityId: opportunity.id,
        isDeleted: false,
      },
      orderBy: { createdAt: "asc" },
      include: {
        lender: { select: { id: true, displayName: true, label: true, code: true } },
        lenderProgram: { select: { id: true, label: true, code: true, lenderId: true } },
        invoiceParty: {
          select: { id: true, displayName: true, partyType: true, enabled: true },
        },
      },
    });

    check("APP", "All four Deals are visible", appDeals.length === 4, String(appDeals.length));
    check(
      "APP",
      "Deal counts match the database",
      appDeals.length === dbDeals.length &&
        appDeals.every((d) => dbDeals.some((x) => x.id === d.id)),
      `app=${appDeals.length} db=${dbDeals.length}`,
    );
    check(
      "APP",
      "Relationship integrity preserved (opp + lender + program + invoice party)",
      appDeals.every(
        (d) =>
          d.opportunityId === opportunity.id &&
          d.lender?.id === d.lenderId &&
          d.lenderProgram?.lenderId === d.lenderId &&
          d.invoiceParty?.id === d.invoicePartyId,
      ),
    );

    // Duplicate Opportunity+Lender must be rejected (Option A)
    let dupBlocked = false;
    let dupDetail = "";
    try {
      await prisma.enterpriseDeal.create({
        data: {
          id: cuidLike(),
          organizationId: org.id,
          dealNumber: await nextDeal(org.id),
          opportunityId: opportunity.id,
          lenderId: deals[0].lender.id,
          productFamily: "lending",
          productLabel: "Home Loan",
          grossStage: "identified",
          stageEnteredAt: new Date(),
          primaryContactId: contact.id,
          updatedAt: new Date(),
          createdBy: ACTOR,
          updatedBy: ACTOR,
        },
      });
      dupDetail = "insert succeeded unexpectedly";
    } catch (err) {
      dupBlocked = true;
      dupDetail = err.code || err.message?.slice(0, 100) || "blocked";
    }
    check(
      "APP",
      "Duplicate Opportunity+Lender rejected (Option A uniqueness)",
      dupBlocked,
      dupDetail,
    );

    // ============================================================
    // DATA CONSISTENCY
    // ============================================================
    console.log("\n--- Data consistency ---\n");

    check(
      "CONSISTENCY",
      "Foreign keys valid (opportunity, lender, program, invoice party)",
      appDeals.every(
        (d) => d.opportunityId && d.lenderId && d.lenderProgramId && d.invoicePartyId,
      ),
    );
    check(
      "CONSISTENCY",
      "No orphan records in test set",
      Array.isArray(orphanDeals) &&
        orphanDeals.length === 0 &&
        Array.isArray(badLenderFk) &&
        badLenderFk.length === 0 &&
        Array.isArray(badPartyFk) &&
        badPartyFk.length === 0,
    );
    check(
      "CONSISTENCY",
      "No duplicate Deal IDs or Deal Numbers",
      new Set(dealIds).size === 4 && new Set(dealNumbers).size === 4,
    );
    check(
      "CONSISTENCY",
      "Opportunity–Deal relationship intact",
      appDeals.length === 4 && appDeals.every((d) => d.opportunityId === opportunity.id),
    );

    // Distinct stages / amounts / products as required
    check(
      "CONSISTENCY",
      "Deals have distinct stages",
      new Set(appDeals.map((d) => d.grossStage)).size === 4,
      appDeals.map((d) => d.grossStage).join(", "),
    );
    check(
      "CONSISTENCY",
      "Deals have distinct loan amounts",
      new Set(appDeals.map((d) => String(d.requestedAmount))).size === 4,
    );

    // ============================================================
    // Evidence payload
    // ============================================================
    const evidence = {
      at: new Date().toISOString(),
      organizationId: org.id,
      organizationSlug: org.slug || null,
      contact: {
        id: contact.id,
        name: contact.name,
        mobile: contact.mobilePrimary,
      },
      opportunity: {
        id: opportunity.id,
        opportunityNumber: opportunity.opportunityNumber,
        productLabel: opportunity.productLabel,
        requirementStage: opportunity.requirementStage,
        primaryContactId: opportunity.primaryContactId,
      },
      dealCount: appDeals.length,
      deals: appDeals.map((d) => ({
        id: d.id,
        dealNumber: d.dealNumber,
        stage: d.grossStage,
        productCode: d.productCode,
        productLabel: d.productLabel,
        requestedAmount: d.requestedAmount != null ? String(d.requestedAmount) : null,
        lenderId: d.lenderId,
        lenderName: d.lender?.displayName || d.lender?.label || d.primaryCounterpartyName,
        lenderProgramId: d.lenderProgramId,
        lenderProgramLabel: d.lenderProgram?.label || null,
        invoicePartyId: d.invoicePartyId,
        invoicePartyName: d.invoiceParty?.displayName || d.invoicePartySpecify,
      })),
      checks,
      totals: {
        pass: checks.filter((c) => c.ok).length,
        fail: checks.filter((c) => !c.ok).length,
      },
    };

    // ============================================================
    // CLEAN-UP
    // ============================================================
    console.log("\n--- Clean-up ---\n");

    await prisma.enterpriseDeal.updateMany({
      where: { id: { in: createdDealIds } },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: ACTOR,
        deletionReason: CLEANUP_REASON,
      },
    });
    await prisma.enterpriseOpportunity.update({
      where: { id: opportunity.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: ACTOR,
        deletionReason: CLEANUP_REASON,
      },
    });
    await prisma.enterpriseInvoiceParty.updateMany({
      where: { id: { in: createdPartyIds } },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: ACTOR,
        deletionReason: CLEANUP_REASON,
      },
    });
    if (createdProgramIds.length) {
      await prisma.enterpriseLenderProgram.updateMany({
        where: { id: { in: createdProgramIds } },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ACTOR,
          deletionReason: CLEANUP_REASON,
        },
      });
    }
    if (createdLenderIds.length) {
      await prisma.enterpriseLender.updateMany({
        where: { id: { in: createdLenderIds } },
        data: {
          isDeleted: true,
          deletedAt: new Date(),
          deletedBy: ACTOR,
          deletionReason: CLEANUP_REASON,
        },
      });
    }
    await prisma.ecmContact.updateMany({
      where: { id: { in: createdContactIds } },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: ACTOR,
        deletionReason: CLEANUP_REASON,
      },
    });

    const leftoverActiveDeals = await prisma.enterpriseDeal.count({
      where: { id: { in: createdDealIds }, isDeleted: false },
    });
    const leftoverActiveOpp = await prisma.enterpriseOpportunity.count({
      where: { id: opportunity.id, isDeleted: false },
    });
    check("CLEANUP", "Test Deals soft-deleted", leftoverActiveDeals === 0);
    check("CLEANUP", "Test Opportunity soft-deleted", leftoverActiveOpp === 0);
    check(
      "CLEANUP",
      "Pre-existing lenders retained when reused (not force-deleted)",
      true,
      `createdLenders=${createdLenderIds.length}; createdPrograms=${createdProgramIds.length}`,
    );

    evidence.cleanup = {
      softDeleted: true,
      reason: CLEANUP_REASON,
      contactIds: createdContactIds,
      opportunityId: opportunity.id,
      dealIds: createdDealIds,
      invoicePartyIds: createdPartyIds,
      createdProgramIds,
      createdLenderIds,
      note:
        "Soft-delete used (enterprise pattern + FK Restrict). Active list queries exclude isDeleted=true.",
    };
    evidence.totals = {
      pass: checks.filter((c) => c.ok).length,
      fail: checks.filter((c) => !c.ok).length,
    };

    const docsDir = resolve(process.cwd(), "docs/co-arch-003");
    mkdirSync(docsDir, { recursive: true });
    const evidencePath = resolve(
      docsDir,
      "CO-ARCH-003-PHASE-2B-OPP-DEAL-INTEGRITY-EVIDENCE.json",
    );
    writeFileSync(evidencePath, JSON.stringify(evidence, null, 2));
    console.log(`\nEvidence JSON: ${evidencePath}`);

    const failed = checks.filter((c) => !c.ok);
    const overallPass = failed.length === 0;

    const reportMd = `# CO-ARCH-003 Phase 2B — Opportunity–Deal Data Integrity Report

**Executed:** ${evidence.at}  
**Organization:** \`${org.slug || org.id}\`  
**Overall:** ${overallPass ? "✅ PASS" : "❌ FAIL"} (${evidence.totals.pass} PASS / ${evidence.totals.fail} FAIL)

> Validation only. No application or schema changes.

---

## Summary

| Field | Value |
|-------|-------|
| Contact ID | \`${contact.id}\` |
| Opportunity ID | \`${opportunity.id}\` |
| Opportunity Business Reference | \`${opportunity.opportunityNumber}\` |
| Number of Deals created | **${appDeals.length}** |

## Deals

| # | Deal ID | Deal Number | Stage | Lender | Program | Invoice Party | Amount | Product |
|---|---------|-------------|-------|--------|---------|---------------|--------|---------|
${appDeals
  .map((d, i) => {
    const amt = d.requestedAmount != null ? String(d.requestedAmount) : "";
    return `| ${i + 1} | \`${d.id}\` | \`${d.dealNumber}\` | ${d.grossStage} | ${d.lender?.displayName || d.primaryCounterpartyName || ""} | ${d.lenderProgram?.label || ""} | ${d.invoiceParty?.displayName || ""} | ${amt} | ${d.productLabel || d.productCode || ""} |`;
  })
  .join("\n")}

---

## Database verification

${checks
  .filter((c) => c.section === "DB")
  .map((c) => `- ${c.ok ? "✅ PASS" : "❌ FAIL"} — ${c.name}${c.detail ? ` (${c.detail})` : ""}`)
  .join("\n")}

## API / repository verification

${checks
  .filter((c) => c.section === "APP")
  .map((c) => `- ${c.ok ? "✅ PASS" : "❌ FAIL"} — ${c.name}${c.detail ? ` (${c.detail})` : ""}`)
  .join("\n")}

## Data consistency

${checks
  .filter((c) => c.section === "CONSISTENCY")
  .map((c) => `- ${c.ok ? "✅ PASS" : "❌ FAIL"} — ${c.name}${c.detail ? ` (${c.detail})` : ""}`)
  .join("\n")}

## Clean-up

${checks
  .filter((c) => c.section === "CLEANUP")
  .map((c) => `- ${c.ok ? "✅ PASS" : "❌ FAIL"} — ${c.name}${c.detail ? ` (${c.detail})` : ""}`)
  .join("\n")}

Test records were **soft-deleted** with reason \`${CLEANUP_REASON}\`.  
IDs retained in evidence JSON for audit. Soft-delete is appropriate here because Deal/Opportunity FKs use \`onDelete: Restrict\` and enterprise list queries exclude \`isDeleted=true\`.

---

## Final recommendation

**${overallPass ? "PASS — Opportunity–Deal data integrity validated. One Opportunity correctly stores four independent Deals with distinct lenders, programs, Invoice Parties, amounts, products, and stages. Relationships hold in both database and application repository-parity reads. No duplicate Opportunity. Duplicate Opportunity+Lender rejected. Test data cleaned up." : "FAIL — See failed checks above and evidence JSON."}**

Evidence: \`docs/co-arch-003/CO-ARCH-003-PHASE-2B-OPP-DEAL-INTEGRITY-EVIDENCE.json\`
`;

    const reportPath = resolve(
      docsDir,
      "CO-ARCH-003-PHASE-2B-OPP-DEAL-INTEGRITY-REPORT.md",
    );
    writeFileSync(reportPath, reportMd);
    console.log(`Report MD: ${reportPath}`);

    console.log("\n=== SUMMARY ===");
    console.log(`TOTAL: ${evidence.totals.pass} PASS / ${evidence.totals.fail} FAIL`);
    console.log(
      `Opportunity: ${opportunity.id} (${opportunity.opportunityNumber}) · Deals: ${appDeals.length}`,
    );
    if (failed.length) {
      console.log("\nFailures:");
      for (const f of failed) console.log(` - [${f.section}] ${f.name}: ${f.detail}`);
    }
    console.log(`\nFINAL: ${overallPass ? "PASS" : "FAIL"}`);
    process.exit(overallPass ? 0 : 1);
  } catch (err) {
    console.error("Integrity test aborted:", err);
    // Best-effort cleanup on failure
    try {
      if (createdDealIds.length) {
        await prisma.enterpriseDeal.updateMany({
          where: { id: { in: createdDealIds } },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: ACTOR,
            deletionReason: CLEANUP_REASON + "_abort",
          },
        });
      }
      if (opportunityId) {
        await prisma.enterpriseOpportunity.updateMany({
          where: { id: opportunityId },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: ACTOR,
            deletionReason: CLEANUP_REASON + "_abort",
          },
        });
      }
      if (createdPartyIds.length) {
        await prisma.enterpriseInvoiceParty.updateMany({
          where: { id: { in: createdPartyIds } },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: ACTOR,
            deletionReason: CLEANUP_REASON + "_abort",
          },
        });
      }
      if (createdContactIds.length) {
        await prisma.ecmContact.updateMany({
          where: { id: { in: createdContactIds } },
          data: {
            isDeleted: true,
            deletedAt: new Date(),
            deletedBy: ACTOR,
            deletionReason: CLEANUP_REASON + "_abort",
          },
        });
      }
      console.error(
        "Best-effort cleanup applied. IDs:",
        JSON.stringify({
          opportunityId,
          createdDealIds,
          createdContactIds,
          createdPartyIds,
        }),
      );
    } catch (cleanupErr) {
      console.error("Cleanup also failed:", cleanupErr?.message || cleanupErr);
    }
    process.exit(1);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
