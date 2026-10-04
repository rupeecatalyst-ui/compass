import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { IsolatedProgrammeDurableStore } from "../src/lib/product-programme-operations/isolated-durable-store.ts";
import { parseStructuredProgrammePayload } from "../src/lib/product-programme-operations/request-schema.ts";
import { matchPublishedProgramme } from "../src/lib/product-programme-operations/match-published.ts";
import { mergeEdieAndProgrammeLod } from "../src/lib/product-programme-operations/lod-merge.ts";
import { citePublishedProgramme } from "../src/lib/product-programme-operations/proposal-citation.ts";
import {
  stampDealProgrammeSelection,
  readDealProgrammeStamp,
  preserveExistingProgrammeStamp,
} from "../src/lib/product-programme-operations/deal-stamp.ts";
import { recommendPublishedLendersFromOptions } from "../src/lib/enterprise-lender-registry/recommend-from-registry.ts";
import { buildChanakyaProgrammeEvidence } from "../src/lib/product-programme-operations/chanakya-evidence.ts";
import { recommendOpportunityFromPublishedProgramme, resetOpportunityCompassRecommendations } from "../src/lib/enterprise-opportunity-compass/compass-engine.ts";
import { ENTERPRISE_MARKETING_EXECUTION_ENABLED } from "../src/constants/enterprise-marketing-engine/safety.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function payload(overrides = {}) {
  return parseStructuredProgrammePayload({
    lenderId: "lender-1",
    productCode: "HOME_LOAN",
    code: "HL-OPS-001",
    label: "Home Loan fixture",
    employmentTypes: ["salaried"],
    legalConstitutions: ["individual"],
    residencyEligibility: ["resident"],
    propertyTypes: ["ready"],
    transactionTypes: ["fresh"],
    geographyStates: ["MH"],
    minLoanAmountExact: "500000.00",
    maxLoanAmountExact: "20000000.00",
    minRoiExact: "8.400000",
    maxRoiExact: "9.150000",
    rateType: "floating",
    benchmarkCode: "repo",
    minCibil: 700,
    minAge: 21,
    maxAge: 65,
    minTenureMonths: 12,
    maxTenureMonths: 360,
    policyVersionId: "policy-v1",
    requiredDocumentTypeIds: ["doc:identity:pan"],
    incomeAssessmentMethods: ["salary"],
    minIncomeExact: "25000.00",
    minLtvExact: "10.00",
    maxLtvExact: "80.00",
    minFoirExact: "40.00",
    maxFoirExact: "55.00",
    minDbrExact: "40.00",
    maxDbrExact: "55.00",
    effectiveFrom: "2026-01-01T00:00:00.000Z",
    reviewAt: "2027-01-01T00:00:00.000Z",
    ...overrides,
  });
}

function toProgram(row) {
  return {
    ...row,
    enabled: row.enabled !== false,
    isDeleted: false,
    isLivePublished: row.isLivePublished,
    publicationState: row.publicationState,
    completenessState: row.completenessState,
    eligibleStates: row.geographyStates,
  };
}

const dir = mkdtempSync(join(tmpdir(), "ppo-s5-"));
const store = new IsolatedProgrammeDurableStore(join(dir, "db.json"));
const created = store.createProgramme({
  organizationId: "org",
  actorUserId: "maker",
  actorRole: "ADMIN",
  payload: payload(),
});
store.submit({ organizationId: "org", actorUserId: "maker", actorRole: "ADMIN", programId: created.id });
store.approve({ organizationId: "org", actorUserId: "checker", actorRole: "ADMIN", programId: created.id });
const published = toProgram(
  store.publishApproved({ organizationId: "org", actorUserId: "checker", actorRole: "ADMIN", programId: created.id }),
);

const matchOk = matchPublishedProgramme(published, {
  productCode: "HL_STD",
  employmentType: "salaried",
  constitution: "individual",
  loanAmountExact: "2500000.00",
  cibil: 750,
});
if (!matchOk.matched) throw new Error(matchOk.reason);

