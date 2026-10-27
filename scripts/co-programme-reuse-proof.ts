/**
 * Local proof that a revised published programme governs new recommendations.
 * Uses the existing disposable BAT database. No production connection.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

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

async function main() {
  const { prisma } = await import("../server/lib/prisma");
  const { lenderRegistryRepository } = await import(
    "../server/repositories/lender-registry/lender-registry.repository"
  );
  const { projectRegistryProgrammeRecommendations } = await import(
    "../server/services/compass-customer-gateway/compass-recommendations.service"
  );
  const { deriveChanakyaOpportunityRecommendationsFromOptions } = await import(
    "../src/lib/chanakya-opportunity-recommendations"
  );
  const { rankPublishedProgrammes } = await import(
    "../src/lib/enterprise-lender-registry/published-program-match"
  );
  const { selectDealProgrammeListing, PROGRAMME_STALE_VERSION_MESSAGE } = await import(
    "../src/lib/enterprise-lender-registry/programme-versioning"
  );
  const { runHomeLoanRecommendationEngine } = await import("../src/lib/home-loan-recommendation/engine");
  const { calculateReducingBalanceEmi } = await import("../src/lib/home-loan-recommendation/tenure");
  const { buildPartnerRecommendationLoanFile } = await import(
    "../src/lib/enterprise-partner-recommendations/project"
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
    currentId: "",
    retiredId: "",
    pendingId: "",
    duplicateId: "",
    dealId: "",
    currentAuditId: "",
    retiredAuditId: "",
    extraIds: [] as string[],
  };

  const detail = {
    opportunityId: "opp-reuse",
    reference: "OPP-REUSE",
    customerId: "ctc-reuse",
    customerDisplayName: "Reuse Customer",
    ownerLabel: "",
    createdAt: "2026-10-28T00:00:00.000Z",
    productCode: "HOME_LOAN",
    productLabel: "Home Loan",
    requiredAmountLabel: "5000000",
    borrowerFields: { employmentTypeCode: "salaried", city: "Pune" },
    productFields: {
      requestedAmountLabel: "5000000",
      propertyCategory: "residential",
      constructionStatus: "ready",
      lendingType: "secured",
      transactionType: "fresh",
    },
  };

  function loanFile() {
    const file = buildPartnerRecommendationLoanFile(detail as never);
    file.city = "Pune";
    file.approxCibilScore = "760";
    file.loanAmount = 5_000_000;
    file.requiredAmount = 5_000_000;
    return file;
  }

  async function loadFamily() {
    const rows = await prisma.enterpriseLenderProgram.findMany({
      where: { lenderId: created.lenderId, isDeleted: false },
    });
    const programs = [];
    for (const row of rows) {
      const mapped = await lenderRegistryRepository.findProgramById(row.id);
      if (mapped) programs.push(mapped);
    }
    return programs;
  }

  function recommend(programs: Awaited<ReturnType<typeof loadFamily>>) {
    const lender = {
      id: created.lenderId,
      code: "REUSEBOM",
      displayName: "Bank of Maharashtra",
      legalName: "Bank of Maharashtra",
      institutionCategory: "bank" as const,
      aliases: [],
      source: "api" as const,
      published: true,
      active: true,
    };
    const compass = projectRegistryProgrammeRecommendations({
      detail: detail as never,
      lenders: [lender],
      programs,
      requestedAmount: 5_000_000,
    });
    const file = loanFile();
    file.propertyType = "residential";
    const chanakya = deriveChanakyaOpportunityRecommendationsFromOptions({
      file,
      stated: { statedPropertyType: "residential", statedPropertyValue: "8000000" },
      registryOptions: [lender],
      programmes: programs,
      limit: 5,
    });
    const ranked = rankPublishedProgrammes({
      productCode: "HOME_LOAN",
      profile: { employmentType: "salaried", approxCibil: 760, monthlyIncome: 100000, loanAmount: 5_000_000 },
      candidates: programs.map((program) => ({
        program,
        lenderId: created.lenderId,
        lenderCode: "REUSEBOM",
        lenderName: "Bank of Maharashtra",
        priorityRank: 1,
      })),
    });
    const listed = selectDealProgrammeListing(programs);
    return { compass, chanakya, ranked, listed };
  }

  try {
    const org = await prisma.organization.create({
      data: { slug: `reuse-${stamp}`, name: "Reuse Organization", isActive: true },
    });
    created.orgId = org.id;
    const category = await prisma.enterpriseLenderCategory.create({
      data: {
        organizationId: org.id,
        code: `REUSE-CAT-${stamp}`,
        label: "Reuse Category",
        createdBy: "reuse-proof",
        modifiedBy: "reuse-proof",
      },
    });
    created.categoryId = category.id;
    const lender = await prisma.enterpriseLender.create({
      data: {
        organizationId: org.id,
        categoryId: category.id,
        code: `REUSEBOM-${stamp}`,
        label: "Bank of Maharashtra",
        displayName: "Bank of Maharashtra",
        institutionCategory: "bank",
        createdBy: "reuse-proof",
        modifiedBy: "reuse-proof",
      },
    });
    created.lenderId = lender.id;

    const current = await prisma.enterpriseLenderProgram.create({
      data: {
        organizationId: org.id,
        lenderId: lender.id,
        lineageId: `reuse-current-${stamp}`,
        code: "BOM_HL_SAL",
        label: "BOM Home Loan Salaried",
        productCode: "HOME_LOAN",
        employmentType: "salaried",
        employmentTypes: ["salaried"],
        roiPercent: 9,
        minRoiExact: "7.000000",
        maxRoiExact: "8.500000",
        status: "active",
        lifecycleStatus: "active",
        enabled: true,
        isLivePublished: true,
        publicationState: "published",
        completenessState: "complete",
        versionNumber: 1,
        createdBy: "reuse-proof",
        modifiedBy: "reuse-proof",
      },
    });
    created.currentId = current.id;
    const retired = await prisma.enterpriseLenderProgram.create({
      data: {
        organizationId: org.id,
        lenderId: lender.id,
        lineageId: `reuse-retired-${stamp}`,
        code: "BOM_HL_SAL_OLD",
        label: "BOM Home Loan Salaried History",
        productCode: "HOME_LOAN",
        employmentType: "salaried",
        employmentTypes: ["salaried"],
        roiPercent: 6.5,
        status: "inactive",
        lifecycleStatus: "inactive",
        enabled: true,
        isLivePublished: false,
        publicationState: "superseded",
        completenessState: "complete",
        versionNumber: 1,
        createdBy: "reuse-proof",
        modifiedBy: "reuse-proof",
      },
    });
    created.retiredId = retired.id;
    const currentAudit = await prisma.enterpriseLenderProgramAuditEvent.create({
      data: {
        organizationId: org.id,
        programId: current.id,
        lineageId: current.lineageId,
        action: "published",
        previousValue: { roiPercent: null },
        newValue: { roiPercent: 7, programmeId: current.id },
        actorUserId: "reuse-proof",
        reason: "initial_publication",
      },
    });
    created.currentAuditId = currentAudit.id;
    const retiredAudit = await prisma.enterpriseLenderProgramAuditEvent.create({
      data: {
        organizationId: org.id,
        programId: retired.id,
        lineageId: retired.lineageId,
        action: "superseded",
        previousValue: { roiPercent: 6.5 },
        newValue: { publicationState: "superseded" },
        actorUserId: "reuse-proof",
        reason: "historical_retirement",
      },
    });
    created.retiredAuditId = retiredAudit.id;
    const snapshot = {
      publishedProgrammeStamp: { programmeId: current.id, programmeVersion: 1, roiPercent: 7 },
      commercialTerms: { roiPercent: 7 },
    };
    const deal = await prisma.enterpriseDeal.create({
      data: {
        organizationId: org.id,
        dealNumber: `REUSE-${stamp}`,
        lenderId: lender.id,
        lenderProgramId: current.id,
        productFamily: "lending",
        productCode: "HOME_LOAN",
        grossStage: "identified",
        stageEnteredAt: new Date("2026-10-01T00:00:00.000Z"),
        snapshot,
        commercialTerms: { roiPercent: 7 },
        createdBy: "reuse-proof",
      },
    });
    created.dealId = deal.id;

    const published = await loadFamily();
    const first = recommend(published);
    assert.equal(first.compass.cards.length, 1);
    assert.equal(first.compass.cards[0]!.interestRateLabel, "Indicative 7.00% – 8.50%");
    assert.equal(first.compass.cards[0]!.programmeId, current.id);
    assert.equal(first.chanakya.ready, true);
    assert.equal(first.chanakya.recommendations[0]!.programmeId, current.id);
    assert.equal(first.ranked[0]!.programmeId, current.id);
    assert.equal(first.ranked[0]!.interestRateLabel, "Indicative 7.00% – 8.50%");
    assert.equal(Number(published.find((row) => row.id === current.id)!.minRoiExact), 7);
    assert.deepEqual(first.listed.map((row) => row.id), [current.id]);
    assert.equal(Number(first.listed[0]!.minRoiExact), 7);

    let secondCreateFailed = false;
    try {
      await lenderRegistryRepository.createProgram(org.id, {
        lenderId: lender.id,
        code: "BOM_HL_SAL_SECOND",
        label: "Second current",
        productCode: "HOME_LOAN",
        employmentType: "salaried",
        roiPercent: 8,
        createdBy: "reuse-proof",
      });
    } catch {
      secondCreateFailed = true;
    }
    assert.equal(secondCreateFailed, true);

    const duplicate = await prisma.enterpriseLenderProgram.create({
      data: {
        organizationId: org.id,
        lenderId: lender.id,
        lineageId: `reuse-duplicate-${stamp}`,
        code: "BOM_HL_SAL_DUP",
        label: "Duplicate published",
        productCode: "HOME_LOAN",
        employmentType: "salaried",
        employmentTypes: ["salaried"],
        roiPercent: 9,
        status: "active",
        lifecycleStatus: "active",
        enabled: true,
        isLivePublished: true,
        publicationState: "published",
        completenessState: "complete",
        versionNumber: 1,
        createdBy: "reuse-proof",
        modifiedBy: "reuse-proof",
      },
    });
    created.duplicateId = duplicate.id;
    const ambiguous = recommend(await loadFamily());
    assert.equal(ambiguous.compass.cards.length, 0);
    assert.equal(ambiguous.chanakya.recommendations.length, 0);
    assert.equal(ambiguous.ranked.length, 0);
    assert.equal(ambiguous.listed.length, 0);
    await prisma.enterpriseLenderProgramAuditEvent.deleteMany({ where: { programId: duplicate.id } });
    await prisma.enterpriseLenderProgram.delete({ where: { id: duplicate.id } });
    created.duplicateId = "";

    const pending = await prisma.enterpriseLenderProgram.create({
      data: {
        organizationId: org.id,
        lenderId: lender.id,
        lineageId: `reuse-pending-${stamp}`,
        code: "BOM_HL_SAL_PENDING",
        label: "Pending duplicate",
        productCode: "HOME_LOAN",
        employmentType: "salaried",
        employmentTypes: ["salaried"],
        roiPercent: 8,
        status: "draft",
        lifecycleStatus: "inactive",
        enabled: true,
        isLivePublished: false,
        publicationState: "pending_approval",
        completenessState: "incomplete",
        versionNumber: 1,
        createdBy: "reuse-proof",
        modifiedBy: "reuse-proof",
      },
    });
    created.pendingId = pending.id;
    let unpublishBlocked = false;
    try {
      await lenderRegistryRepository.governProgramme(
        current.id,
        { action: "unpublish", expectedVersionNumber: 1 },
        { userId: "reuse-proof", name: "Reuse proof" },
      );
    } catch (error) {
      unpublishBlocked = error instanceof Error && /already owns/.test(error.message);
    }
    assert.equal(unpublishBlocked, true);
    const stillPublished = await lenderRegistryRepository.findProgramById(current.id);
    assert.equal(stillPublished?.publicationState, "published");
    assert.equal(stillPublished?.roiPercent, 9);
    await prisma.enterpriseLenderProgram.delete({ where: { id: pending.id } });
    created.pendingId = "";

    const restored = recommend(await loadFamily());
    assert.equal(restored.compass.cards[0]!.interestRateLabel, "Indicative 7.00% – 8.50%");
    assert.equal(restored.compass.cards[0]!.programmeId, current.id);

      await lenderRegistryRepository.governProgramme(
        current.id,
        { action: "unpublish", expectedVersionNumber: 1, reason: "Rate revision" },
        { userId: "reuse-proof", name: "Reuse proof" },
      );
    const unpublished = recommend(await loadFamily());
    assert.equal(unpublished.compass.cards.length, 0);
    assert.equal(unpublished.chanakya.recommendations.length, 0);
    assert.equal(unpublished.ranked.length, 0);
    assert.equal(unpublished.listed.length, 0);

    const draft = await lenderRegistryRepository.findProgramById(current.id);
    assert.equal(draft?.id, current.id);
    await lenderRegistryRepository.updateProgram(current.id, {
      minRoiExact: "6.900000",
      expectedVersionNumber: draft!.versionNumber,
      modifiedBy: "reuse-proof",
      changeReason: "Minimum rate revision",
    });
    const edited = await lenderRegistryRepository.findProgramById(current.id);
    assert.equal(edited?.id, current.id);
    assert.equal(Number(edited?.minRoiExact), 6.9);
    assert.notEqual(edited?.publicationState, "published");

    await lenderRegistryRepository.governProgramme(
      current.id,
      { action: "republish", expectedVersionNumber: edited!.versionNumber, reason: "Rate revision" },
      { userId: "reuse-proof", name: "Reuse proof" },
    );
    const revisedPrograms = await loadFamily();
    const revised = recommend(revisedPrograms);
    const revisedRow = revisedPrograms.find((row) => row.id === current.id)!;
    assert.equal(Number(revisedRow.minRoiExact), 6.9);
    assert.equal(revisedRow.id, current.id);
    assert.equal(revised.compass.cards.length, 1);
    assert.equal(revised.compass.cards[0]!.programmeId, current.id);
    assert.equal(revised.compass.cards[0]!.interestRateLabel, "Indicative 6.90% – 8.50%");
    assert.equal(revised.chanakya.recommendations[0]!.programmeId, current.id);
    assert.equal(revised.ranked[0]!.programmeId, current.id);
    assert.equal(revised.ranked[0]!.interestRateLabel, "Indicative 6.90% – 8.50%");
    assert.deepEqual(revised.listed.map((row) => row.id), [current.id]);
    assert.equal(Number(revised.listed[0]!.minRoiExact), 6.9);

    const retiredAfter = await prisma.enterpriseLenderProgram.findUnique({ where: { id: retired.id } });
    assert.equal(retiredAfter?.publicationState, "superseded");
    assert.equal(retiredAfter?.roiPercent, 6.5);
    const dealAfter = await prisma.enterpriseDeal.findUnique({ where: { id: deal.id } });
    assert.deepEqual(dealAfter?.snapshot, snapshot);
    assert.deepEqual(dealAfter?.commercialTerms, { roiPercent: 7 });
    assert.equal(dealAfter?.lenderProgramId, current.id);
    const currentAuditAfter = await prisma.enterpriseLenderProgramAuditEvent.findUnique({
      where: { id: currentAudit.id },
    });
    const retiredAuditAfter = await prisma.enterpriseLenderProgramAuditEvent.findUnique({
      where: { id: retiredAudit.id },
    });
    assert.deepEqual(currentAuditAfter?.newValue, { roiPercent: 7, programmeId: current.id });
    assert.equal(currentAuditAfter?.reason, "initial_publication");
    assert.deepEqual(retiredAuditAfter?.newValue, { publicationState: "superseded" });
    assert.equal(retiredAuditAfter?.programId, retired.id);

    const assess = (program: typeof revisedRow, rate: number) => {
      const result = runHomeLoanRecommendationEngine({
        customer: {
          journeyKind: "home_loan",
          requiredAmountRupees: 5000000,
          propertyValueRupees: 8000000,
          employmentFamily: "salaried",
          monthlyIncomeRupees: 150000,
          ageYears: 35,
        },
        programmes: [
          {
            ...program,
            lenderCategory: "A",
            calculationComplete: true,
            maxFoirPercent: program.maxFoirPercent ?? 50,
            maxTenureMonths: program.maxTenureMonths ?? 240,
            maxAgeAtMaturityYears: program.maxAgeAtMaturityYears ?? 70,
          },
        ],
      });
      const card = result.cards[0];
      assert.ok(card, "assessment card");
      assert.equal(card.applicableRoiPercent, rate);
      assert.equal(card.roiIsIndicative, true);
      const expectedEmi = calculateReducingBalanceEmi({
        principalRupees: card.tentativeOfferRupees ?? 0,
        annualRoiPercent: rate,
        tenureMonths: card.tenureMonths,
      });
      assert.equal(card.indicativeEmiRupees, expectedEmi);
    };
    assess(revisedRow, 6.9);

    await assert.rejects(
      () =>
        lenderRegistryRepository.updateProgram(current.id, {
          minRoiExact: "1.000000",
          expectedVersionNumber: 1,
          modifiedBy: "intruder",
          changeReason: "stale",
        }),
      (error: unknown) => error instanceof Error && error.message === PROGRAMME_STALE_VERSION_MESSAGE,
    );

    const parallel = await Promise.allSettled([
      lenderRegistryRepository.createProgram(org.id, {
        lenderId: lender.id,
        productCode: "HOME_LOAN",
        code: `REUSE-${stamp}-RACE-A`,
        label: "Race A",
        employmentType: "self employed",
        status: "active",
        lifecycleStatus: "active",
        isLivePublished: true,
        publicationState: "published",
        completenessState: "complete",
        minRoiExact: "7.100000",
        createdBy: "reuse-proof",
        modifiedBy: "reuse-proof",
      }),
      lenderRegistryRepository.createProgram(org.id, {
        lenderId: lender.id,
        productCode: "HOME_LOAN",
        code: `REUSE-${stamp}-RACE-B`,
        label: "Race B",
        employmentType: "self employed",
        status: "active",
        lifecycleStatus: "active",
        isLivePublished: true,
        publicationState: "published",
        completenessState: "complete",
        minRoiExact: "7.200000",
        createdBy: "reuse-proof",
        modifiedBy: "reuse-proof",
      }),
    ]);
    for (const outcome of parallel) {
      if (outcome.status === "fulfilled") created.extraIds.push(outcome.value.id);
    }
    const parallelMessages = parallel.map((outcome) =>
      outcome.status === "fulfilled" ? "created" : outcome.reason instanceof Error ? outcome.reason.message : "rejected",
    );
    assert.equal(parallel.filter((outcome) => outcome.status === "fulfilled").length, 1, parallelMessages.join(" | "));
    assert.equal(parallel.filter((outcome) => outcome.status === "rejected").length, 1);

    const deactivateBlocker = await prisma.enterpriseLenderProgram.create({
      data: {
        organizationId: org.id,
        lenderId: lender.id,
        lineageId: `reuse-deactivate-${stamp}`,
        code: "BOM_HL_SAL_DEACTIVATE",
        label: "Deactivate blocker",
        productCode: "HOME_LOAN",
        employmentType: "salaried",
        employmentTypes: ["salaried"],
        status: "draft",
        lifecycleStatus: "inactive",
        enabled: true,
        isLivePublished: false,
        publicationState: "pending_approval",
        completenessState: "incomplete",
        versionNumber: 1,
        createdBy: "reuse-proof",
        modifiedBy: "reuse-proof",
      },
    });
    created.extraIds.push(deactivateBlocker.id);
    let deactivateBlocked = false;
    try {
      await lenderRegistryRepository.setProgramStatus(current.id, "inactive", "reuse-proof");
    } catch (error) {
      deactivateBlocked = error instanceof Error && /already owns/.test(error.message);
    }
    assert.equal(deactivateBlocked, true);
    const protectedRow = await lenderRegistryRepository.findProgramById(current.id);
    assert.equal(protectedRow?.publicationState, "published");
    assert.equal(Number(protectedRow?.minRoiExact), 6.9);
    await prisma.enterpriseLenderProgram.delete({ where: { id: deactivateBlocker.id } });
    created.extraIds = created.extraIds.filter((id) => id !== deactivateBlocker.id);
    await lenderRegistryRepository.setProgramStatus(current.id, "inactive", "reuse-proof");
    const deactivated = await lenderRegistryRepository.findProgramById(current.id);
    assert.equal(deactivated?.publicationState, "draft");
    assert.equal(deactivated?.isLivePublished, false);

    console.log("programme reuse proof passed");
  } finally {
    if (created.dealId) await prisma.enterpriseDeal.deleteMany({ where: { id: created.dealId } });
    const programIds = [
      created.currentId,
      created.retiredId,
      created.pendingId,
      created.duplicateId,
      ...created.extraIds,
    ].filter(Boolean);
    if (programIds.length) {
      await prisma.enterpriseLenderProgramAuditEvent.deleteMany({ where: { programId: { in: programIds } } });
      await prisma.enterpriseLenderProgram.deleteMany({ where: { id: { in: programIds } } });
    }
    if (created.lenderId) await prisma.enterpriseLender.deleteMany({ where: { id: created.lenderId } });
    if (created.categoryId) await prisma.enterpriseLenderCategory.deleteMany({ where: { id: created.categoryId } });
    if (created.orgId) await prisma.organization.deleteMany({ where: { id: created.orgId } });
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.stack ?? error.message : "programme reuse proof failed");
  process.exit(1);
});
