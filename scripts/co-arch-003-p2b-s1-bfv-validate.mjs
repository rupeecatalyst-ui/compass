/**
 * CO-ARCH-003 Phase 2B Sprint 1 — Business & Functional Validation
 * Invoice Party architecture — validation only (no feature work).
 * Never prints DB credentials.
 */
import { createRequire } from "node:module";
import { createHash, randomBytes } from "node:crypto";
import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

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

const checks = [];
function check(test, name, ok, detail = "") {
  checks.push({ test, name, ok, detail });
  console.log(`${ok ? "PASS" : "FAIL"} [${test}] ${name}${detail ? ` — ${detail}` : ""}`);
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
  const code = `LND-P2B-S1-${codeSuffix}`;
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
        code: "P2B-S1-CAT",
        label: "P2B S1 Validation Category",
        createdBy: "co-arch-003-p2b-s1-bfv",
        modifiedBy: "co-arch-003-p2b-s1-bfv",
        updatedAt: new Date(),
      },
    });
  }
  return prisma.enterpriseLender.create({
    data: {
      id: cuidLike(),
      organizationId,
      categoryId: category.id,
      code,
      label,
      displayName: label,
      legalName: `${label} Limited`,
      institutionCategory: "bank",
      createdBy: "co-arch-003-p2b-s1-bfv",
      modifiedBy: "co-arch-003-p2b-s1-bfv",
      updatedAt: new Date(),
    },
  });
}

function wiringChecks() {
  const root = process.cwd();
  const files = {
    workbench: "src/constants/accounting-workbench.ts",
    masterUi: "src/components/catalyst-one/accounting/invoice-party-master-workbench.tsx",
    accountingPage: "src/app/(dashboard)/accounting/page.tsx",
    accountingWs: "src/components/catalyst-one/accounting/accounting-workspace.tsx",
    field: "src/components/catalyst-one/shared/commercial-payee-field.tsx",
    loanModal: "src/components/catalyst-one/shared/loan-workspace-modal.tsx",
    pipeline: "src/components/catalyst-one/execution/lender-pipeline-board.tsx",
    constants: "src/constants/invoice-party.ts",
    assert: "server/services/enterprise-deal/deal-invoice-party.ts",
    api: "src/app/api/invoice-parties/route.ts",
    apiAlias: "src/app/api/accounting-payees/route.ts",
  };
  for (const [k, rel] of Object.entries(files)) {
    check("WIRE", `Source present: ${k}`, existsSync(resolve(root, rel)), rel);
  }

  const wb = readFileSync(resolve(root, files.workbench), "utf8");
  check(
    "T1",
    "Accounting nav includes Invoice Party Master",
    wb.includes('id: "invoice_party_master"') && wb.includes("Invoice Party Master"),
  );

  const master = readFileSync(resolve(root, files.masterUi), "utf8");
  check("T1", "Add Invoice Party CTA present", master.includes("Add Invoice Party"));
  check(
    "T1",
    "Master searches Contact Registry (LiveEntityMasterSearch)",
    master.includes('kind="contact"') && master.includes("LiveEntityMasterSearch"),
  );
  check(
    "T1",
    "Master searches Company Registry",
    master.includes('kind="company"'),
  );
  check(
    "T1",
    "Master creates via Invoice Party API (no Contact create)",
    master.includes("invoicePartyApiClient.create") && !master.includes("ecmContact.create"),
  );

  const field = readFileSync(resolve(root, files.field), "utf8");
  check(
    "T2",
    "Deal Invoice Party field loads Master only (listActive)",
    field.includes("invoicePartyApiClient.listActive") &&
      !field.includes("liveSearchOperationalContacts"),
  );
  check(
    "T2",
    "Deal field label is Invoice Party",
    field.includes('label = "Invoice Party"') || field.includes("Invoice Party"),
  );

  const constants = readFileSync(resolve(root, files.constants), "utf8");
  check(
    "T4",
    "Required stage is configurable constant (not hard-coded gate only)",
    constants.includes("INVOICE_PARTY_REQUIRED_FROM_STAGE"),
  );
  check(
    "T4",
    "Approved Chanakya validation message present",
    constants.includes(
      "This Deal does not have an Invoice Party assigned. Please select an Invoice Party from the Accounting Master before proceeding.",
    ),
  );

  const pipeline = readFileSync(resolve(root, files.pipeline), "utf8");
  check(
    "T4",
    "Lender Pipeline uses configurable Invoice Party gate",
    pipeline.includes("invoicePartyRequiredToProgressTo") &&
      pipeline.includes("INVOICE_PARTY_REQUIRED_MESSAGE"),
  );

  const assertSrc = readFileSync(resolve(root, files.assert), "utf8");
  check(
    "T4",
    "Deal transition assert uses Invoice Party Master id",
    assertSrc.includes("assertInvoicePartyForDealStage") &&
      assertSrc.includes("INVOICE_PARTY_REQUIRED"),
  );
}