const matchFail = matchPublishedProgramme(published, { employmentType: "self-employed-business" });
if (matchFail.matched) throw new Error("Self-employed should not match salaried programme");

const lod = mergeEdieAndProgrammeLod({
  edieTypeRefs: ["doc:identity:aadhaar"],
  program: { requiredDocumentTypeIds: ["doc:identity:pan"] },
});
if (!lod.some((item) => item.typeRef === "doc:identity:pan" && item.source === "programme_overlay")) {
  throw new Error("Programme LOD overlay missing");
}
if (!lod.some((item) => item.typeRef === "doc:identity:aadhaar" && item.source === "edie")) {
  throw new Error("EDIE baseline discarded");
}

const citation = citePublishedProgramme(published);
if (!citation.programmeVersion || !citation.roiRange) throw new Error("Proposal citation incomplete");

const file = {
  loanProduct: "HOME_LOAN",
  employmentType: "salaried",
  loanAmount: 2500000,
  approxCibilScore: "750_799",
  city: "Mumbai",
  transactionType: "fresh",
};
const none = recommendPublishedLendersFromOptions(
  [{ id: "lender-1", code: "L1", displayName: "Fixture Bank", legalName: "Fixture Bank", institutionCategory: "private_sector_bank", classification: "private_sector_bank", source: "api" }],
  { file, programmes: [] },
);
if (none.length !== 0) throw new Error("Heuristic recommendation leaked without programmes");

const ranked = recommendPublishedLendersFromOptions(
  [{ id: "lender-1", code: "L1", displayName: "Fixture Bank", legalName: "Fixture Bank", institutionCategory: "private_sector_bank", classification: "private_sector_bank", source: "api" }],
  { file, programmes: [published] },
);
if (ranked.length !== 1 || ranked[0].score !== 88 || ranked[0].programmeId !== published.id) {
  throw new Error(`Ranker did not use published programme: ${JSON.stringify(ranked)}`);
}

const snapshot = stampDealProgrammeSelection({ snapshot: { existing: true }, program: published });
const stamp = readDealProgrammeStamp(snapshot);
if (!stamp || stamp.programmeId !== published.id) throw new Error("Deal stamp missing");
const later = { ...published, id: "newer", versionNumber: published.versionNumber + 1 };
const laterStamp = readDealProgrammeStamp(stampDealProgrammeSelection({ snapshot: {}, program: later }));
const preserved = preserveExistingProgrammeStamp(stamp, laterStamp);
if (preserved.programmeId !== published.id) throw new Error("Existing deal silently retargeted");

store.deactivate({ organizationId: "org", actorUserId: "checker", actorRole: "ADMIN", programId: published.id });
const deactivated = toProgram(store.getProgramme(published.id));
const afterDeactivate = matchPublishedProgramme(deactivated, { productCode: "HOME_LOAN" });
if (afterDeactivate.matched) throw new Error("Deactivated programme still matches recommendations");

const evidence = buildChanakyaProgrammeEvidence(published);
if (!evidence.available) throw new Error("CHANAKYA evidence should be available for published programme");
resetOpportunityCompassRecommendations();
const compass = recommendOpportunityFromPublishedProgramme({ contextRef: "opp-1", program: published });
if (!compass?.message.includes(`v${published.versionNumber}`)) throw new Error("Compass did not cite programme version");

if (ENTERPRISE_MARKETING_EXECUTION_ENABLED !== false) throw new Error("Marketing execution must remain false");
const safety = readFileSync(join(root, "src/constants/enterprise-marketing-engine/safety.ts"), "utf8");
if (!safety.includes("EXECUTION_ENABLED = false")) throw new Error("Marketing safety gate missing");

rmSync(dir, { recursive: true, force: true });
console.log(
  JSON.stringify({
    ok: true,
    match: matchOk.reason,
    lodSources: lod.map((item) => item.source),
    citation,
    rank: ranked[0],
    dealStampPreserved: preserved.programmeId,
    deactivated: afterDeactivate.reason,
    marketingExecution: ENTERPRISE_MARKETING_EXECUTION_ENABLED,
  }),
);
process.exit(0);
