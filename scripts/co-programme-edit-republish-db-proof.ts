/**
 * Disposable-database proof for unpublish, Minimum ROI save, and republish.
 * Connects only to 127.0.0.1:55434. Does not print credentials.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { emptyProgrammeEditorState, type ProgrammeEditorState } from "../src/lib/product-programme-operations/editor-state";
import { toProgrammeWritePayload } from "../src/lib/product-programme-operations/to-write-payload";
import { buildPartnerRecommendationLoanFile } from "../src/lib/enterprise-partner-recommendations/project";
import { recommendPublishedLendersFromOptions } from "../src/lib/enterprise-lender-registry/recommend-from-registry";
import { projectPublicProgrammeMatchInput } from "../src/lib/compass-customer-gateway/public-programme-match";
import { selectCurrentProgramme } from "../src/lib/enterprise-lender-registry/programme-versioning";

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

function safe(error: unknown): string {
  const text = error instanceof Error ? error.message : String(error);
  return text.replace(/postgresql:\/\/\S+/gi, "postgresql://redacted");
}

async function main() {
  const { prisma } = await import("../server/lib/prisma");
  const { lenderRegistryRepository } = await import(
    "../server/repositories/lender-registry/lender-registry.repository"
  );
  const { productProgrammeOperationsService } = await import(
    "../server/services/product-programme-operations/programme.service"
  );
  const { projectRegistryProgrammeRecommendations } = await import(
    "../server/services/compass-customer-gateway/compass-recommendations.service"
  );
  const { deriveChanakyaOpportunityRecommendationsFromOptions } = await import(
    "../src/lib/chanakya-opportunity-recommendations"
  );

  const identity = await prisma.$queryRawUnsafe<Array<{ database: string; port: number; role: string }>>(
    "SELECT current_database() AS database, inet_server_port() AS port, current_user AS role",
  );
  const id = identity[0];
  if (!id || id.database !== database || Number(id.port) !== 55434 || id.role !== "ppo_bat") {
    throw new Error("Connected database is not the authorised local BAT database.");
  }

  const stamp = Date.now().toString(36);
  const created = {
    orgId: "",
    categoryId: "",
    lenderId: "",
    programmeId: "",
    historyId: "",
    extraIds: [] as string[],
    dealId: "",
    policyId: "",
    policyVersionId: "",
    assignmentId: "",
  };
  const maker = "db-cert-maker";
  const checker = "db-cert-checker";

  try {
    const org = await prisma.organization.create({
      data: { slug: `db-cert-${stamp}`, name: "DB Cert Organization", isActive: true },
    });
    created.orgId = org.id;
    const category = await prisma.enterpriseLenderCategory.create({
      data: {
        organizationId: org.id,
        code: `DB-CERT-CAT-${stamp}`,
        label: "DB Cert Category",
        createdBy: maker,
        modifiedBy: maker,
      },
    });
    created.categoryId = category.id;
    const lender = await prisma.enterpriseLender.create({
      data: {
        organizationId: org.id,
        categoryId: category.id,
        code: `DBBOI-${stamp}`,
        label: "Bank of India",
        displayName: "Bank of India",
        institutionCategory: "bank",
        createdBy: maker,
        modifiedBy: maker,
      },
    });
    created.lenderId = lender.id;
    const policy = await prisma.enterpriseCreditRiskPolicy.create({
      data: {
        organizationId: org.id,
        policyCode: `DB-CERT-POL-${stamp}`,
        name: "DB Cert Home Loan Policy",
        status: "published",
        createdBy: maker,
        modifiedBy: maker,
      },
    });
    created.policyId = policy.id;
    const policyVersion = await prisma.enterpriseCreditRiskPolicyVersion.create({
      data: {
        organizationId: org.id,
        policyId: policy.id,
        versionNumber: 1,
        status: "published",
        createdBy: maker,
        publishedBy: checker,
        publishedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
    created.policyVersionId = policyVersion.id;
    await prisma.enterpriseCreditRiskPolicy.update({
      where: { id: policy.id },
      data: { currentPublishedVersionId: policyVersion.id },
    });
    const assignment = await prisma.hlRecommendationLenderCategoryAssignment.create({
      data: {
        organizationId: org.id,
        lenderId: lender.id,
        category: "A",
        lineageId: `db-cert-cat-${stamp}`,
        versionNumber: 1,
        lifecycleStatus: "active",
        effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
        makerUserId: maker,
        checkerUserId: checker,
        approvedAt: new Date("2026-01-01T00:00:00.000Z"),
      },
    });
    created.assignmentId = assignment.id;

    const commercial = {
      employmentTypes: ["salaried"],
      legalConstitutions: ["individual"],
      residencyEligibility: ["resident"],
      propertyCategories: ["residential"],
      constructionStatuses: ["ready"],
      transactionTypes: ["fresh"],
      eligibleStates: ["MH"],
      incomeAssessmentMethods: ["salary"],
      requiredDocumentTypeIds: ["doc:pan"],
      rateType: "floating",
      benchmarkCode: "repo",
      minCibil: 700,
      minAge: 21,
      maxAge: 65,
      minTenureMonths: 12,
      maxTenureMonths: 360,
      minLoanAmountExact: "500000.00",
      maxLoanAmountExact: "25000000.00",
      minIncomeExact: "25000.00",
      minRoiExact: "7.100000",
      maxRoiExact: "8.500000",
      effectiveFrom: new Date("2026-01-01T00:00:00.000Z"),
      reviewAt: new Date("2027-01-01T00:00:00.000Z"),
    };

    const programme = await prisma.enterpriseLenderProgram.create({
      data: {
        organizationId: org.id,
        lenderId: lender.id,
        lineageId: `db-cert-current-${stamp}`,
        code: "BASE_BOI_HOME_LOAN",
        label: "Bank of India Home Loan",
        productCode: "HOME_LOAN",
        employmentType: "salaried",
        roiPercent: 7.4,
        policyVersionId: policyVersion.id,
        status: "active",
        lifecycleStatus: "active",
        enabled: true,
        isLivePublished: true,
        publicationState: "published",
        completenessState: "complete",
        approvalStatus: "approved",
        versionNumber: 3,
        createdBy: maker,
        modifiedBy: maker,
        ...commercial,
      },
    });
    created.programmeId = programme.id;
    const history = await prisma.enterpriseLenderProgram.create({
      data: {
        organizationId: org.id,
        lenderId: lender.id,
        lineageId: `db-cert-history-${stamp}`,
        code: "BASE_BOI_HOME_LOAN_HISTORY",
        label: "Bank of India Home Loan History",
        productCode: "HOME_LOAN",
        employmentType: "salaried",
        employmentTypes: ["salaried"],
        roiPercent: 6.5,
        minRoiExact: "6.500000",
        maxRoiExact: "8.000000",
        policyVersionId: policyVersion.id,
        status: "inactive",
        lifecycleStatus: "inactive",
        enabled: true,
        isLivePublished: false,
        publicationState: "superseded",
        completenessState: "complete",
        versionNumber: 2,
        createdBy: maker,
        modifiedBy: maker,
      },
    });
    created.historyId = history.id;
    const snapshot = {
      publishedProgrammeStamp: { programmeId: programme.id, programmeVersion: 3, roiPercent: 7.1 },
      commercialTerms: { roiPercent: 7.1 },
    };
    const deal = await prisma.enterpriseDeal.create({
      data: {
        organizationId: org.id,
        dealNumber: `DB-CERT-${stamp}`,
        lenderId: lender.id,
        lenderProgramId: programme.id,
        productFamily: "lending",
        productCode: "HOME_LOAN",
        grossStage: "identified",
        stageEnteredAt: new Date("2026-10-01T00:00:00.000Z"),
        snapshot,
        commercialTerms: { roiPercent: 7.1 },
        createdBy: maker,
      },
    });
    created.dealId = deal.id;

    const editor = {
      ...emptyProgrammeEditorState(),
      lenderId: lender.id,
      code: "BASE_BOI_HOME_LOAN",
      label: "Bank of India Home Loan",
      productCode: "HOME_LOAN",
      employmentTypes: ["salaried"],
      legalConstitutions: ["individual"],
      residencyEligibility: ["resident"],
      propertyCategories: ["residential"],
      constructionStatuses: ["ready"],
      transactionTypes: ["fresh"],
      geographyStates: ["MH"],
      minLoanAmountExact: "500000.00",
      maxLoanAmountExact: "25000000.00",
      minIncomeExact: "25000.00",
      minRoiExact: "7.25",
      maxRoiExact: "8.50",
      rateType: "floating",
      benchmarkCode: "repo",
      minCibil: 700,
      minAge: 21,
      maxAge: 65,
      minTenureMonths: 12,
      maxTenureMonths: 360,
      policyVersionId: policyVersion.id,
      requiredDocumentTypeIds: ["doc:pan"],
      incomeAssessmentMethods: ["salary"],
      effectiveFrom: "2026-01-01T00:00:00.000Z",
      reviewAt: "2027-01-01T00:00:00.000Z",
      roiPercent: 7.4,
    } as ProgrammeEditorState;

    function saveBody(versionNumber: number, lockVersion: number, roiPercent: unknown = 7.4) {
      return {
        ...toProgrammeWritePayload(editor),
        roiPercent,
        expectedLockVersion: lockVersion,
        expectedVersionNumber: versionNumber,
        changeReason: "minimum_roi_revision",
      };
    }

    const actor = { organizationId: org.id, actorUserId: maker, actorRole: "ADMIN", actorName: "DB Cert Maker" };
    let workflowCalls = 0;

    let publishedSaveMessage = "";
    try {
      await productProgrammeOperationsService.update({
        ...actor,
        programId: programme.id,
        body: saveBody(3, 1),
      });
      publishedSaveMessage = "NO_THROW";
    } catch (error) {
      publishedSaveMessage = safe(error);
    }
    assert.match(publishedSaveMessage, /Unpublish/, publishedSaveMessage);
    assert.equal(workflowCalls, 0);
    const stillPublished = await prisma.enterpriseLenderProgram.findUnique({ where: { id: programme.id } });
    assert.equal(Number(stillPublished?.minRoiExact), 7.1);
    assert.equal(stillPublished?.publicationState, "published");
    assert.equal(stillPublished?.versionNumber, 3);

    const unpublished = await lenderRegistryRepository.governProgramme(
      programme.id,
      { action: "unpublish", expectedVersionNumber: 3, reason: "Rate revision" },
      { userId: maker, name: "DB Cert Maker" },
    );
    assert.equal(unpublished.id, programme.id);
    assert.equal(unpublished.publicationState, "draft");
    assert.equal(unpublished.versionNumber, 4);
    assert.equal(Number(unpublished.minRoiExact), 7.1);

    const afterUnpublish = await prisma.enterpriseLenderProgram.findUnique({ where: { id: programme.id } });
    assert.equal(afterUnpublish?.versionNumber, 4);
    const lockAfterUnpublish = afterUnpublish?.lockVersion ?? 0;

    let staleMessage = "";
    try {
      await productProgrammeOperationsService.update({
        ...actor,
        programId: programme.id,
        body: saveBody(3, lockAfterUnpublish),
      });
      staleMessage = "NO_THROW";
    } catch (error) {
      staleMessage = safe(error);
    }
    assert.match(staleMessage, /someone else|concurrently/, staleMessage);
    assert.equal(workflowCalls, 0);

    const parallel = await Promise.allSettled([
      productProgrammeOperationsService.update({
        ...actor,
        programId: programme.id,
        body: saveBody(3, lockAfterUnpublish),
      }),
      productProgrammeOperationsService.update({
        ...actor,
        programId: programme.id,
        body: saveBody(2, lockAfterUnpublish - 1),
      }),
    ]);
    assert.equal(parallel.every((item) => item.status === "rejected"), true, "parallel stale saves were not both rejected");
    const afterStale = await prisma.enterpriseLenderProgram.findUnique({ where: { id: programme.id } });
    assert.equal(Number(afterStale?.minRoiExact), 7.1);
    assert.equal(afterStale?.versionNumber, 4);
    assert.equal(afterStale?.roiPercent, 7.4);
    assert.equal(Number(afterStale?.maxRoiExact), 8.5);

    let invalidRoiRejected = false;
    try {
      await productProgrammeOperationsService.update({
        ...actor,
        programId: programme.id,
        body: saveBody(4, lockAfterUnpublish, "7.25"),
      });
    } catch (error) {
      invalidRoiRejected = /finite number/.test(safe(error));
    }
    assert.equal(invalidRoiRejected, true, "invalid generic ROI was not rejected");
    assert.equal(workflowCalls, 0);
    const afterInvalid = await prisma.enterpriseLenderProgram.findUnique({ where: { id: programme.id } });
    assert.equal(Number(afterInvalid?.minRoiExact), 7.1);
    assert.equal(afterInvalid?.publicationState, "draft");

    const saved = await productProgrammeOperationsService.update({
      ...actor,
      programId: programme.id,
      body: saveBody(4, lockAfterUnpublish),
    });
    assert.equal(saved.id, programme.id);
    assert.equal(Number(saved.minRoiExact), 7.25);
    assert.equal(Number(saved.maxRoiExact), 8.5);
    assert.equal(saved.roiPercent, 7.4);
    assert.equal(saved.versionNumber, 5);
    assert.equal(saved.policyVersionId, policyVersion.id);
    const reread = await prisma.enterpriseLenderProgram.findUnique({ where: { id: programme.id } });
    assert.equal(Number(reread?.minRoiExact), 7.25);
    assert.equal(Number(reread?.maxRoiExact), 8.5);
    assert.equal(reread?.roiPercent, 7.4);
    assert.equal(reread?.employmentType, "salaried");
    assert.equal(reread?.code, "BASE_BOI_HOME_LOAN");
    assert.equal(reread?.policyVersionId, policyVersion.id);
    assert.equal(reread?.publicationState, "draft");

    let staleSubmitRejected = false;
    try {
      await productProgrammeOperationsService.submit({
        ...actor,
        programId: programme.id,
        expectedVersionNumber: 4,
      });
      workflowCalls += 1;
    } catch (error) {
      staleSubmitRejected = /someone else/.test(safe(error));
    }
    assert.equal(staleSubmitRejected, true, "stale submit was not rejected");
    assert.equal(workflowCalls, 0);
    const beforeSubmit = await prisma.enterpriseLenderProgram.findUnique({ where: { id: programme.id } });
    assert.equal(beforeSubmit?.publicationState, "draft");
    assert.equal(Number(beforeSubmit?.minRoiExact), 7.25);

    const submitted = await productProgrammeOperationsService.submit({
      ...actor,
      programId: programme.id,
      expectedVersionNumber: 5,
    });
    workflowCalls += 1;
    assert.equal(submitted.publicationState, "pending_approval");
    assert.equal(submitted.versionNumber, 5);
    assert.equal(Number(submitted.minRoiExact), 7.25);

    let staleApproveRejected = false;
    try {
      await productProgrammeOperationsService.approve({
        organizationId: org.id,
        actorUserId: checker,
        actorRole: "ADMIN",
        actorName: "DB Cert Checker",
        programId: programme.id,
        expectedVersionNumber: 1,
      });
      workflowCalls += 1;
    } catch (error) {
      staleApproveRejected = /someone else/.test(safe(error));
    }
    assert.equal(staleApproveRejected, true, "stale approve was not rejected");
    const beforeApprove = await prisma.enterpriseLenderProgram.findUnique({ where: { id: programme.id } });
    assert.equal(beforeApprove?.approvalStatus, "pending");
    assert.equal(Number(beforeApprove?.minRoiExact), 7.25);

    const approved = await productProgrammeOperationsService.approve({
      organizationId: org.id,
      actorUserId: checker,
      actorRole: "ADMIN",
      actorName: "DB Cert Checker",
      programId: programme.id,
      expectedVersionNumber: 5,
    });
    workflowCalls += 1;
    assert.equal(approved.approvalStatus, "approved");
    assert.equal(approved.versionNumber, 5);
    assert.equal(Number(approved.minRoiExact), 7.25);

    const republished = await productProgrammeOperationsService.publish({
      organizationId: org.id,
      actorUserId: checker,
      actorRole: "ADMIN",
      actorName: "DB Cert Checker",
      programId: programme.id,
    });
    workflowCalls += 1;
    assert.equal(republished.id, programme.id);
    assert.equal(republished.publicationState, "published");
    assert.equal(republished.isLivePublished, true);
    assert.equal(republished.versionNumber, 6);
    assert.equal(Number(republished.minRoiExact), 7.25);
    assert.equal(Number(republished.maxRoiExact), 8.5);
    assert.equal(republished.roiPercent, 7.4);

    const currentRow = await prisma.enterpriseLenderProgram.findUnique({ where: { id: programme.id } });
    assert.equal(currentRow?.publicationState, "published");
    assert.equal(Number(currentRow?.minRoiExact), 7.25);
    const historyAfter = await prisma.enterpriseLenderProgram.findUnique({ where: { id: history.id } });
    assert.equal(historyAfter?.publicationState, "superseded");
    assert.equal(Number(historyAfter?.minRoiExact), 6.5);
    assert.equal(historyAfter?.roiPercent, 6.5);
    assert.equal(historyAfter?.versionNumber, 2);
    const policyAfter = await prisma.enterpriseCreditRiskPolicy.findUnique({ where: { id: policy.id } });
    const policyVersionAfter = await prisma.enterpriseCreditRiskPolicyVersion.findUnique({
      where: { id: policyVersion.id },
    });
    assert.equal(policyAfter?.status, "published");
    assert.equal(policyVersionAfter?.status, "published");
    assert.equal(policyVersionAfter?.versionNumber, 1);
    const dealAfter = await prisma.enterpriseDeal.findUnique({ where: { id: deal.id } });
    assert.equal(dealAfter?.lenderProgramId, programme.id);
    assert.deepEqual(dealAfter?.snapshot, snapshot);
    assert.deepEqual(dealAfter?.commercialTerms, { roiPercent: 7.1 });

    const programs = [];
    for (const row of await prisma.enterpriseLenderProgram.findMany({
      where: { lenderId: lender.id, isDeleted: false },
    })) {
      const mapped = await lenderRegistryRepository.findProgramById(row.id);
      if (mapped) programs.push(mapped);
    }
    const current = selectCurrentProgramme(programs, "salaried");
    assert.equal(
      current?.id,
      programme.id,
      programs
        .map((program) => `${program.code}:${program.publicationState}:${program.employmentType}:${program.isLivePublished}`)
        .join(","),
    );
    assert.equal(Number(current?.minRoiExact), 7.25);
    const detail = {
      opportunityId: "opp-db-cert",
      reference: "OPP-DB-CERT",
      customerId: "ctc-db-cert",
      customerDisplayName: "DB Cert Customer",
      ownerLabel: "",
      createdAt: "2026-10-30T00:00:00.000Z",
      productCode: "HOME_LOAN",
      productLabel: "Home Loan",
      requiredAmountLabel: "5000000",
      borrowerFields: {
        employmentTypeCode: "salaried",
        residency: "resident",
        ageYears: "35",
        propertyCity: "Pune",
        approxCibilScore: "760",
      },
      productFields: {
        requestedAmountLabel: "5000000",
        propertyCategory: "residential",
        constructionStatus: "ready",
      },
    };
    const lenderOption = {
      id: lender.id,
      code: lender.code,
      displayName: "Bank of India",
      legalName: "Bank of India",
      institutionCategory: "bank" as const,
      aliases: [],
      source: "api" as const,
      published: true,
      active: true,
    };
    const compass = projectRegistryProgrammeRecommendations({
      detail: detail as never,
      lenders: [lenderOption],
      programs,
      requestedAmount: 5_000_000,
    });
    assert.equal(compass.cards.length, 1);
    assert.equal(compass.cards[0]?.programmeId, programme.id);
    assert.equal(compass.cards[0]?.interestRateLabel, "Indicative 7.25% – 8.50%");
    assert.equal(compass.cards[0]?.programmeVersion, 6);
    const file = buildPartnerRecommendationLoanFile(detail as never);
    file.city = "Pune";
    file.approxCibilScore = "760";
    file.loanAmount = 5_000_000;
    file.requiredAmount = 5_000_000;
    file.propertyType = "residential";
    file.lendingType = "secured";
    file.employmentType = "salaried";
    file.transactionType = "fresh";
    const chanakya = deriveChanakyaOpportunityRecommendationsFromOptions({
      file,
      stated: { statedPropertyType: "residential", statedPropertyValue: "8000000" },
      registryOptions: [lenderOption],
      programmes: programs,
      limit: 5,
    });
    assert.equal(chanakya.recommendations.length, 0);
    assert.match(chanakya.guidance.join(" "), /No applicable published programme/);
    const ranked = recommendPublishedLendersFromOptions([lenderOption], {
      file,
      programmes: programs,
      limit: 5,
      matchInput: projectPublicProgrammeMatchInput(detail as never),
    });
    assert.equal(ranked[0]?.programmeId, programme.id);
    assert.equal(ranked.length, 1);

    const sibling = await prisma.enterpriseLenderProgram.create({
      data: {
        organizationId: org.id,
        lenderId: lender.id,
        lineageId: `db-cert-sibling-${stamp}`,
        code: "BASE_BOI_HOME_LOAN_DUP",
        label: "Duplicate Home Loan",
        productCode: "HOME_LOAN",
        employmentType: "salaried",
        roiPercent: 9,
        minRoiExact: "7.990000",
        maxRoiExact: "8.500000",
        policyVersionId: policyVersion.id,
        status: "draft",
        lifecycleStatus: "draft",
        enabled: true,
        isLivePublished: false,
        publicationState: "draft",
        approvalStatus: "approved",
        completenessState: "complete",
        versionNumber: 1,
        createdBy: maker,
        modifiedBy: maker,
        ...commercial,
        minRoiExact: "7.990000",
      },
    });
    created.extraIds.push(sibling.id);
    let duplicateMessage = "";
    try {
      await productProgrammeOperationsService.publish({
        organizationId: org.id,
        actorUserId: checker,
        actorRole: "ADMIN",
        actorName: "DB Cert Checker",
        programId: sibling.id,
      });
      duplicateMessage = "NO_THROW";
    } catch (error) {
      duplicateMessage = safe(error);
    }
    assert.match(duplicateMessage, /owns this lender|already owns/, duplicateMessage);
    const protectedCurrent = await prisma.enterpriseLenderProgram.findUnique({ where: { id: programme.id } });
    assert.equal(protectedCurrent?.publicationState, "published");
    assert.equal(Number(protectedCurrent?.minRoiExact), 7.25);
    assert.equal(protectedCurrent?.versionNumber, 6);

    console.log(
      JSON.stringify({
        programmeId: programme.id,
        sameProgrammeId: true,
        versionAfterUnpublish: 4,
        versionAfterSave: 5,
        versionAfterSubmit: 5,
        versionAfterApprove: 5,
        versionAfterPublish: 6,
        minRoiExact: "7.250000",
        maxRoiExact: "8.500000",
        roiPercent: 7.4,
        recommendationLabel: compass.cards[0]?.interestRateLabel,
        publishedSaveRejected: true,
        staleRejected: true,
        invalidRoiRejected,
        staleSubmitRejected,
        staleApproveRejected,
        duplicateRejected: true,
        historyUnchanged: true,
        dealUnchanged: true,
        policyUnchanged: true,
        workflowCalls,
      }),
    );
    console.log("programme edit republish database proof passed");
  } finally {
    if (created.dealId) await prisma.enterpriseDeal.deleteMany({ where: { id: created.dealId } });
    const programIds = [created.programmeId, created.historyId, ...created.extraIds].filter(Boolean);
    if (programIds.length) {
      await prisma.enterpriseLenderProgramAuditEvent.deleteMany({ where: { programId: { in: programIds } } });
      await prisma.enterpriseLenderProgram.deleteMany({ where: { id: { in: programIds } } });
    }
    if (created.assignmentId) {
      await prisma.hlRecommendationLenderCategoryAssignment.deleteMany({ where: { id: created.assignmentId } });
    }
    if (created.policyId) {
      await prisma.enterpriseCreditRiskPolicy.updateMany({
        where: { id: created.policyId },
        data: { currentPublishedVersionId: null },
      });
    }
    if (created.policyVersionId) {
      await prisma.enterpriseCreditRiskPolicyVersion.deleteMany({ where: { id: created.policyVersionId } });
    }
    if (created.policyId) await prisma.enterpriseCreditRiskPolicy.deleteMany({ where: { id: created.policyId } });
    if (created.lenderId) await prisma.enterpriseLender.deleteMany({ where: { id: created.lenderId } });
    if (created.categoryId) await prisma.enterpriseLenderCategory.deleteMany({ where: { id: created.categoryId } });
    if (created.orgId) await prisma.organization.deleteMany({ where: { id: created.orgId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(safe(error));
  process.exit(1);
});
