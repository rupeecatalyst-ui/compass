/**
 * Real Prisma repository lifecycle on the isolated clean BAT database.
 * Never prints passwords. Never uses production DATABASE_URL.
 */
import { randomBytes } from "node:crypto";
import { createRequire } from "node:module";
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PARENT_NM = "C:\\Compass by Rupee Catalyst (3)\\node_modules";
const secretPath = join(root, ".tmp/ppo-bat.secret.json");
const secret = JSON.parse(readFileSync(secretPath, "utf8"));
const dbIdx = process.argv.indexOf("--database");
const CLEAN_DB = dbIdx >= 0 ? process.argv[dbIdx + 1] : null;
if (!CLEAN_DB || CLEAN_DB.startsWith("-")) {
  throw new Error("Required: --database <name>. Refusing to default to a tainted BAT database.");
}
if (
  CLEAN_DB === "catalyst_one_product_program_bat_001" ||
  CLEAN_DB === "catalyst_one_product_program_bat_pre_001" ||
  CLEAN_DB === "catalyst_one_product_program_bat_clean_002" ||
  CLEAN_DB === "ppo_sql_preflight_review_001"
) {
  throw new Error(`Refusing to run repository lifecycle against preserved evidence database ${CLEAN_DB}.`);
}
const HOST = "127.0.0.1";

function urlFor(db) {
  return `postgresql://${encodeURIComponent(secret.user)}:${encodeURIComponent(secret.password)}@${HOST}:${secret.port}/${db}?schema=public`;
}

if (!secret.jwtSecret || !secret.jwtRefreshSecret) {
  secret.jwtSecret = randomBytes(32).toString("hex");
  secret.jwtRefreshSecret = randomBytes(32).toString("hex");
}
if (!secret.users) {
  secret.users = {
    superAdmin: { email: "ppo.super@local.bat", password: randomBytes(12).toString("base64url") + "Aa1!" },
    creator: { email: "ppo.creator@local.bat", password: randomBytes(12).toString("base64url") + "Aa1!" },
    approver: { email: "ppo.approver@local.bat", password: randomBytes(12).toString("base64url") + "Aa1!" },
    viewer: { email: "ppo.viewer@local.bat", password: randomBytes(12).toString("base64url") + "Aa1!" },
  };
}
writeFileSync(secretPath, `${JSON.stringify(secret, null, 2)}\n`);

process.env.NODE_PATH = PARENT_NM;
process.env.DATABASE_URL = urlFor(CLEAN_DB);
process.env.DIRECT_URL = process.env.DATABASE_URL;
process.env.JWT_SECRET = secret.jwtSecret;
process.env.JWT_REFRESH_SECRET = secret.jwtRefreshSecret;
process.env.ENTERPRISE_PERSISTENCE_MODE = "prisma";
process.env.NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE = "prisma";
process.env.ENTERPRISE_MARKETING_EMAIL_MODE = "dry_run";
process.env.NODE_ENV = "development";
process.env.CATALYST_BAT_ISOLATED_PRISMA = "1";
process.env.CATALYST_BAT_PRISMA_CLIENT_MODULE = ".tmp/generated/prisma-client";

const isolatedClientHref = pathToFileURL(join(root, ".tmp/generated/prisma-client/index.js")).href;
const isolatedMod = await import(isolatedClientHref);
const { configureBatPrismaClient, prisma } = await import("../server/lib/prisma.ts");
configureBatPrismaClient(isolatedMod.PrismaClient);

const requireFromParent = createRequire(join(PARENT_NM, "bcryptjs/package.json"));
const bcrypt = requireFromParent("bcryptjs");
const { productProgrammeOperationsService } = await import(
  "../server/services/product-programme-operations/programme.service.ts"
);
const { PROGRAMME_BAT_FIXTURES } = await import("../src/lib/product-programme-operations/fixtures.ts");
const { lenderRegistryRepository } = await import(
  "../server/repositories/lender-registry/lender-registry.repository.ts"
);
const { stampDealProgrammeSelection, preserveExistingProgrammeStamp, readDealProgrammeStamp } =
  await import("../src/lib/product-programme-operations/deal-stamp.ts");
const { ENTERPRISE_MARKETING_EXECUTION_ENABLED } = await import(
  "../src/constants/enterprise-marketing-engine/safety.ts"
);
const { resolveAdvantageCommittedDisplay } = await import("../src/lib/advantage-committed/display.ts");

const results = [];
function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(JSON.stringify({ id, ok, detail: detail && typeof detail === "object" ? detail : detail }));
  if (!ok) throw new Error(`${id} FAIL`);
}

