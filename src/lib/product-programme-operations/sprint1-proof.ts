import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { IsolatedProgrammeDurableStore } from "@/lib/product-programme-operations/isolated-durable-store";
import { parseStructuredProgrammePayload } from "@/lib/product-programme-operations/request-schema";
import { deriveEmploymentFamily } from "@/lib/product-programme-operations/employment";
import { parseExactPercent } from "@/lib/product-programme-operations/money";
import { ProgrammeConflictError, ProgrammePermissionError } from "@/types/product-programme-operations";

function samplePayload(overrides: Record<string, unknown> = {}) {
  return {
    lenderId: "lender-hdfc-fixture",
    productId: "product-home-loan",
    productCode: "HOME_LOAN",
    productVariantCode: "HOME_LOAN_SALARIED",
    code: "HL-SAL-001",
    label: "Home Loan Salaried Fixture",
    description: "Local BAT fixture. Not a live bank rate sheet.",
    applicantTypes: ["primary_applicant"],
    employmentTypes: ["salaried"],
    legalConstitutions: ["individual"],
    residencyEligibility: ["resident"],
    customerSegments: ["salaried"],
    propertyTypes: ["ready"],
    transactionTypes: ["fresh"],
    geographyStates: ["MH"],
    geographyCities: ["mumbai"],
    minCibil: 700,
    maxCibil: 900,
    minAge: 21,
    maxAge: 65,
    incomeAssessmentMethods: ["salary"],
    minTenureMonths: 60,
    maxTenureMonths: 360,
    minLoanAmountExact: "500000.00",
    maxLoanAmountExact: "25000000.00",
    minIncomeExact: "25000.00",
    maxIncomeExact: "2000000.00",
    processingFeeAmountExact: "5000.00",
    minRoiExact: "8.500000",
    maxRoiExact: "10.250000",
    processingFeePctExact: "0.500000",
    minLtvExact: "50.000000",
    maxLtvExact: "80.000000",
    minFoirExact: "40.000000",
    maxFoirExact: "55.000000",
    minDbrExact: "40.000000",
    maxDbrExact: "55.000000",
    spreadExact: "2.750000",
    rateType: "floating",
    benchmarkCode: "repo",
    processingFeeLabel: "Standard processing fee",
    concessions: [],
    deviationCategories: ["income"],
    policyVersionId: "policy-version-1",
    creditRiskPolicyRef: "policy-version-1",
    requiredDocumentTypeIds: ["PAN", "AADHAAR", "SALARY_SLIP"],
    requiredDocuments: [{ typeRef: "PAN", mandatory: true, active: true, applicability: "all" }],
    averageTatDays: 12,
    effectiveFrom: "2026-09-01T00:00:00.000Z",
    reviewAt: "2027-09-01T00:00:00.000Z",
    effectiveUntil: "2027-12-31T00:00:00.000Z",
    notes: "Fixture notes",
    remarks: null,
    ...overrides,
  };
}

