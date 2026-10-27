/**
 * Portal publication retry must update and publish the same programme.
 * Control fields stay out of the commercial allow-list.
 *
 * Run the database section with: npx tsx scripts/co-programme-portal-retry-verify.ts --database
 */
import { mapPortalPayloadToProgrammeBody } from "../src/lib/lender-program-portal/launch-closure";
import {
  rejectUnknownProgrammeFields,
  separateProgrammeUpdateControls,
} from "../src/lib/product-programme-operations/request-schema";

const failures: string[] = [];
function check(name: string, ok: boolean, detail = "") {
  if (!ok) failures.push(`${name}${detail ? `: ${detail}` : ""}`);
  console.log(`${ok ? "PASS" : "FAIL"} ${name}${detail ? ` — ${detail}` : ""}`);
}

const programmeBody = mapPortalPayloadToProgrammeBody({
  lenderId: "lender-1",
  productId: null,
  productCode: "HOME_LOAN",
  programName: "CERT-SR Retry",
  policyVersionId: "policy-1",
  payload: {
    employmentType: "salaried",
    incomeAssessmentMethod: "salary",
    legalConstitution: "individual",
    residencyEligibility: "resident",
    interestType: "floating",
    benchmarkCode: "repo",
    propertyType: "ready",
    geographyState: "Maharashtra",
    minCibil: 700,
    minAge: 21,
    maxAge: 65,
    minTenureMonths: 12,
    maxTenureMonths: 360,
    minLoanAmount: 500000,
    maxLoanAmount: 10000000,
    minIncome: 30000,
    interestRate: 8.5,
    maxFoir: 55,
    effectiveDate: "2026-10-01",
    expiryDate: "2027-10-01",
    requiredDocuments: "Salary slips",
  },
});

const retryBody = {
  ...programmeBody,
  expectedVersionNumber: 1,
  changeReason: "portal_draft_saved",
};
const controls = separateProgrammeUpdateControls(retryBody);
let allowListOk = true;
try {
  rejectUnknownProgrammeFields(controls.commercial);
} catch (error) {
  allowListOk = false;
  check("commercial-allow-list", false, error instanceof Error ? error.message : String(error));
}
if (allowListOk) check("commercial-allow-list", true);
check("version-preserved", controls.expectedVersionNumber === 1);
check("reason-preserved", controls.changeReason === "portal_draft_saved");
check(
  "controls-excluded",
  !("expectedVersionNumber" in controls.commercial) && !("changeReason" in controls.commercial),
);
let unknownRejected = false;
try {
  rejectUnknownProgrammeFields({ ...controls.commercial, notAProgrammeField: true });
} catch {
  unknownRejected = true;
}
check("unknown-commercial-field-rejected", unknownRejected);

