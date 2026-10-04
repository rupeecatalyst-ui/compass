/**
 * Isolated PostgreSQL BAT relationship fixtures (local identities only).
 * Never prints passwords. Never uses production DATABASE_URL.
 */
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PARENT_NM = "C:\\Compass by Rupee Catalyst (3)\\node_modules";
const secret = JSON.parse(readFileSync(join(root, ".tmp/ppo-bat.secret.json"), "utf8"));
const dbIdx = process.argv.indexOf("--database");
const CLEAN_DB = dbIdx >= 0 ? process.argv[dbIdx + 1] : "catalyst_one_product_program_bat_clean_002";
if (CLEAN_DB === "catalyst_one_product_program_bat_001" || CLEAN_DB === "catalyst_one_product_program_bat_pre_001") {
  throw new Error(`Refusing to seed preserved evidence database ${CLEAN_DB}.`);
}
const HOST = "127.0.0.1";

function urlFor(db) {
  return `postgresql://${encodeURIComponent(secret.user)}:${encodeURIComponent(secret.password)}@${HOST}:${secret.port}/${db}?schema=public`;
}

process.env.NODE_PATH = PARENT_NM;
process.env.DATABASE_URL = urlFor(CLEAN_DB);
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.NODE_ENV = "development";
process.env.CATALYST_BAT_ISOLATED_PRISMA = "1";
process.env.ENTERPRISE_MARKETING_EMAIL_MODE = "dry_run";

const isolatedMod = await import(pathToFileURL(join(root, ".tmp/generated/prisma-client/index.js")).href);
const { configureBatPrismaClient, prisma } = await import("../server/lib/prisma.ts");
configureBatPrismaClient(isolatedMod.PrismaClient);

const ORG_SLUG = "rupee-catalyst";
const CONTACT_ID = "ecm_ppo_bat_customer";
const OPP_COMMITTED = "opp_ppo_adv_committed";
const OPP_NOT_COMMITTED = "opp_ppo_adv_not_committed";
const OPP_NOT_APPLICABLE = "opp_ppo_adv_not_applicable";
const DEAL_COMMITTED = "deal_ppo_adv_committed";
const CASE_COMMITTED = "eac_ppo_adv_committed";
const EVENT_ID = "adv_evt_ppo_committed";
const CAT_ID = "epcat_ppo_bat";
const GRP_ID = "epgrp_ppo_bat";
const PROD_HL = "eprod_ppo_home_loan";
const PROD_PL = "eprod_ppo_personal_loan";