const ORG = "org_ppo_clean";
const OTHER_ORG = "org_ppo_other";
const LENDER = "lender_ppo_clean";
const POLICY_VERSION = "policyver_ppo_clean";
const RUN = randomBytes(4).toString("hex");

async function seed() {
  const hash = async (password) => bcrypt.hash(password, 12);
  await prisma.organization.upsert({
    where: { slug: "rupee-catalyst" },
    update: { name: "Rupee Catalyst", isActive: true },
    create: { id: ORG, slug: "rupee-catalyst", name: "Rupee Catalyst", isActive: true },
  });
  const org = await prisma.organization.findUnique({ where: { slug: "rupee-catalyst" } });
  await prisma.organization.upsert({
    where: { slug: "ppo-other" },
    update: {},
    create: { id: OTHER_ORG, slug: "ppo-other", name: "Other Org", isActive: true },
  });
  const users = [
    { id: "user_super", ...secret.users.superAdmin, role: "SUPER_ADMIN", first: "Super", last: "Admin" },
    { id: "user_creator", ...secret.users.creator, role: "ADMIN", first: "Creator", last: "Admin" },
    { id: "user_approver", ...secret.users.approver, role: "ADMIN", first: "Approver", last: "Admin" },
    { id: "user_viewer", ...secret.users.viewer, role: "VIEWER", first: "Ordinary", last: "User" },
  ];
  for (const user of users) {
    const passwordHash = await hash(user.password);
    await prisma.user.upsert({
      where: { email: user.email },
      update: { passwordHash, role: user.role, isActive: true, mustChangePassword: false },
      create: {
        id: user.id,
        email: user.email,
        passwordHash,
        firstName: user.first,
        lastName: user.last,
        role: user.role,
        isActive: true,
        mustChangePassword: false,
      },
    });
  }
  await prisma.enterpriseLenderCategory.upsert({
    where: { id: "cat_ppo_clean" },
    update: {},
    create: {
      id: "cat_ppo_clean",
      organizationId: org.id,
      code: "HFC",
      label: "Housing Finance",
      createdBy: "user_super",
      modifiedBy: "user_super",
      status: "active",
    },
  });
  await prisma.enterpriseLender.upsert({
    where: { id: LENDER },
    update: {},
    create: {
      id: LENDER,
      organizationId: org.id,
      categoryId: "cat_ppo_clean",
      code: "FIXHFC",
      label: "Fixture Housing Finance",
      institutionCategory: "hfc",
      lifecycleStatus: "active",
      operationalStatus: "active",
      status: "active",
      createdBy: "user_super",
      modifiedBy: "user_super",
    },
  });
  await prisma.enterpriseCreditRiskPolicy.upsert({
    where: { id: "policy_ppo_clean" },
    update: {},
    create: {
      id: "policy_ppo_clean",
      organizationId: org.id,
      policyCode: "POL-PPO-HL",
      name: "Fixture HL policy",
      status: "published",
      createdBy: "user_super",
      modifiedBy: "user_super",
    },
  });
  await prisma.enterpriseCreditRiskPolicyVersion.upsert({
    where: { id: POLICY_VERSION },
    update: {},
    create: {
      id: POLICY_VERSION,
      organizationId: org.id,
      policyId: "policy_ppo_clean",
      versionNumber: 1,
      status: "published",
      createdBy: "user_super",
      publishedBy: "user_super",
      publishedAt: new Date(),
    },
  });
  return org.id;
}

function asWriteBody(payload) {
  const { employmentFamily, ...rest } = payload;
  return rest;
}