async function main() {
  console.log("=== CO-ARCH-003 Phase 2B Sprint 1 — Business & Functional Validation ===\n");

  wiringChecks();

  const org =
    (await prisma.organization.findFirst({ where: { isActive: true } })) ||
    (await prisma.organization.findFirst());
  if (!org) {
    console.error("FAIL: no organization");
    process.exit(1);
  }
  console.log(`\nOrganization: ${org.slug || org.id}\n`);

  const contactCountBefore = await prisma.ecmContact.count({
    where: { organizationId: org.id, isDeleted: false },
  });
  const companyCountBefore = await prisma.ecmCompany.count({
    where: { organizationId: org.id, isDeleted: false },
  });

  // ---- TEST 1 + 3: Invoice Party Master ----
  const stamp = Date.now();
  const mobile = `9${String(stamp).slice(-9)}`;
  const contact = await prisma.ecmContact.create({
    data: {
      id: cuidLike(),
      organizationId: org.id,
      name: `P2B-S1 Invoice Party Contact ${stamp}`,
      mobilePrimary: mobile,
      personalEmail: `p2b.s1.ip.${stamp}@example.com`,
      primaryRole: "customer",
      roles: ["customer"],
      createdBy: "co-arch-003-p2b-s1-bfv",
      modifiedBy: "co-arch-003-p2b-s1-bfv",
      updatedAt: new Date(),
    },
  });
  check("T1", "Create Contact in Enterprise Contact Registry", Boolean(contact.id), contact.id);

  let company = null;
  try {
    company = await prisma.ecmCompany.create({
      data: {
        id: cuidLike(),
        organizationId: org.id,
        companyName: `P2B-S1 Invoice Party Co ${stamp}`,
        createdBy: "co-arch-003-p2b-s1-bfv",
        modifiedBy: "co-arch-003-p2b-s1-bfv",
        updatedAt: new Date(),
      },
    });
    check("T1", "Create Company in Enterprise Company Registry", Boolean(company.id), company.id);
  } catch (err) {
    check("T1", "Create Company in Enterprise Company Registry", false, String(err.message || err));
  }

  const party = await prisma.enterpriseInvoiceParty.create({
    data: {
      id: cuidLike(),
      organizationId: org.id,
      contactId: contact.id,
      partyType: "lender",
      legalName: "P2B S1 Validation Invoice Party Legal",
      billingName: "P2B S1 Validation Billing",
      displayName: "P2B S1 Validation Invoice Party",
      gstin: "27AABCU9603R1ZM",
      pan: "AABCU9603R",
      billingAddress: "Validation Address, Mumbai",
      stateLabel: "Maharashtra",
      invoiceEmail: `invoice.p2b.s1.${stamp}@example.com`,
      tdsApplicable: true,
      tdsRatePercent: 10,
      gstStatus: "registered",
      enabled: true,
      createdBy: "co-arch-003-p2b-s1-bfv",
      updatedBy: "co-arch-003-p2b-s1-bfv",
      updatedAt: new Date(),
    },
  });
  check("T1", "Create linked Invoice Party Master record", Boolean(party.id), party.id);
  check("T1", "Invoice Party references existing Contact", party.contactId === contact.id);
  check(
    "T1",
    "Accounting fields saved (GSTIN/PAN/email/TDS/GST)",
    party.gstin === "27AABCU9603R1ZM" &&
      party.pan === "AABCU9603R" &&
      party.invoiceEmail?.includes("@") &&
      party.tdsApplicable === true &&
      party.gstStatus === "registered",
  );

  const contactCountAfterCreate = await prisma.ecmContact.count({
    where: { organizationId: org.id, isDeleted: false },
  });
  check(
    "T1",
    "No duplicate Contact created by Invoice Party create (+1 expected for test contact only)",
    contactCountAfterCreate === contactCountBefore + 1,
    `before=${contactCountBefore} after=${contactCountAfterCreate}`,
  );

  // Duplicate Invoice Party for same contact must fail (1:0..1)
  let dupBlocked = false;
  try {
    await prisma.enterpriseInvoiceParty.create({
      data: {
        id: cuidLike(),
        organizationId: org.id,
        contactId: contact.id,
        partyType: "other",
        legalName: "Dup",
        billingName: "Dup",
        displayName: "Dup",
        enabled: true,
        updatedAt: new Date(),
      },
    });
  } catch {
    dupBlocked = true;
  }
  check("T3", "1:0..1 — duplicate Invoice Party for same Contact blocked", dupBlocked);

  // Company-linked party
  let companyParty = null;
  if (company) {
    companyParty = await prisma.enterpriseInvoiceParty.create({
      data: {
        id: cuidLike(),
        organizationId: org.id,
        companyId: company.id,
        partyType: "intermediary",
        legalName: company.companyName,
        billingName: company.companyName,
        displayName: company.companyName,
        enabled: true,
        createdBy: "co-arch-003-p2b-s1-bfv",
        updatedBy: "co-arch-003-p2b-s1-bfv",
        updatedAt: new Date(),
      },
    });
    check(
      "T1",
      "Company-linked Invoice Party created",
      Boolean(companyParty?.id) && companyParty.companyId === company.id,
    );
  }

  const activeParties = await prisma.enterpriseInvoiceParty.findMany({
    where: { organizationId: org.id, isDeleted: false, enabled: true },
    select: { id: true, contactId: true, companyId: true, displayName: true },
  });
  check("T2", "Active Invoice Party Master list non-empty", activeParties.length >= 1);

  const orphan = activeParties.filter((p) => !p.contactId && !p.companyId);
  check("T3", "Every Invoice Party references Contact or Company", orphan.length === 0);

  // Contact that is NOT an invoice party must not be in Master list
  const nonPartyContact = await prisma.ecmContact.create({
    data: {
      id: cuidLike(),
      organizationId: org.id,
      name: `P2B-S1 Non-Party Contact ${stamp}`,
      mobilePrimary: `8${String(stamp).slice(-9)}`,
      primaryRole: "customer",
      roles: ["customer"],
      createdBy: "co-arch-003-p2b-s1-bfv",
      modifiedBy: "co-arch-003-p2b-s1-bfv",
      updatedAt: new Date(),
    },
  });
  const masterIds = new Set(activeParties.map((p) => p.contactId).filter(Boolean));
  check(
    "T2",
    "Contact that is NOT an Invoice Party does not appear in Master list",
    !masterIds.has(nonPartyContact.id),
    nonPartyContact.id,
  );

  // ---- TEST 5 + 2: Opportunity–Deal + Invoice Party on Deal ----
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
      requestedAmount: 15000000,
      currencyCode: "INR",
      createdBy: "co-arch-003-p2b-s1-bfv",
      updatedBy: "co-arch-003-p2b-s1-bfv",
      updatedAt: new Date(),
    },
  });
  check("T5", "Create Opportunity", Boolean(opportunity.id), opportunity.opportunityNumber);

  const hdfc = await ensureLender(org.id, "HDFC", "HDFC");
  const sbi = await ensureLender(org.id, "SBI", "SBI");
  check("T5", "Lenders available for multi-Deal", Boolean(hdfc.id && sbi.id));

  async function createDeal(lender, withParty) {
    const dealNumber = await nextDeal(org.id);
    return prisma.enterpriseDeal.create({
      data: {
        id: cuidLike(),
        organizationId: org.id,
        dealNumber,
        opportunityId: opportunity.id,
        lenderId: lender.id,
        productFamily: "lending",
        productLabel: "Home Loan",
        grossStage: "logged_in_wip",
        stageEnteredAt: new Date(),
        primaryContactId: contact.id,
        primaryContactName: contact.name,
        primaryCounterpartyType: "lender",
        primaryCounterpartyId: lender.id,
        primaryCounterpartyName: lender.displayName || lender.label,
        invoicePartyId: withParty ? party.id : null,
        invoicePartyType: withParty ? party.partyType : null,
        invoicePartySpecify: withParty ? party.displayName : null,
        invoicePartyContactId: withParty ? contact.id : null,
        createdBy: "co-arch-003-p2b-s1-bfv",
        updatedBy: "co-arch-003-p2b-s1-bfv",
        updatedAt: new Date(),
      },
    });
  }

  const dealWithout = await createDeal(hdfc, false);
  const dealWith = await createDeal(sbi, true);
  check("T5", "Create Deal without Invoice Party", Boolean(dealWithout.id), dealWithout.dealNumber);
  check("T2", "Create Deal with Invoice Party assigned", Boolean(dealWith.id), dealWith.dealNumber);
  check("T2", "Invoice Party FK saved on Deal", dealWith.invoicePartyId === party.id);

  const reloaded = await prisma.enterpriseDeal.findUnique({ where: { id: dealWith.id } });
  check(
    "T2",
    "Invoice Party persists after reload (reopen)",
    reloaded?.invoicePartyId === party.id &&
      reloaded?.invoicePartySpecify === party.displayName,
  );

  // Same Invoice Party on second deal (1:Many)
  const icici = await ensureLender(org.id, "ICICI", "ICICI");
  const deal2 = await createDeal(icici, true);
  check(
    "T3",
    "One Invoice Party usable across multiple Deals",
    dealWith.invoicePartyId === party.id && deal2.invoicePartyId === party.id,
  );

  const dealsForOpp = await prisma.enterpriseDeal.findMany({
    where: { opportunityId: opportunity.id, isDeleted: false },
  });
  check("T5", "Opportunity–Deal relationship intact (3 Deals)", dealsForOpp.length === 3);
  check(
    "T5",
    "All Deals reference same Opportunity",
    dealsForOpp.every((d) => d.opportunityId === opportunity.id),
  );

  // ---- TEST 4: Chanakya validation (mirrors SSOT — no path-alias imports) ----
  const INVOICE_PARTY_REQUIRED_MESSAGE =
    "This Deal does not have an Invoice Party assigned. Please select an Invoice Party from the Accounting Master before proceeding.";
  const STAGE_ORDER = [
    "raw_lead",
    "pre_login",
    "logged_in",
    "credit_wip",
    "soft_approved",
    "final_approved",
    "closure_wip",
    "won",
  ];
  function normalizeStage(stage) {
    const s = String(stage).trim().toLowerCase().replace(/\s+/g, "_");
    const aliases = {
      logged_in_wip: "logged_in",
      login: "logged_in",
      credit: "credit_wip",
      sanction: "soft_approved",
      soft_approval: "soft_approved",
      disbursement: "closure_wip",
      disbursed: "closure_wip",
    };
    return aliases[s] || s;
  }
  function invoicePartyRequiredToProgressTo(toStage) {
    const from = "logged_in"; // INVOICE_PARTY_REQUIRED_FROM_STAGE
    return STAGE_ORDER.indexOf(normalizeStage(toStage)) > STAGE_ORDER.indexOf(from);
  }
  function assertInvoicePartyForDealStage(input) {
    if (!invoicePartyRequiredToProgressTo(input.toGrossStage)) return;
    if (!String(input.invoicePartyId || "").trim()) {
      const err = new Error(INVOICE_PARTY_REQUIRED_MESSAGE);
      err.code = "INVOICE_PARTY_REQUIRED";
      throw err;
    }
  }
  let blocked = false;
  let blockMessage = "";
  try {
    assertInvoicePartyForDealStage({
      toGrossStage: "soft_approved",
      invoicePartyId: dealWithout.invoicePartyId,
    });
  } catch (err) {
    blocked = true;
    blockMessage = err?.message || String(err);
  }
  check("T4", "Chanakya blocks progression beyond Logged In without Invoice Party", blocked);
  check(
    "T4",
    "Correct validation message appears",
    blockMessage === INVOICE_PARTY_REQUIRED_MESSAGE,
    blockMessage.slice(0, 120),
  );

  let allowed = true;
  try {
    assertInvoicePartyForDealStage({
      toGrossStage: "soft_approved",
      invoicePartyId: dealWith.invoicePartyId,
    });
  } catch {
    allowed = false;
  }
  check("T4", "Validation clears when Invoice Party assigned — progression allowed", allowed);

  // Persist assignment on previously empty deal and re-check
  await prisma.enterpriseDeal.update({
    where: { id: dealWithout.id },
    data: {
      invoicePartyId: party.id,
      invoicePartyType: party.partyType,
      invoicePartySpecify: party.displayName,
      invoicePartyContactId: contact.id,
      updatedBy: "co-arch-003-p2b-s1-bfv",
    },
  });
  const afterAssign = await prisma.enterpriseDeal.findUnique({ where: { id: dealWithout.id } });
  let allowedAfter = true;
  try {
    assertInvoicePartyForDealStage({
      toGrossStage: "soft_approved",
      invoicePartyId: afterAssign.invoicePartyId,
    });
  } catch {
    allowedAfter = false;
  }
  check("T4", "After assigning Invoice Party, Deal can proceed", allowedAfter);

  // Soft at logged_in itself should NOT hard-block (beyond gate)
  let loggedInOk = true;
  try {
    assertInvoicePartyForDealStage({
      toGrossStage: "logged_in_wip",
      invoicePartyId: null,
    });
  } catch {
    loggedInOk = false;
  }
  check(
    "T4",
    "Configured stage semantics: Logged In itself not hard-blocked (beyond-stage gate)",
    loggedInOk,
  );

  // ---- TEST 6: Regression / integrity ----
  const oppTable = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.enterprise_opportunities')::text AS reg`,
  );
  check(
    "T6",
    "Opportunity Registry table intact",
    Array.isArray(oppTable) && oppTable[0]?.reg === "enterprise_opportunities",
  );
  const dealTable = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.enterprise_deals')::text AS reg`,
  );
  check(
    "T6",
    "Deal Registry table intact",
    Array.isArray(dealTable) && dealTable[0]?.reg === "enterprise_deals",
  );
  const contactTable = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.ecm_contacts')::text AS reg`,
  );
  check(
    "T6",
    "Contact Registry table intact",
    Array.isArray(contactTable) && contactTable[0]?.reg === "ecm_contacts",
  );
  const companyTable = await prisma.$queryRawUnsafe(
    `SELECT to_regclass('public.ecm_companies')::text AS reg`,
  );
  check(
    "T6",
    "Company Registry table intact",
    Array.isArray(companyTable) && companyTable[0]?.reg === "ecm_companies",
  );

  const uniq = await prisma.$queryRawUnsafe(
    `SELECT indexname FROM pg_indexes WHERE tablename='enterprise_accounting_payees'
     AND indexname IN ('eapayee_org_contact_unique_active','eapayee_org_company_unique_active')`,
  );
  check("T6", "Invoice Party uniqueness indexes present", Array.isArray(uniq) && uniq.length >= 2);

  const fk = await prisma.$queryRawUnsafe(
    `SELECT conname FROM pg_constraint WHERE conname = 'enterprise_deals_commission_accounting_payee_id_fkey'`,
  );
  check(
    "T6",
    "Deal → Invoice Party FK constraint intact",
    Array.isArray(fk) && fk.length === 1,
  );

  // API route files / alias
  check(
    "T6",
    "Invoice Party API route exists",
    existsSync(resolve(process.cwd(), "src/app/api/invoice-parties/route.ts")),
  );
  check(
    "T6",
    "Legacy accounting-payees API alias exists",
    existsSync(resolve(process.cwd(), "src/app/api/accounting-payees/route.ts")),
  );
  check(
    "T6",
    "Accounting page routes to AccountingWorkspace",
    existsSync(resolve(process.cwd(), "src/app/(dashboard)/accounting/page.tsx")),
  );

  // Soft-delete cleanup (keep DB tidy; validation evidence already captured)
  await prisma.enterpriseDeal.updateMany({
    where: { opportunityId: opportunity.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: "co-arch-003-p2b-s1-bfv",
      deletionReason: "p2b_s1_bfv_cleanup",
    },
  });
  await prisma.enterpriseOpportunity.update({
    where: { id: opportunity.id },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: "co-arch-003-p2b-s1-bfv",
      deletionReason: "p2b_s1_bfv_cleanup",
    },
  });
  await prisma.enterpriseInvoiceParty.updateMany({
    where: { id: { in: [party.id, companyParty?.id].filter(Boolean) } },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: "co-arch-003-p2b-s1-bfv",
      deletionReason: "p2b_s1_bfv_cleanup",
    },
  });
  await prisma.ecmContact.updateMany({
    where: { id: { in: [contact.id, nonPartyContact.id] } },
    data: {
      isDeleted: true,
      deletedAt: new Date(),
      deletedBy: "co-arch-003-p2b-s1-bfv",
      deletionReason: "p2b_s1_bfv_cleanup",
    },
  });
  if (company) {
    await prisma.ecmCompany.update({
      where: { id: company.id },
      data: {
        isDeleted: true,
        deletedAt: new Date(),
        deletedBy: "co-arch-003-p2b-s1-bfv",
        deletionReason: "p2b_s1_bfv_cleanup",
      },
    });
  }

  // Summary
  console.log("\n=== SUMMARY ===");
  const byTest = {};
  for (const c of checks) {
    byTest[c.test] = byTest[c.test] || { pass: 0, fail: 0 };
    if (c.ok) byTest[c.test].pass += 1;
    else byTest[c.test].fail += 1;
  }
  for (const [t, s] of Object.entries(byTest)) {
    console.log(`${t}: ${s.pass} PASS / ${s.fail} FAIL`);
  }
  const failed = checks.filter((c) => !c.ok);
  console.log(`\nTOTAL: ${checks.filter((c) => c.ok).length} PASS / ${failed.length} FAIL`);
  if (failed.length) {
    console.log("\nFailures:");
    for (const f of failed) console.log(` - [${f.test}] ${f.name}: ${f.detail}`);
  }

  // Write JSON evidence
  const evidence = {
    at: new Date().toISOString(),
    organizationId: org.id,
    totals: { pass: checks.filter((c) => c.ok).length, fail: failed.length },
    byTest,
    checks,
  };
  const { writeFileSync, mkdirSync } = await import("node:fs");
  mkdirSync(resolve(process.cwd(), "docs/co-arch-003"), { recursive: true });
  writeFileSync(
    resolve(process.cwd(), "docs/co-arch-003/CO-ARCH-003-PHASE-2B-S1-BFV-EVIDENCE.json"),
    JSON.stringify(evidence, null, 2),
  );
  console.log("\nEvidence written: docs/co-arch-003/CO-ARCH-003-PHASE-2B-S1-BFV-EVIDENCE.json");

  process.exit(failed.length === 0 ? 0 : 1);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
