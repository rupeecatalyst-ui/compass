import { IsolatedProgrammeDurableStore } from "../src/lib/product-programme-operations/isolated-durable-store.ts";
import { parseStructuredProgrammePayload } from "../src/lib/product-programme-operations/request-schema.ts";
import { resolveProgrammePolicySurface } from "../src/lib/product-programme-operations/policy-surface.ts";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const matrix = readFileSync(join(root, "src/app/api/admin/product-lender-matrix/route.ts"), "utf8");
if (matrix.includes('lifecycleStatus: "active"') && matrix.includes("createProgram")) {
  console.error("Matrix still creates active programmes.");
  process.exit(1);
}

const dir = mkdtempSync(join(tmpdir(), "ppo-s3-"));
const store = new IsolatedProgrammeDurableStore(join(dir, "db.json"));
const payload = parseStructuredProgrammePayload({
  lenderId: "l1",
  productCode: "HOME_LOAN",
  code: "HL-1",
  label: "HL",
  employmentTypes: ["salaried"],
  legalConstitutions: ["individual"],
  residencyEligibility: ["resident"],
  propertyTypes: ["ready"],
  transactionTypes: ["fresh"],
  geographyStates: ["MH"],
  minLoanAmountExact: "1.00",
  maxLoanAmountExact: "2.00",
  minRoiExact: "8.00",
  maxRoiExact: "9.00",
  rateType: "floating",
  benchmarkCode: "repo",
  minCibil: 700,
  minAge: 21,
  maxAge: 65,
  minTenureMonths: 12,
  maxTenureMonths: 240,
  policyVersionId: "pv1",
  requiredDocumentTypeIds: ["doc:pan"],
  incomeAssessmentMethods: ["salary"],
  minIncomeExact: "100.00",
  minLtvExact: "10.00",
  maxLtvExact: "80.00",
  minFoirExact: "40.00",
  maxFoirExact: "50.00",
  minDbrExact: "40.00",
  maxDbrExact: "50.00",
  effectiveFrom: "2026-01-01T00:00:00.000Z",
  reviewAt: "2027-01-01T00:00:00.000Z",
});
const created = store.createProgramme({
  organizationId: "org",
  actorUserId: "maker",
  actorRole: "ADMIN",
  payload,
});
let publishBlocked = false;
try {
  store.publishApproved({ organizationId: "org", actorUserId: "maker", actorRole: "ADMIN", programId: created.id });
} catch {
  publishBlocked = true;
}
store.submit({ organizationId: "org", actorUserId: "maker", actorRole: "ADMIN", programId: created.id });
let selfApproveBlocked = false;
try {
  store.approve({ organizationId: "org", actorUserId: "maker", actorRole: "ADMIN", programId: created.id });
} catch {
  selfApproveBlocked = true;
}
store.approve({ organizationId: "org", actorUserId: "checker", actorRole: "ADMIN", programId: created.id });
const published = store.publishApproved({
  organizationId: "org",
  actorUserId: "checker",
  actorRole: "ADMIN",
  programId: created.id,
});
const policy = resolveProgrammePolicySurface({
  program: {
    policyVersionId: published.policyVersionId,
    creditRiskPolicyRef: published.creditRiskPolicyRef,
    publicationState: published.publicationState,
    effectiveUntil: published.effectiveUntil,
    isLivePublished: published.isLivePublished,
  },
  policyStatus: "published",
  resolved: true,
});
rmSync(dir, { recursive: true, force: true });
if (!publishBlocked || !selfApproveBlocked || !published.isLivePublished || policy.status !== "available_published") {
  console.error({ publishBlocked, selfApproveBlocked, published: published.isLivePublished, policy });
  process.exit(1);
}
console.log(JSON.stringify({ ok: true, publishGate: true, makerChecker: true, policySurface: policy.status }, null, 2));
process.exit(0);