try {
  record("MARKETING-OFF", ENTERPRISE_MARKETING_EXECUTION_ENABLED === false, {
    ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  });
  const organizationId = await seed();
    const completeBody = asWriteBody(
    PROGRAMME_BAT_FIXTURES.homeLoanSalaried({
      lenderId: LENDER,
      policyVersionId: POLICY_VERSION,
      creditRiskPolicyRef: "policy_ppo_clean",
      code: `FIX-HL-SAL-${RUN}`,
      label: `Fixture Home Loan Salaried ${RUN}`,
    }),
  );

  let denied = false;
  try {
    await productProgrammeOperationsService.create({
      organizationId,
      actorUserId: "user_viewer",
      actorRole: "VIEWER",
      body: completeBody,
    });
  } catch (err) {
    denied = err?.name === "ProgrammePermissionError" || /Ordinary users/i.test(err?.message ?? "");
  }
  record("ORDINARY-USER-DENIED", denied, {});

  let unknownDenied = false;
  try {
    await productProgrammeOperationsService.create({
      organizationId,
      actorUserId: "user_creator",
      actorRole: "ADMIN",
      body: { ...completeBody, inventedField: "nope" },
    });
  } catch (err) {
    unknownDenied = /Unknown field/i.test(err?.message ?? "");
  }
  record("UNKNOWN-FIELDS-REJECTED", unknownDenied, {});

  const created = await productProgrammeOperationsService.create({
    organizationId,
    actorUserId: "user_creator",
    actorName: "Creator Admin",
    actorRole: "ADMIN",
    body: completeBody,
  });
  record("CREATE", Boolean(created.id) && created.publicationState === "draft", {
    id: created.id,
    publicationState: created.publicationState,
    completenessState: created.completenessState,
  });

  const reloaded = await prisma.enterpriseLenderProgram.findUnique({ where: { id: created.id } });
  record("RELOAD", reloaded?.label === created.label && Number(reloaded?.minRoiExact) === 8.4, {
    label: reloaded?.label,
    minRoiExact: reloaded?.minRoiExact,
  });

  const otherOrg = await prisma.organization.findUnique({ where: { slug: "ppo-other" } });
  const foreign = await prisma.enterpriseLenderProgram.create({
    data: {
      id: `prog_foreign_${RUN}`,
      organizationId: otherOrg.id,
      lenderId: LENDER,
      lineageId: `prog_foreign_${RUN}`,
      code: `FOREIGN-${RUN}`,
      label: "Foreign programme",
      createdBy: "user_super",
      modifiedBy: "user_super",
    },
  });
  let tenantDenied = false;
  try {
    await productProgrammeOperationsService.update({
      organizationId,
      actorUserId: "user_creator",
      actorRole: "ADMIN",
      programId: foreign.id,
      body: { label: "hijack" },
    });
  } catch (err) {
    tenantDenied = /Cross-tenant|TENANT_FORBIDDEN/i.test(err?.message ?? "") || err?.code === "TENANT_FORBIDDEN";
  }
  record("CROSS-TENANT-DENIED", tenantDenied, {});

  const incomplete = await productProgrammeOperationsService.create({
    organizationId,
    actorUserId: "user_creator",
    actorRole: "ADMIN",
    body: {
      ...asWriteBody(PROGRAMME_BAT_FIXTURES.incompleteDraft()),
      lenderId: LENDER,
      code: `FIX-INCOMPLETE-${RUN}`,
    },
  });
  await productProgrammeOperationsService.submit({
    organizationId,
    actorUserId: "user_creator",
    actorRole: "ADMIN",
    programId: incomplete.id,
  });
  await productProgrammeOperationsService.approve({
    organizationId,
    actorUserId: "user_approver",
    actorRole: "ADMIN",
    programId: incomplete.id,
  });
  let incompletePublishDenied = false;
  try {
    await productProgrammeOperationsService.publish({
      organizationId,
      actorUserId: "user_approver",
      actorRole: "ADMIN",
      programId: incomplete.id,
    });
  } catch (err) {
    incompletePublishDenied = /not complete/i.test(err?.message ?? "");
  }
  record("INCOMPLETE-PUBLISH-DENIED", incompletePublishDenied, {});

  await productProgrammeOperationsService.submit({
    organizationId,
    actorUserId: "user_creator",
    actorRole: "ADMIN",
    programId: created.id,
  });
  let selfApproveDenied = false;
  try {
    await productProgrammeOperationsService.approve({
      organizationId,
      actorUserId: "user_creator",
      actorRole: "ADMIN",
      programId: created.id,
    });
  } catch (err) {
    selfApproveDenied = /cannot approve/i.test(err?.message ?? "");
  }
  record("MAKER-CHECKER", selfApproveDenied, {});

  await productProgrammeOperationsService.approve({
    organizationId,
    actorUserId: "user_approver",
    actorRole: "ADMIN",
    programId: created.id,
  });
  const published = await productProgrammeOperationsService.publish({
    organizationId,
    actorUserId: "user_approver",
    actorRole: "ADMIN",
    programId: created.id,
  });
  record("PUBLISH", published.isLivePublished === true && published.publicationState === "published", {
    isLivePublished: published.isLivePublished,
    publicationState: published.publicationState,
  });

  const draftV2 = await productProgrammeOperationsService.update({
    organizationId,
    actorUserId: "user_creator",
    actorRole: "ADMIN",
    programId: published.id,
    body: {
      createDraftRevision: true,
      expectedLockVersion: published.lockVersion,
      minRoiExact: "8.250000",
      maxRoiExact: "9.000000",
    },
  });
  const stillLive = await prisma.enterpriseLenderProgram.findUnique({ where: { id: published.id } });
  record("DRAFT-REVISION", draftV2.id !== published.id && draftV2.versionNumber === 2, {
    draftId: draftV2.id,
    versionNumber: draftV2.versionNumber,
  });
  record("DRAFT-REVISION-ATOMIC-COMPLETE", draftV2.completenessState === "complete" && draftV2.publicationState === "draft" && draftV2.isLivePublished === false && (draftV2.approvalStatus === "none" || !draftV2.approvalStatus || draftV2.approvalStatus === "none"), {
    completenessState: draftV2.completenessState,
    publicationState: draftV2.publicationState,
    isLivePublished: draftV2.isLivePublished,
    approvalStatus: draftV2.approvalStatus,
    minCibil: draftV2.minCibil,
    minAge: draftV2.minAge,
    maxAge: draftV2.maxAge,
    maxTenureMonths: draftV2.maxTenureMonths,
    minRoiExact: draftV2.minRoiExact,
  });
  record("DRAFT-REVISION-PARENT-UNCHANGED", stillLive?.isLivePublished === true && stillLive?.publicationState === "published" && Number(stillLive?.minRoiExact) === Number(published.minRoiExact), {
    isLivePublished: stillLive?.isLivePublished,
    publicationState: stillLive?.publicationState,
    minRoiExact: stillLive?.minRoiExact,
  });
  const draftAgain = await productProgrammeOperationsService.update({
    organizationId,
    actorUserId: "user_creator",
    actorRole: "ADMIN",
    programId: published.id,
    body: {
      createDraftRevision: true,
      expectedLockVersion: published.lockVersion,
      minRoiExact: "8.250000",
      maxRoiExact: "9.000000",
    },
  });
  record("DRAFT-REVISION-IDEMPOTENT", draftAgain.id === draftV2.id && draftAgain.completenessState === "complete" && draftAgain.publicationState === "draft", {
    firstId: draftV2.id,
    secondId: draftAgain.id,
    completenessState: draftAgain.completenessState,
  });
  record("OLD-VERSION-STAYS-LIVE", stillLive?.isLivePublished === true, {
    isLivePublished: stillLive?.isLivePublished,
  });

  await productProgrammeOperationsService.submit({
    organizationId,
    actorUserId: "user_creator",
    actorRole: "ADMIN",
    programId: draftV2.id,
  });
  await productProgrammeOperationsService.approve({
    organizationId,
    actorUserId: "user_approver",
    actorRole: "ADMIN",
    programId: draftV2.id,
  });
  const republished = await productProgrammeOperationsService.publish({
    organizationId,
    actorUserId: "user_approver",
    actorRole: "ADMIN",
    programId: draftV2.id,
  });
  const superseded = await prisma.enterpriseLenderProgram.findUnique({ where: { id: published.id } });
  record("REPUBLISH", republished.isLivePublished === true && Number(republished.minRoiExact) === 8.25, {
    minRoiExact: republished.minRoiExact,
  });
  record("PREVIOUS-SUPERSEDED", superseded?.publicationState === "superseded" && superseded?.isLivePublished === false, {
    publicationState: superseded?.publicationState,
  });

  const audits = await prisma.enterpriseLenderProgramAuditEvent.findMany({
    where: { lineageId: published.lineageId },
  });
  record("AUDIT", audits.some((row) => row.action === "published"), { count: audits.length });

  await lenderRegistryRepository.setProgramStatus(republished.id, "inactive", "user_super", false);
  const deactivated = await prisma.enterpriseLenderProgram.findUnique({ where: { id: republished.id } });
  record("DEACTIVATE", deactivated?.status === "inactive" && deactivated?.enabled === false, {
    status: deactivated?.status,
    enabled: deactivated?.enabled,
  });

  const firstStamp = stampDealProgrammeSelection({ program: published });
  const incoming = stampDealProgrammeSelection({ program: republished });
  const preserved = preserveExistingProgrammeStamp(
    readDealProgrammeStamp(firstStamp),
    readDealProgrammeStamp(incoming),
  );
  record("DEAL-STAMP-PRESERVED", preserved.programmeId === published.id, {
    programmeId: preserved.programmeId,
  });

  const display = resolveAdvantageCommittedDisplay({ productCode: "HOME_LOAN", amount: null });
  record("ADVANTAGE-NULL-DISPLAY", display.display === "Not committed", { display: display.display });

  console.log(JSON.stringify({ ok: true, database: CLEAN_DB, results }));
} finally {
  await prisma.$disconnect();
}
