/**
 * READ-ONLY — CO-ARCH-003 Phase 2B pre-Sprint-3 database state verification.
 * Does not create, update, or delete any records.
 * Never prints DB credentials.
 *
 * Run: node scripts/run-with-db-env.mjs scripts/co-arch-003-p2b-db-state-readonly.mjs
 */
import { createRequire } from "node:module";
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

const TEST_ACTORS = [
  "co-arch-003-p2a-e2e",
  "co-arch-003-p2b-s1-bfv",
  "co-arch-003-p2b-integrity",
];

const TEST_NAME_PATTERNS = [
  "%P2B Integrity%",
  "%P2B-S1%",
  "%Phase2A Validation%",
  "%Phase 2A Validation%",
  "%p2a.validation%",
  "%p2b.integrity%",
  "%p2b.s1%",
  "%p2b.ip.%",
];

function yn(deleted) {
  return deleted ? "Soft Deleted" : "Active";
}

function fmtDate(d) {
  if (!d) return null;
  return new Date(d).toISOString();
}

async function main() {
  console.log("=== READ-ONLY DB STATE VERIFICATION (pre Sprint 3) ===\n");

  const org =
    (await prisma.organization.findFirst({ where: { isActive: true } })) ||
    (await prisma.organization.findFirst());
  if (!org) {
    console.error("FAIL: no organization");
    process.exit(1);
  }
  console.log(`Organization: ${org.slug || org.id}\n`);

  // ---- Opportunities (all) ----
  const opportunities = await prisma.enterpriseOpportunity.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      opportunityNumber: true,
      primaryContactName: true,
      primaryContactId: true,
      requirementStage: true,
      lifecycleStatus: true,
      fulfilmentStatus: true,
      archived: true,
      isDeleted: true,
      deletedAt: true,
      deletedBy: true,
      deletionReason: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  // ---- Deals (all) ----
  const deals = await prisma.enterpriseDeal.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      dealNumber: true,
      opportunityId: true,
      lenderId: true,
      grossStage: true,
      lifecycleStatus: true,
      invoicePartyId: true,
      invoicePartySpecify: true,
      primaryCounterpartyName: true,
      primaryContactName: true,
      isDeleted: true,
      deletedAt: true,
      deletedBy: true,
      deletionReason: true,
      createdBy: true,
      createdAt: true,
      updatedAt: true,
      lender: { select: { id: true, displayName: true, label: true, code: true } },
      invoiceParty: {
        select: { id: true, displayName: true, isDeleted: true },
      },
      opportunity: {
        select: { id: true, opportunityNumber: true, isDeleted: true },
      },
    },
  });

  // ---- Invoice parties ----
  const invoiceParties = await prisma.enterpriseInvoiceParty.findMany({
    where: { organizationId: org.id },
    orderBy: { createdAt: "asc" },
    select: {
      id: true,
      displayName: true,
      partyType: true,
      enabled: true,
      isDeleted: true,
      deletedAt: true,
      deletedBy: true,
      deletionReason: true,
      createdBy: true,
      createdAt: true,
      contactId: true,
      companyId: true,
    },
  });

  // ---- Counts ----
  const activeOpps = opportunities.filter((o) => !o.isDeleted);
  const deletedOpps = opportunities.filter((o) => o.isDeleted);
  const activeDeals = deals.filter((d) => !d.isDeleted);
  const deletedDeals = deals.filter((d) => d.isDeleted);
  const activeParties = invoiceParties.filter((p) => !p.isDeleted);
  const deletedParties = invoiceParties.filter((p) => p.isDeleted);

  // ---- Test data detection ----
  const testOpps = opportunities.filter(
    (o) =>
      TEST_ACTORS.includes(o.createdBy || "") ||
      TEST_ACTORS.includes(o.deletedBy || "") ||
      (o.deletionReason || "").includes("p2b") ||
      (o.deletionReason || "").includes("p2a") ||
      (o.primaryContactName || "").toLowerCase().includes("integrity") ||
      (o.primaryContactName || "").toLowerCase().includes("p2b") ||
      (o.primaryContactName || "").toLowerCase().includes("phase2a") ||
      (o.primaryContactName || "").toLowerCase().includes("validation"),
  );

  const testDeals = deals.filter(
    (d) =>
      TEST_ACTORS.includes(d.createdBy || "") ||
      TEST_ACTORS.includes(d.deletedBy || "") ||
      (d.deletionReason || "").includes("p2b") ||
      (d.deletionReason || "").includes("p2a"),
  );

  const testParties = invoiceParties.filter(
    (p) =>
      TEST_ACTORS.includes(p.createdBy || "") ||
      TEST_ACTORS.includes(p.deletedBy || "") ||
      (p.deletionReason || "").includes("p2b") ||
      (p.deletionReason || "").includes("p2a") ||
      (p.displayName || "").toLowerCase().includes("integrity") ||
      (p.displayName || "").toLowerCase().includes("p2b"),
  );

  // Contacts created by test actors or matching name patterns
  const testContactsByActor = await prisma.ecmContact.findMany({
    where: {
      organizationId: org.id,
      OR: [
        { createdBy: { in: TEST_ACTORS } },
        { deletedBy: { in: TEST_ACTORS } },
        { name: { contains: "P2B Integrity", mode: "insensitive" } },
        { name: { contains: "P2B-S1", mode: "insensitive" } },
        { name: { contains: "Phase2A Validation", mode: "insensitive" } },
        { name: { contains: "Invoice Party Contact", mode: "insensitive" } },
        { personalEmail: { contains: "p2b.integrity", mode: "insensitive" } },
        { personalEmail: { contains: "p2b.s1", mode: "insensitive" } },
        { personalEmail: { contains: "p2a.validation", mode: "insensitive" } },
        { personalEmail: { contains: "p2b.ip.", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      name: true,
      personalEmail: true,
      isDeleted: true,
      deletedAt: true,
      deletedBy: true,
      deletionReason: true,
      createdBy: true,
      createdAt: true,
    },
    orderBy: { createdAt: "asc" },
  });

  const testCompanies = await prisma.ecmCompany.findMany({
    where: {
      organizationId: org.id,
      OR: [
        { createdBy: { in: TEST_ACTORS } },
        { deletedBy: { in: TEST_ACTORS } },
        { companyName: { contains: "P2B", mode: "insensitive" } },
        { companyName: { contains: "Integrity", mode: "insensitive" } },
        { companyName: { contains: "Phase2A", mode: "insensitive" } },
      ],
    },
    select: {
      id: true,
      companyName: true,
      isDeleted: true,
      deletedAt: true,
      deletedBy: true,
      deletionReason: true,
      createdBy: true,
      createdAt: true,
    },
  });

  const remainingTestOpps = testOpps.filter((o) => !o.isDeleted);
  const remainingTestDeals = testDeals.filter((d) => !d.isDeleted);
  const remainingTestParties = testParties.filter((p) => !p.isDeleted);
  const remainingTestContacts = testContactsByActor.filter((c) => !c.isDeleted);
  const remainingTestCompanies = testCompanies.filter((c) => !c.isDeleted);

  const softDeletedTestOpps = testOpps.filter((o) => o.isDeleted);
  const softDeletedTestDeals = testDeals.filter((d) => d.isDeleted);
  const softDeletedTestParties = testParties.filter((p) => p.isDeleted);
  const softDeletedTestContacts = testContactsByActor.filter((c) => c.isDeleted);
  const softDeletedTestCompanies = testCompanies.filter((c) => c.isDeleted);

  // Cleanup process summary from deletionReason / deletedBy
  const cleanupJobs = new Map();
  function noteCleanup(kind, row) {
    if (!row.isDeleted) return;
    const key = `${row.deletedBy || "unknown"}|${row.deletionReason || "unknown"}`;
    if (!cleanupJobs.has(key)) {
      cleanupJobs.set(key, {
        deletedBy: row.deletedBy || null,
        deletionReason: row.deletionReason || null,
        counts: { opportunities: 0, deals: 0, invoiceParties: 0, contacts: 0, companies: 0 },
      });
    }
    cleanupJobs.get(key).counts[kind] += 1;
  }
  for (const o of softDeletedTestOpps) noteCleanup("opportunities", o);
  for (const d of softDeletedTestDeals) noteCleanup("deals", d);
  for (const p of softDeletedTestParties) noteCleanup("invoiceParties", p);
  for (const c of softDeletedTestContacts) noteCleanup("contacts", c);
  for (const c of softDeletedTestCompanies) noteCleanup("companies", c);

  const report = {
    at: new Date().toISOString(),
    mode: "READ_ONLY",
    organizationId: org.id,
    organizationSlug: org.slug || null,
    opportunities: {
      total: opportunities.length,
      active: activeOpps.length,
      softDeleted: deletedOpps.length,
      rows: opportunities.map((o) => ({
        opportunityId: o.id,
        businessReference: o.opportunityNumber,
        customerName: o.primaryContactName,
        currentStatus: o.lifecycleStatus,
        requirementStage: o.requirementStage,
        fulfilmentStatus: o.fulfilmentStatus,
        createdDate: fmtDate(o.createdAt),
        activeOrSoftDeleted: yn(o.isDeleted),
        isDeleted: o.isDeleted,
        deletedBy: o.deletedBy,
        deletionReason: o.deletionReason,
        createdBy: o.createdBy,
      })),
    },
    deals: {
      total: deals.length,
      active: activeDeals.length,
      softDeleted: deletedDeals.length,
      rows: deals.map((d) => ({
        dealId: d.id,
        businessReference: d.dealNumber,
        opportunityReference:
          d.opportunity?.opportunityNumber || d.opportunityId || null,
        opportunityId: d.opportunityId,
        lender: d.lender?.displayName || d.lender?.label || d.primaryCounterpartyName,
        currentStage: d.grossStage,
        invoiceParty:
          d.invoiceParty?.displayName || d.invoicePartySpecify || d.invoicePartyId || null,
        invoicePartyId: d.invoicePartyId,
        activeOrSoftDeleted: yn(d.isDeleted),
        isDeleted: d.isDeleted,
        deletedBy: d.deletedBy,
        deletionReason: d.deletionReason,
        createdBy: d.createdBy,
        createdDate: fmtDate(d.createdAt),
      })),
    },
    invoiceParties: {
      total: invoiceParties.length,
      active: activeParties.length,
      softDeleted: deletedParties.length,
    },
    testData: {
      opportunities: {
        totalMatched: testOpps.length,
        softDeleted: softDeletedTestOpps.length,
        stillActive: remainingTestOpps.map((o) => ({
          id: o.id,
          opportunityNumber: o.opportunityNumber,
          createdBy: o.createdBy,
        })),
      },
      deals: {
        totalMatched: testDeals.length,
        softDeleted: softDeletedTestDeals.length,
        stillActive: remainingTestDeals.map((d) => ({
          id: d.id,
          dealNumber: d.dealNumber,
          createdBy: d.createdBy,
        })),
      },
      invoiceParties: {
        totalMatched: testParties.length,
        softDeleted: softDeletedTestParties.length,
        stillActive: remainingTestParties.map((p) => ({
          id: p.id,
          displayName: p.displayName,
          createdBy: p.createdBy,
        })),
      },
      contacts: {
        totalMatched: testContactsByActor.length,
        softDeleted: softDeletedTestContacts.length,
        stillActive: remainingTestContacts.map((c) => ({
          id: c.id,
          name: c.name,
          email: c.personalEmail,
          createdBy: c.createdBy,
        })),
      },
      companies: {
        totalMatched: testCompanies.length,
        softDeleted: softDeletedTestCompanies.length,
        stillActive: remainingTestCompanies.map((c) => ({
          id: c.id,
          companyName: c.companyName,
          createdBy: c.createdBy,
        })),
      },
      cleanupJobs: [...cleanupJobs.values()],
    },
    integrity: {
      activeOpportunities: activeOpps.length,
      softDeletedOpportunities: deletedOpps.length,
      activeDeals: activeDeals.length,
      softDeletedDeals: deletedDeals.length,
      activeInvoiceParties: activeParties.length,
      softDeletedInvoiceParties: deletedParties.length,
    },
    readyForSprint3: {
      remainingActiveTestRecords:
        remainingTestOpps.length +
        remainingTestDeals.length +
        remainingTestParties.length +
        remainingTestContacts.length +
        remainingTestCompanies.length,
      clean:
        remainingTestOpps.length === 0 &&
        remainingTestDeals.length === 0 &&
        remainingTestParties.length === 0 &&
        remainingTestContacts.length === 0 &&
        remainingTestCompanies.length === 0,
    },
  };

  // Console report
  console.log("------------------------------------------------------------");
  console.log("1. OPPORTUNITIES");
  console.log("------------------------------------------------------------");
  console.log(`Total Opportunities: ${opportunities.length}`);
  console.log(`  Active: ${activeOpps.length} | Soft Deleted: ${deletedOpps.length}\n`);
  for (const o of opportunities) {
    console.log(
      [
        `- ${o.opportunityNumber}`,
        `id=${o.id}`,
        `customer=${o.primaryContactName || "(none)"}`,
        `status=${o.lifecycleStatus}`,
        `stage=${o.requirementStage}`,
        `created=${fmtDate(o.createdAt)}`,
        yn(o.isDeleted),
        o.isDeleted ? `by=${o.deletedBy} reason=${o.deletionReason}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    );
  }

  console.log("\n------------------------------------------------------------");
  console.log("2. DEALS");
  console.log("------------------------------------------------------------");
  console.log(`Total Deals: ${deals.length}`);
  console.log(`  Active: ${activeDeals.length} | Soft Deleted: ${deletedDeals.length}\n`);
  for (const d of deals) {
    console.log(
      [
        `- ${d.dealNumber}`,
        `id=${d.id}`,
        `opp=${d.opportunity?.opportunityNumber || d.opportunityId || "(none)"}`,
        `lender=${d.lender?.displayName || d.primaryCounterpartyName || "(none)"}`,
        `stage=${d.grossStage}`,
        `invoiceParty=${d.invoiceParty?.displayName || d.invoicePartySpecify || "(none)"}`,
        yn(d.isDeleted),
        d.isDeleted ? `by=${d.deletedBy} reason=${d.deletionReason}` : "",
      ]
        .filter(Boolean)
        .join(" | "),
    );
  }

  console.log("\n------------------------------------------------------------");
  console.log("3. TEST DATA (validation artifacts)");
  console.log("------------------------------------------------------------");
  console.log(
    `Opportunities matched as test: ${testOpps.length} (soft-deleted ${softDeletedTestOpps.length}, still active ${remainingTestOpps.length})`,
  );
  console.log(
    `Deals matched as test: ${testDeals.length} (soft-deleted ${softDeletedTestDeals.length}, still active ${remainingTestDeals.length})`,
  );
  console.log(
    `Invoice Parties matched as test: ${testParties.length} (soft-deleted ${softDeletedTestParties.length}, still active ${remainingTestParties.length})`,
  );
  console.log(
    `Contacts matched as test: ${testContactsByActor.length} (soft-deleted ${softDeletedTestContacts.length}, still active ${remainingTestContacts.length})`,
  );
  console.log(
    `Companies matched as test: ${testCompanies.length} (soft-deleted ${softDeletedTestCompanies.length}, still active ${remainingTestCompanies.length})`,
  );

  if (cleanupJobs.size) {
    console.log("\nCleanup jobs / processes observed:");
    for (const job of cleanupJobs.values()) {
      console.log(
        `  - deletedBy=${job.deletedBy} reason=${job.deletionReason} counts=${JSON.stringify(job.counts)}`,
      );
    }
  }

  if (remainingTestOpps.length || remainingTestDeals.length || remainingTestParties.length || remainingTestContacts.length || remainingTestCompanies.length) {
    console.log("\nREMAINING ACTIVE TEST RECORDS:");
    for (const o of remainingTestOpps) console.log(`  OPP ACTIVE ${o.opportunityNumber} ${o.id}`);
    for (const d of remainingTestDeals) console.log(`  DEAL ACTIVE ${d.dealNumber} ${d.id}`);
    for (const p of remainingTestParties) console.log(`  PARTY ACTIVE ${p.displayName} ${p.id}`);
    for (const c of remainingTestContacts) console.log(`  CONTACT ACTIVE ${c.name} ${c.id}`);
    for (const c of remainingTestCompanies) console.log(`  COMPANY ACTIVE ${c.companyName} ${c.id}`);
  } else {
    console.log("\nNo remaining ACTIVE test Opportunities / Deals / Invoice Parties / Contacts / Companies.");
  }

  console.log("\n------------------------------------------------------------");
  console.log("4. DATABASE INTEGRITY COUNTS");
  console.log("------------------------------------------------------------");
  console.log(`Active Opportunities:        ${activeOpps.length}`);
  console.log(`Soft Deleted Opportunities:  ${deletedOpps.length}`);
  console.log(`Active Deals:                ${activeDeals.length}`);
  console.log(`Soft Deleted Deals:          ${deletedDeals.length}`);
  console.log(`Active Invoice Parties:      ${activeParties.length}`);
  console.log(`Soft Deleted Invoice Parties:${deletedParties.length}`);

  console.log("\n------------------------------------------------------------");
  console.log("5. FINAL SUMMARY");
  console.log("------------------------------------------------------------");
  console.log(`Active Opportunities: ${activeOpps.length}`);
  console.log(`Active Deals: ${activeDeals.length}`);
  console.log(`Soft Deleted Opportunities: ${deletedOpps.length}`);
  console.log(`Soft Deleted Deals: ${deletedDeals.length}`);
  console.log(
    `Remaining active test data: ${report.readyForSprint3.remainingActiveTestRecords}`,
  );
  console.log(
    `Database clean for Sprint 3 (no active test artifacts): ${report.readyForSprint3.clean ? "YES" : "NO"}`,
  );

  const docsDir = resolve(process.cwd(), "docs/co-arch-003");
  mkdirSync(docsDir, { recursive: true });
  const outJson = resolve(docsDir, "CO-ARCH-003-PHASE-2B-DB-STATE-READONLY.json");
  writeFileSync(outJson, JSON.stringify(report, null, 2));
  console.log(`\nEvidence written (read-only snapshot): ${outJson}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