async function databaseRetry() {
  const { readFileSync } = await import("node:fs");
  const root = "C:/Compass by Rupee Catalyst (3)/.tmp/wt-product-program-operations";
  const secret = JSON.parse(readFileSync(`${root}/.tmp/ppo-bat.secret.json`, "utf8")) as {
    user: string;
    password: string;
    port: number;
  };
  if (secret.user !== "ppo_bat" || Number(secret.port) !== 55434) {
    throw new Error("Local BAT secret does not match the authorised database.");
  }
  const database = "catalyst_one_product_program_bat_001";
  process.env.DATABASE_URL = `postgresql://${encodeURIComponent(secret.user)}:${encodeURIComponent(secret.password)}@127.0.0.1:55434/${database}`;
  process.env.DIRECT_URL = process.env.DATABASE_URL;
  process.env.JWT_SECRET = "cert-sr-local-bat-only-not-a-production-secret";
  process.env.JWT_REFRESH_SECRET = "cert-sr-local-bat-refresh-only-not-production";

    const { prisma } = await import("../server/lib/prisma");
    const { lenderProgramPortalService } = await import(
      "../server/services/lender-program-portal/lender-program-portal.service"
    );
  const identity = await prisma.$queryRawUnsafe<Array<{ database: string; port: number; role: string }>>(
    "SELECT current_database() AS database, inet_server_port() AS port, current_user AS role",
  );
  const id = identity[0];
  if (!id || id.database !== database || Number(id.port) !== 55434 || id.role !== "ppo_bat") {
    throw new Error("Connected database is not the authorised local BAT database.");
  }

  const createdIds: { org?: string; category?: string; lender?: string; policy?: string; version?: string; assignment?: string; invite?: string; submission?: string } = {};
  const basePayload = {
    employmentType: "salaried",
    incomeAssessmentMethod: "salary",
    legalConstitution: "individual",
    residencyEligibility: "resident",
    interestType: "floating",
    benchmarkCode: "repo",
    propertyType: "ready",
    geographyState: "Maharashtra",
    minCibil: 700,
    minAge: 21,
    maxAge: 65,
    minTenureMonths: 12,
    maxTenureMonths: 360,
    minLoanAmount: 500000,
    maxLoanAmount: 10000000,
    minIncome: 30000,
    interestRate: 8.5,
    maxFoir: 55,
    effectiveDate: "2026-10-01",
    expiryDate: "2027-10-01",
    requiredDocuments: "",
  };
  try {
    const org = await prisma.organization.create({
      data: { slug: "rupee-catalyst", name: "CERT-SR Organization", isActive: true },
    });
    createdIds.org = org.id;
    const category = await prisma.enterpriseLenderCategory.create({
      data: {
        organizationId: org.id,
        code: "CERT-SR-RETRY-CAT",
        label: "CERT-SR Retry Category",
        createdBy: "CERT-SR-MAKER",
        modifiedBy: "CERT-SR-MAKER",
      },
    });
    createdIds.category = category.id;
    const lender = await prisma.enterpriseLender.create({
      data: {
        organizationId: org.id,
        categoryId: category.id,
        code: "CERT-SR-L-RETRY",
        label: "CERT-SR Retry Lender",
        institutionCategory: "bank",
        createdBy: "CERT-SR-MAKER",
        modifiedBy: "CERT-SR-MAKER",
      },
    });
    createdIds.lender = lender.id;
    const policy = await prisma.enterpriseCreditRiskPolicy.create({
      data: {
        organizationId: org.id,
        policyCode: "CERT-SR-RETRY-POLICY",
        name: "CERT-SR Retry Policy",
        status: "published",
        createdBy: "CERT-SR-MAKER",
        modifiedBy: "CERT-SR-MAKER",
      },
    });
    createdIds.policy = policy.id;
    const version = await prisma.enterpriseCreditRiskPolicyVersion.create({
      data: {
        organizationId: org.id,
        policyId: policy.id,
        versionNumber: 1,
        status: "published",
        createdBy: "CERT-SR-MAKER",
      },
    });
    createdIds.version = version.id;
    const assignment = await prisma.hlRecommendationLenderCategoryAssignment.create({
      data: {
        organizationId: org.id,
        lenderId: lender.id,
        category: "A",
        lineageId: "CERT-SR-RETRY-LINEAGE",
        lifecycleStatus: "active",
        makerUserId: "CERT-SR-MAKER",
      },
    });
    createdIds.assignment = assignment.id;
    const invite = await prisma.lenderProgramPortalInvite.create({
      data: {
        organizationId: org.id,
        lenderId: lender.id,
        token: `CERT-SR-RETRY-${Date.now()}`,
        expiresAt: new Date("2027-01-01T00:00:00.000Z"),
        createdBy: "CERT-SR-MAKER",
      },
    });
    createdIds.invite = invite.id;
    const submission = await prisma.lenderProgramSubmission.create({
      data: {
        organizationId: org.id,
        inviteId: invite.id,
        lenderId: lender.id,
        productCode: "HOME_LOAN",
        templateKey: "CERT-SR",
        programName: "CERT-SR Retry",
        status: "approved",
        proposedPayload: basePayload,
      },
    });
    createdIds.submission = submission.id;

    const review = {
      action: "publish" as const,
      policyVersionId: version.id,
      actorUserId: "CERT-SR-CHECKER",
      actorName: "CERT-SR-CHECKER",
      actorRole: "SUPER_ADMIN",
    };
    let firstError = "";
    try {
      await lenderProgramPortalService.reviewSubmission(submission.id, review);
    } catch (error) {
      firstError = error instanceof Error ? error.message : String(error);
    }
    const afterFirst = await prisma.enterpriseLenderProgram.findMany({
      where: { lenderId: lender.id, isDeleted: false },
      select: { id: true, isLivePublished: true },
    });
    await prisma.lenderProgramSubmission.update({
      where: { id: submission.id },
      data: { proposedPayload: { ...basePayload, requiredDocuments: "Salary slips" } },
    });
    let secondError = "";
    let publishedId = "";
    try {
      const result = await lenderProgramPortalService.reviewSubmission(submission.id, review);
      publishedId = String((result as { publishedProgramId?: string }).publishedProgramId ?? "");
    } catch (error) {
      secondError = error instanceof Error ? error.message : String(error);
    }
    const afterSecond = await prisma.enterpriseLenderProgram.findMany({
      where: { lenderId: lender.id, isDeleted: false },
    });
    const programme = afterSecond[0];
    const audits = programme
      ? await prisma.enterpriseLenderProgramAuditEvent.findMany({
          where: { programId: programme.id },
          orderBy: { createdAt: "asc" },
          select: { action: true, reason: true },
        })
      : [];
    check("first-publish-failed", firstError.includes("Required documents"), firstError.slice(0, 180));
    check("first-row-unpublished", afterFirst.length === 1 && afterFirst[0]?.isLivePublished !== true);
    check("retry-published", secondError === "" && programme?.isLivePublished === true && programme.publicationState === "published", secondError.slice(0, 240));
    check("same-programme-id", Boolean(programme) && programme?.id === afterFirst[0]?.id && publishedId === programme?.id);
    check("no-successor", afterSecond.length === 1);
    check(
      "audit-history",
      audits.some((row) => row.reason === "portal_draft_saved") && audits.some((row) => row.action === "published"),
      audits.map((row) => `${row.action}:${row.reason}`).join(", "),
    );
  } finally {
    const programmeIds = createdIds.lender
      ? (await prisma.enterpriseLenderProgram.findMany({
          where: { lenderId: createdIds.lender },
          select: { id: true },
        })).map((row) => row.id)
      : [];
    if (createdIds.org) {
      await prisma.lenderProgramPortalAudit.deleteMany({ where: { organizationId: createdIds.org } });
      await prisma.enterpriseRegistryAuditEntry.deleteMany({ where: { organizationId: createdIds.org } });
    }
    if (programmeIds.length > 0) {
      await prisma.enterpriseLenderProgramAuditEvent.deleteMany({ where: { programId: { in: programmeIds } } });
      await prisma.enterpriseDeal.deleteMany({ where: { lenderProgramId: { in: programmeIds } } });
      await prisma.enterpriseLenderProgram.deleteMany({ where: { id: { in: programmeIds } } });
    }
    if (createdIds.submission) await prisma.lenderProgramSubmission.delete({ where: { id: createdIds.submission } }).catch(() => undefined);
    if (createdIds.invite) await prisma.lenderProgramPortalInvite.delete({ where: { id: createdIds.invite } }).catch(() => undefined);
    if (createdIds.assignment) await prisma.hlRecommendationLenderCategoryAssignment.delete({ where: { id: createdIds.assignment } }).catch(() => undefined);
    if (createdIds.version) await prisma.enterpriseCreditRiskPolicyVersion.delete({ where: { id: createdIds.version } }).catch(() => undefined);
    if (createdIds.policy) await prisma.enterpriseCreditRiskPolicy.delete({ where: { id: createdIds.policy } }).catch(() => undefined);
    if (createdIds.lender) await prisma.enterpriseLender.delete({ where: { id: createdIds.lender } }).catch(() => undefined);
    if (createdIds.category) await prisma.enterpriseLenderCategory.delete({ where: { id: createdIds.category } }).catch(() => undefined);
    if (createdIds.org) await prisma.organization.delete({ where: { id: createdIds.org } }).catch(() => undefined);
    const leftoverProgrammes = await prisma.enterpriseLenderProgram.count();
    const leftoverOrgs = await prisma.organization.count();
    check("bat-clean", leftoverProgrammes === 0 && leftoverOrgs === 0, `programmes=${leftoverProgrammes} orgs=${leftoverOrgs}`);
    await prisma.$disconnect();
  }
}

async function main() {
  if (process.argv.includes("--database")) await databaseRetry();
  if (failures.length > 0) {
    console.error(`FAILED ${failures.length}`);
    process.exit(1);
  }
}

main().catch((error) => {
  console.error("RETRY_VERIFY_FATAL", error instanceof Error ? error.message : String(error));
  process.exit(1);
});