try {
  const org = await prisma.organization.findUnique({ where: { slug: ORG_SLUG } });
  if (!org) throw new Error("rupee-catalyst organization missing; run repository BAT first.");
  const organizationId = org.id;

  await prisma.enterpriseProductCategory.upsert({
    where: { id: CAT_ID },
    update: { enabled: true, status: "active" },
    create: {
      id: CAT_ID,
      organizationId,
      code: "LENDING",
      label: "Lending",
      status: "active",
      createdBy: "user_super",
      modifiedBy: "user_super",
    },
  });
  await prisma.enterpriseProductGroup.upsert({
    where: { id: GRP_ID },
    update: { enabled: true, status: "active" },
    create: {
      id: GRP_ID,
      organizationId,
      categoryId: CAT_ID,
      code: "HOME",
      label: "Home Finance",
      status: "active",
      createdBy: "user_super",
      modifiedBy: "user_super",
    },
  });
  await prisma.enterpriseProduct.upsert({
    where: { id: PROD_HL },
    update: { enabled: true, status: "active", lifecycleStatus: "published", operationalStatus: "active" },
    create: {
      id: PROD_HL,
      organizationId,
      categoryId: CAT_ID,
      groupId: GRP_ID,
      code: "HOME_LOAN",
      label: "Home Loan",
      status: "active",
      lifecycleStatus: "published",
      operationalStatus: "active",
      createdBy: "user_super",
      modifiedBy: "user_super",
    },
  });
  await prisma.enterpriseProduct.upsert({
    where: { id: PROD_PL },
    update: { enabled: true, status: "active", lifecycleStatus: "published", operationalStatus: "active" },
    create: {
      id: PROD_PL,
      organizationId,
      categoryId: CAT_ID,
      groupId: GRP_ID,
      code: "PERSONAL_LOAN",
      label: "Personal Loan",
      status: "active",
      lifecycleStatus: "published",
      operationalStatus: "active",
      createdBy: "user_super",
      modifiedBy: "user_super",
    },
  });

  await prisma.ecmContact.upsert({
    where: { id: CONTACT_ID },
    update: {
      name: "BAT Customer One",
      mobilePrimary: "9000000001",
      enabled: true,
      status: "active",
    },
    create: {
      id: CONTACT_ID,
      organizationId,
      name: "BAT Customer One",
      mobilePrimary: "9000000001",
      personalEmail: "bat.customer.one@local.bat",
      city: "Mumbai",
      state: "MH",
      primaryRole: "customer",
      roles: ["customer"],
      status: "active",
      createdBy: "user_super",
      modifiedBy: "user_super",
    },
  });

  const committedAt = new Date("2026-08-01T10:00:00.000Z");
  await prisma.enterpriseOpportunity.upsert({
    where: { id: OPP_COMMITTED },
    update: {
      advantageCommittedAmount: "125000.00",
      advantageCommittedCurrency: "INR",
      advantageCommittedAt: committedAt,
      advantageCommittedByUserId: "user_creator",
      advantageCommittedProductCode: "HOME_LOAN",
      sourceCode: "marketing_engine",
      sourceCampaignLabel: "BAT Home Loan Campaign",
      marketingCampaignId: "mkt_ppo_bat_hl_001",
      marketingSourceDetail: "website_qualification",
      primaryOwnerUserId: "user_creator",
    },
    create: {
      id: OPP_COMMITTED,
      organizationId,
      opportunityNumber: "OPP-PPO-HL-COMMITTED",
      productId: PROD_HL,
      productCode: "HOME_LOAN",
      productLabel: "Home Loan",
      productFamily: "lending",
      requirementStage: "lead",
      lifecycleStatus: "active",
      stageEnteredAt: new Date(),
      primaryContactId: CONTACT_ID,
      primaryContactName: "BAT Customer One",
      primaryContactMobile: "9000000001",
      primaryBorrowerKind: "individual",
      currencyCode: "INR",
      requestedAmount: "5000000.00",
      primaryOwnerUserId: "user_creator",
      relationshipManagerUserId: "user_creator",
      relationshipManagerName: "Creator Admin",
      advantageCommittedAmount: "125000.00",
      advantageCommittedCurrency: "INR",
      advantageCommittedAt: committedAt,
      advantageCommittedByUserId: "user_creator",
      advantageCommittedProductCode: "HOME_LOAN",
      advantageCommitmentVersion: 1,
      sourceCode: "marketing_engine",
      sourceCampaignLabel: "BAT Home Loan Campaign",
      marketingCampaignId: "mkt_ppo_bat_hl_001",
      marketingSourceDetail: "website_qualification",
      createdBy: "user_creator",
      updatedBy: "user_creator",
    },
  });
  await prisma.enterpriseOpportunity.upsert({
    where: { id: OPP_NOT_COMMITTED },
    update: {
      advantageCommittedAmount: null,
      productCode: "HOME_LOAN",
      primaryOwnerUserId: "user_creator",
    },
    create: {
      id: OPP_NOT_COMMITTED,
      organizationId,
      opportunityNumber: "OPP-PPO-HL-NOT-COMMITTED",
      productId: PROD_HL,
      productCode: "HOME_LOAN",
      productLabel: "Home Loan",
      productFamily: "lending",
      requirementStage: "lead",
      lifecycleStatus: "active",
      stageEnteredAt: new Date(),
      primaryContactId: CONTACT_ID,
      primaryContactName: "BAT Customer One",
      primaryContactMobile: "9000000001",
      primaryBorrowerKind: "individual",
      currencyCode: "INR",
      requestedAmount: "3500000.00",
      primaryOwnerUserId: "user_creator",
      createdBy: "user_creator",
      updatedBy: "user_creator",
    },
  });
  await prisma.enterpriseOpportunity.upsert({
    where: { id: OPP_NOT_APPLICABLE },
    update: {
      productCode: "PERSONAL_LOAN",
      advantageCommittedAmount: null,
      primaryOwnerUserId: "user_creator",
    },
    create: {
      id: OPP_NOT_APPLICABLE,
      organizationId,
      opportunityNumber: "OPP-PPO-PL-NA",
      productId: PROD_PL,
      productCode: "PERSONAL_LOAN",
      productLabel: "Personal Loan",
      productFamily: "lending",
      requirementStage: "lead",
      lifecycleStatus: "active",
      stageEnteredAt: new Date(),
      primaryContactId: CONTACT_ID,
      primaryContactName: "BAT Customer One",
      primaryContactMobile: "9000000001",
      primaryBorrowerKind: "individual",
      currencyCode: "INR",
      requestedAmount: "400000.00",
      primaryOwnerUserId: "user_creator",
      createdBy: "user_creator",
      updatedBy: "user_creator",
    },
  });

  let liveProgram = await prisma.enterpriseLenderProgram.findFirst({
    where: { organizationId, isLivePublished: true, isDeleted: false },
    orderBy: { updatedAt: "desc" },
  });
  if (!liveProgram) {
    const complete = await prisma.enterpriseLenderProgram.findFirst({
      where: {
        organizationId,
        completenessState: "complete",
        isDeleted: false,
        lenderId: "lender_ppo_clean",
      },
      orderBy: { updatedAt: "desc" },
    });
    if (complete) {
      liveProgram = await prisma.enterpriseLenderProgram.update({
        where: { id: complete.id },
        data: {
          isLivePublished: true,
          publicationState: "published",
          lifecycleStatus: "active",
          status: "active",
          enabled: true,
        },
      });
    }
  }

  const programmeStamp = liveProgram
    ? {
        publishedProgrammeStamp: {
          lenderId: liveProgram.lenderId,
          programmeId: liveProgram.id,
          programmeCode: liveProgram.code,
          programmeVersion: liveProgram.versionNumber,
          policyVersionId: liveProgram.policyVersionId ?? liveProgram.creditRiskPolicyRef ?? null,
          roiRange:
            liveProgram.minRoiExact && liveProgram.maxRoiExact
              ? `${liveProgram.minRoiExact}–${liveProgram.maxRoiExact}%`
              : null,
          eligibilityBasis: "Published programme eligibility",
          requiredDocuments: liveProgram.requiredDocumentTypeIds ?? [],
          effectiveFrom: liveProgram.effectiveFrom ?? null,
          lineageId: liveProgram.lineageId ?? liveProgram.id,
          stampedAt: new Date().toISOString(),
        },
      }
    : null;

  await prisma.enterpriseDeal.upsert({
    where: { id: DEAL_COMMITTED },
    update: {
      opportunityId: OPP_COMMITTED,
      productCode: "HOME_LOAN",
      productLabel: "Home Loan",
      requestedAmount: "5000000.00",
      expectedRevenue: "75000.00",
      primaryOwnerUserId: "user_creator",
      lenderProgramId: liveProgram?.id ?? null,
      snapshot: programmeStamp ?? undefined,
    },
    create: {
      id: DEAL_COMMITTED,
      organizationId,
      dealNumber: "DEAL-PPO-HL-COMMITTED",
      opportunityId: OPP_COMMITTED,
      lenderId: "lender_ppo_clean",
      lenderProgramId: liveProgram?.id ?? null,
      productId: PROD_HL,
      productCode: "HOME_LOAN",
      productLabel: "Home Loan",
      productFamily: "lending",
      grossStage: "identified",
      stageEnteredAt: new Date(),
      primaryContactId: CONTACT_ID,
      primaryContactName: "BAT Customer One",
      primaryContactMobile: "9000000001",
      primaryOwnerUserId: "user_creator",
      relationshipManagerUserId: "user_creator",
      relationshipManagerName: "Creator Admin",
      primaryCounterpartyName: "Fixture Housing Finance",
      requestedAmount: "5000000.00",
      approvedAmount: "4800000.00",
      fulfilledAmount: "0",
      expectedRevenue: "75000.00",
      currencyCode: "INR",
      snapshot: programmeStamp,
      createdBy: "user_creator",
      updatedBy: "user_creator",
    },
  });

  await prisma.enterpriseAccountingCase.upsert({
    where: { id: CASE_COMMITTED },
    update: {
      expectedCommission: "75000.00",
      confirmedInvoiceAmount: "75000.00",
      payoutAmount: "75000.00",
    },
    create: {
      id: CASE_COMMITTED,
      organizationId,
      dealId: DEAL_COMMITTED,
      status: "open",
      finalAmount: "4800000.00",
      disbursedAmount: "0",
      expectedCommission: "75000.00",
      confirmedInvoiceAmount: "75000.00",
      payoutAmount: "75000.00",
      confirmationSource: "human",
      confirmedBy: "user_creator",
      confirmedAt: new Date(),
      createdBy: "user_creator",
      updatedBy: "user_creator",
    },
  });

  await prisma.enterpriseOpportunityAdvantageCommitmentEvent.upsert({
    where: { id: EVENT_ID },
    update: { amount: "125000.00" },
    create: {
      id: EVENT_ID,
      organizationId,
      opportunityId: OPP_COMMITTED,
      eventKind: "original_commit",
      amount: "125000.00",
      currency: "INR",
      productCode: "HOME_LOAN",
      reason: "BAT fixture — authorised Compass Advantage communicated to customer.",
      requestedByUserId: "user_creator",
      approvedByUserId: "user_creator",
      originatingOpportunityId: OPP_COMMITTED,
      version: 1,
    },
  });
  await prisma.enterpriseOpportunity.update({
    where: { id: OPP_COMMITTED },
    data: { advantageCommitmentId: EVENT_ID },
  });

  const committed = await prisma.enterpriseOpportunity.findUnique({ where: { id: OPP_COMMITTED } });
  console.log(
    JSON.stringify({
      ok: true,
      database: CLEAN_DB,
      organizationId,
      contactId: CONTACT_ID,
      opportunities: [OPP_COMMITTED, OPP_NOT_COMMITTED, OPP_NOT_APPLICABLE],
      dealId: DEAL_COMMITTED,
      accountingCaseId: CASE_COMMITTED,
      canonicalAmount: committed?.advantageCommittedAmount?.toString() ?? null,
      liveProgramId: liveProgram?.id ?? null,
    }),
  );
} finally {
  await prisma.$disconnect();
}