export function runSprint1ProgrammeProof() {
  const dir = mkdtempSync(join(tmpdir(), "ppo-s1-"));
  const storePath = join(dir, "durable.json");
  const store = new IsolatedProgrammeDurableStore(storePath);
  const results: Record<string, string> = {};

  try {
    const parsed = parseStructuredProgrammePayload(samplePayload());
    if (parsed.minRoiExact !== "8.500000") throw new Error("ROI exact decimal did not round-trip.");
    if (parsed.employmentTypes.includes("salaried") === false) throw new Error("Employment missing.");
    if (parsed.legalConstitutions[0] !== "individual") throw new Error("Constitution missing.");
    if (deriveEmploymentFamily(["salaried", "self-employed-business"]) !== "both") {
      throw new Error("Both must be derived, not stored.");
    }
    results.parse = "PASS";

    let rejectedFloat = false;
    try {
      parseExactPercent(8.5, "minRoiExact");
    } catch {
      rejectedFloat = true;
    }
    if (!rejectedFloat) throw new Error("JavaScript float ROI was accepted.");
    results.noFloatMoney = "PASS";

    let rejectedUnknown = false;
    try {
      parseStructuredProgrammePayload({ ...samplePayload(), mysteryField: true });
    } catch {
      rejectedUnknown = true;
    }
    if (!rejectedUnknown) throw new Error("Unknown field was accepted.");
    results.unknownField = "PASS";

    const created = store.createProgramme({
      organizationId: "org-a",
      actorUserId: "admin-1",
      actorRole: "ADMIN",
      payload: parsed,
    });
    if (created.minRoiExact !== "8.500000") throw new Error("POST persist lost ROI.");
    if (created.employmentTypes[0] !== "salaried") throw new Error("POST persist lost employment.");
    if (created.legalConstitutions[0] !== "individual") throw new Error("POST persist lost constitution.");
    results.postRoundTrip = "PASS";

    const patched = store.updateProgramme({
      organizationId: "org-a",
      actorUserId: "admin-1",
      actorRole: "ADMIN",
      programId: created.id,
      payload: parseStructuredProgrammePayload(samplePayload({ maxRoiExact: "10.750000" })),
      expectedLockVersion: created.lockVersion,
    });
    if (patched.maxRoiExact !== "10.750000") throw new Error("PATCH persist lost ROI.");
    results.patchRoundTrip = "PASS";

    const policy = store.createPublishedPolicy({
      organizationId: "org-a",
      actorUserId: "admin-1",
      name: "Fixture HL salaried policy",
      policyCode: "POL-HL-SAL-001",
      productCode: "HOME_LOAN",
    });
    store.reload();
    const reloadedPolicy = store.getPolicy(policy.id);
    if (!reloadedPolicy || reloadedPolicy.policyCode !== "POL-HL-SAL-001") {
      throw new Error("Durable policy did not survive reload.");
    }
    results.policyRestart = "PASS";

    patched.publicationState = "published";
    patched.isLivePublished = true;
    patched.approvalStatus = "approved";
    const bagPath = storePath;
    const bag = JSON.parse(readFileSync(bagPath, "utf8"));
    const live = bag.programmes.find((row: { id: string }) => row.id === patched.id);
    live.publicationState = "published";
    live.isLivePublished = true;
    live.approvalStatus = "approved";
    const { writeFileSync } = require("node:fs") as typeof import("node:fs");
    writeFileSync(bagPath, JSON.stringify(bag, null, 2));

    const liveStore = new IsolatedProgrammeDurableStore(storePath);
    const published = liveStore.getProgramme(patched.id);
    if (!published) throw new Error("Published row missing.");
    let overwriteBlocked = false;
    try {
      liveStore.updateProgramme({
        organizationId: "org-a",
        actorUserId: "admin-1",
        actorRole: "ADMIN",
        programId: published.id,
        payload: parsed,
        createDraftRevision: false,
      });
    } catch (err) {
      overwriteBlocked = err instanceof ProgrammeConflictError;
    }
    if (!overwriteBlocked) throw new Error("Published programme was overwritten.");
    const draft = liveStore.updateProgramme({
      organizationId: "org-a",
      actorUserId: "admin-1",
      actorRole: "ADMIN",
      programId: published.id,
      payload: parseStructuredProgrammePayload(samplePayload({ notes: "revision" })),
      createDraftRevision: true,
    });
    const stillLive = liveStore.getProgramme(published.id);
    if (!stillLive?.isLivePublished) throw new Error("Published version did not remain live.");
    if (draft.versionNumber !== stillLive.versionNumber + 1) throw new Error("Draft version lineage is wrong.");
    results.publishedNotOverwritten = "PASS";

    let tenantBlocked = false;
    try {
      liveStore.updateProgramme({
        organizationId: "org-b",
        actorUserId: "admin-2",
        actorRole: "ADMIN",
        programId: published.id,
        payload: parsed,
      });
    } catch (err) {
      tenantBlocked = err instanceof ProgrammePermissionError && err.code === "TENANT_FORBIDDEN";
    }
    if (!tenantBlocked) throw new Error("Cross-tenant mutation succeeded.");
    results.crossTenant = "PASS";

    let ordinaryBlocked = false;
    try {
      liveStore.updateProgramme({
        organizationId: "org-a",
        actorUserId: "viewer-1",
        actorRole: "VIEWER",
        programId: published.id,
        payload: parsed,
        createDraftRevision: true,
      });
    } catch (err) {
      ordinaryBlocked = err instanceof ProgrammePermissionError;
    }
    if (!ordinaryBlocked) throw new Error("Ordinary user mutation succeeded.");
    results.ordinaryUser = "PASS";

    const audits = liveStore.listAudits(draft.id);
    const lineage = liveStore.listLineage(published.lineageId);
    if (audits.length < 1) throw new Error("Audit events missing.");
    if (lineage.length < 2) throw new Error("Version history missing.");
    results.auditHistory = "PASS";

    liveStore.createProgramme({
      organizationId: "org-a",
      actorUserId: "admin-1",
      actorRole: "ADMIN",
      payload: parseStructuredProgrammePayload(samplePayload({
        code: "STUB-ACTIVE",
        label: "Incomplete stub",
        policyVersionId: null,
        creditRiskPolicyRef: null,
        requiredDocumentTypeIds: [],
        requiredDocuments: [],
        minRoiExact: null,
        maxRoiExact: null,
      })),
    });
    const stubBag = JSON.parse(readFileSync(storePath, "utf8"));
    stubBag.programmes.find((row: { code: string }) => row.code === "STUB-ACTIVE").publicationState = "published";
    stubBag.programmes.find((row: { code: string }) => row.code === "STUB-ACTIVE").isLivePublished = true;
    writeFileSync(storePath, JSON.stringify(stubBag, null, 2));
    const classified = new IsolatedProgrammeDurableStore(storePath).classifyExistingStubs();
    if (classified < 1) throw new Error("Incomplete stub was not demoted.");
    results.existingRecordsClassified = "PASS";

    return { ok: true, results, storePath };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
