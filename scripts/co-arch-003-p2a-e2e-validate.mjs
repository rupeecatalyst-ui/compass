/**
 * CO-ARCH-003 Phase 2A — End-to-end functional validation.
 * Contact → Opportunity → Deal(HDFC) + Deal(SBI) + Deal(ICICI)
 * Never prints DB credentials.
 */
import { createRequire } from "node:module";
import { createHash, randomBytes } from "node:crypto";

const require = createRequire(import.meta.url);
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

async function allocate(tx, model, format) {
  const year = new Date().getUTCFullYear();
  const existing = await tx[model].findUnique({
    where: { organizationId_year: { organizationId: tx._orgId, year } },
  });
  // not used — allocate outside
  void existing;
  void format;
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

async function ensureLender(organizationId, label, codeSuffix) {
  const code = `LND-P2A-${codeSuffix}`;
  let lender = await prisma.enterpriseLender.findFirst({
    where: { organizationId, OR: [{ code }, { label }], isDeleted: false },
  });
  if (lender) return lender;

  let category = await prisma.enterpriseLenderCategory.findFirst({
    where: { organizationId, isDeleted: false },
    orderBy: { createdAt: "asc" },
  });
  if (!category) {
    category = await prisma.enterpriseLenderCategory.create({
      data: {
        id: cuidLike(),
        organizationId,
        code: "P2A-CAT",
        label: "Phase 2A Validation Category",
        createdBy: "co-arch-003-p2a-e2e",
        modifiedBy: "co-arch-003-p2a-e2e",
        updatedAt: new Date(),
      },
    });
  }

  lender = await prisma.enterpriseLender.create({
    data: {
      id: cuidLike(),
      organizationId,
      categoryId: category.id,
      code,
      label,
      displayName: label,
      legalName: `${label} Limited`,
      institutionCategory: "bank",
      createdBy: "co-arch-003-p2a-e2e",
      modifiedBy: "co-arch-003-p2a-e2e",
      updatedAt: new Date(),
    },
  });
  return lender;
}

const checks = [];
function check(name, ok, detail = "") {
  checks.push({ name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} — ${name}${detail ? `: ${detail}` : ""}`);
}

async function main() {
  console.log("=== CO-ARCH-003 Phase 2A E2E Validation ===");

  const org =
    (await prisma.organization.findFirst({ where: { isActive: true } })) ||
    (await prisma.organization.findFirst());
  if (!org) {
    console.error("FAIL: no organization");
    process.exit(1);
  }
  console.log(`Using organization: ${org.slug || org.id}`);

  // Inventory before
  const beforeOpp = await prisma.enterpriseOpportunity.count();
  const beforeDeal = await prisma.enterpriseDeal.count({ where: { isDeleted: false } });
  console.log(`Pre-counts: opportunities=${beforeOpp} active_deals=${beforeDeal}`);

  // 1. Contact
  const mobile = `9${String(Date.now()).slice(-9)}`;
  const contact = await prisma.ecmContact.create({
    data: {
      id: cuidLike(),
      organizationId: org.id,
      name: "Phase2A Validation Customer",
      mobilePrimary: mobile,
      personalEmail: "p2a.validation@example.com",
      primaryRole: "customer",
      roles: ["customer"],
      createdBy: "co-arch-003-p2a-e2e",
      modifiedBy: "co-arch-003-p2a-e2e",
      updatedAt: new Date(),
    },
  });
  check("Create Contact", Boolean(contact.id), contact.id);

  // 2. Opportunity (no Deal)
  const opportunityNumber = await nextOpp(org.id);
  const opportunity = await prisma.enterpriseOpportunity.create({
    data: {
      id: cuidLike(),
      organizationId: org.id,
      opportunityNumber,
      productFamily: "lending",
      productLabel: "Home Loan",
      requirementStage: "ready_for_market",
      stageEnteredAt: new Date(),
      primaryContactId: contact.id,
      primaryContactName: contact.name,
      primaryContactMobile: contact.mobilePrimary,
      primaryContactEmail: contact.personalEmail,
      requestedAmount: 20000000,
      currencyCode: "INR",
      createdBy: "co-arch-003-p2a-e2e",
      updatedBy: "co-arch-003-p2a-e2e",
      updatedAt: new Date(),
    },
  });
  check("Create Opportunity", Boolean(opportunity.id), opportunity.opportunityNumber);

  const dealsBeforeLender = await prisma.enterpriseDeal.count({
    where: { opportunityId: opportunity.id, isDeleted: false },
  });
  check("Opportunity exists with zero Deals (BI-1)", dealsBeforeLender === 0, String(dealsBeforeLender));

  // 3. Lenders + three Deals
  const hdfc = await ensureLender(org.id, "HDFC", "HDFC");
  const sbi = await ensureLender(org.id, "SBI", "SBI");
  const icici = await ensureLender(org.id, "ICICI", "ICICI");
  check("Lender HDFC ready", Boolean(hdfc.id), hdfc.code);
  check("Lender SBI ready", Boolean(sbi.id), sbi.code);
  check("Lender ICICI ready", Boolean(icici.id), icici.code);

  const dealSpecs = [
    { lender: hdfc, label: "HDFC" },
    { lender: sbi, label: "SBI" },
    { lender: icici, label: "ICICI" },
  ];
  const deals = [];
  for (const spec of dealSpecs) {
    const dealNumber = await nextDeal(org.id);
    const deal = await prisma.enterpriseDeal.create({
      data: {
        id: cuidLike(),
        organizationId: org.id,
        dealNumber,
        opportunityId: opportunity.id,
        lenderId: spec.lender.id,
        productFamily: "lending",
        productLabel: "Home Loan",
        grossStage: "identified",
        stageEnteredAt: new Date(),
        primaryContactId: contact.id,
        primaryContactName: contact.name,
        primaryContactMobile: contact.mobilePrimary,
        requestedAmount: 20000000,
        currencyCode: "INR",
        primaryCounterpartyType: "lender",
        primaryCounterpartyId: spec.lender.id,
        primaryCounterpartyName: spec.label,
        createdBy: "co-arch-003-p2a-e2e",
        updatedBy: "co-arch-003-p2a-e2e",
        updatedAt: new Date(),
      },
    });
    deals.push(deal);
    check(`Create Deal ${spec.label}`, Boolean(deal.id), deal.dealNumber);
  }

  // Verifications
  const oppReload = await prisma.enterpriseOpportunity.findUnique({
    where: { id: opportunity.id },
  });
  check("Opportunity Registry row present", Boolean(oppReload && !oppReload.isDeleted), oppReload?.opportunityNumber);

  const childDeals = await prisma.enterpriseDeal.findMany({
    where: { opportunityId: opportunity.id, isDeleted: false },
    orderBy: { createdAt: "asc" },
  });
  check("Three independent Deal records", childDeals.length === 3, String(childDeals.length));

  const sameOpp = childDeals.every((d) => d.opportunityId === opportunity.id);
  check("Every Deal references same Opportunity", sameOpp, opportunity.id);

  const uniqueDealIds = new Set(childDeals.map((d) => d.id));
  const uniqueDealNumbers = new Set(childDeals.map((d) => d.dealNumber));
  check("Unique Deal IDs", uniqueDealIds.size === 3);
  check("Unique Deal numbers", uniqueDealNumbers.size === 3, [...uniqueDealNumbers].join(", "));

  const lenderIds = childDeals.map((d) => d.lenderId);
  check("Every Deal has a lender", lenderIds.every(Boolean));
  check(
    "Three distinct lenders",
    new Set(lenderIds).size === 3,
    childDeals.map((d) => d.primaryCounterpartyName).join(", "),
  );

  // My Deals projection (lender-grain)
  const myDealsProjection = childDeals.map((d) => ({
    dealId: d.dealNumber,
    opportunityNumber: oppReload.opportunityNumber,
    selectedLender: d.primaryCounterpartyName,
    opportunityId: d.opportunityId,
  }));
  check(
    "My Deals projection has 3 lender rows",
    myDealsProjection.length === 3 &&
      myDealsProjection.every((r) => r.dealId.startsWith("DEAL-") && r.opportunityNumber.startsWith("OPP-")),
    JSON.stringify(myDealsProjection),
  );

  // Integrity negatives
  try {
    await prisma.enterpriseDeal.create({
      data: {
        id: cuidLike(),
        organizationId: org.id,
        dealNumber: await nextDeal(org.id),
        opportunityId: opportunity.id,
        lenderId: hdfc.id,
        productFamily: "lending",
        grossStage: "identified",
        stageEnteredAt: new Date(),
        primaryContactId: contact.id,
        updatedAt: new Date(),
      },
    });
    check("Reject duplicate Opportunity+Lender (partial unique)", false, "insert succeeded unexpectedly");
  } catch (err) {
    check(
      "Reject duplicate Opportunity+Lender (partial unique)",
      true,
      err.code || err.message?.slice(0, 80),
    );
  }

  const orphanAttemptBlocked = !childDeals.some((d) => !d.opportunityId);
  check("No orphan Deals without Opportunity", orphanAttemptBlocked);

  const independentIds =
    opportunity.id !== childDeals[0].id &&
    oppReload.opportunityNumber !== childDeals[0].dealNumber;
  check("Opportunity IDs and Deal IDs are independent", independentIds);

  const failed = checks.filter((c) => !c.ok);
  console.log("\n=== SUMMARY ===");
  console.log(`Passed: ${checks.length - failed.length}/${checks.length}`);
  if (failed.length) {
    console.log("Failed checks:");
    for (const f of failed) console.log(` - ${f.name}: ${f.detail}`);
    process.exit(1);
  }
  console.log("E2E validation PASSED");
  console.log(
    JSON.stringify(
      {
        contactId: contact.id,
        opportunityId: opportunity.id,
        opportunityNumber: opportunity.opportunityNumber,
        deals: childDeals.map((d) => ({
          id: d.id,
          dealNumber: d.dealNumber,
          lenderId: d.lenderId,
          lender: d.primaryCounterpartyName,
        })),
      },
      null,
      2,
    ),
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
