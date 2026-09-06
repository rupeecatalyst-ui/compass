import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { IsolatedProgrammeDurableStore } from "../src/lib/product-programme-operations/isolated-durable-store.ts";
import { parseStructuredProgrammePayload } from "../src/lib/product-programme-operations/request-schema.ts";
import { canonicalizeProductCode, productCodesEquivalent } from "../src/lib/product-programme-operations/product-aliases.ts";
import {
  dedupePublishedProgrammes,
  filterProgrammeRegistry,
  draftRevisionFor,
  lineageVersions,
} from "../src/lib/product-programme-operations/registry-filters.ts";

function payload(overrides = {}) {
  return parseStructuredProgrammePayload({
    lenderId: "lender-hdfc-fixture",
    productCode: "HOME_LOAN",
    code: "HL-SAL-001",
    label: "Home Loan Salaried Fixture",
    employmentTypes: ["salaried"],
    legalConstitutions: ["individual"],
    residencyEligibility: ["resident"],
    propertyTypes: ["ready"],
    transactionTypes: ["fresh"],
    geographyStates: ["MH"],
    minLoanAmountExact: "500000.00",
    maxLoanAmountExact: "25000000.00",
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

function publish(store, id, org = "org") {
  store.submit({ organizationId: org, actorUserId: "maker", actorRole: "ADMIN", programId: id });
  store.approve({ organizationId: org, actorUserId: "checker", actorRole: "ADMIN", programId: id });
  return store.publishApproved({ organizationId: org, actorUserId: "checker", actorRole: "ADMIN", programId: id });
}

const dir = mkdtempSync(join(tmpdir(), "ppo-s4-"));
const store = new IsolatedProgrammeDurableStore(join(dir, "db.json"));

if (!productCodesEquivalent("HL_STD", "HOME_LOAN")) throw new Error("HL_STD alias failed");
if (!productCodesEquivalent("HOME-LOAN", "HOME_LOAN")) throw new Error("HOME-LOAN alias failed");
if (!productCodesEquivalent("HOME_LOAN", "home_loan")) throw new Error("home_loan alias failed");
if (!productCodesEquivalent("LAP_STD", "LAP")) throw new Error("LAP_STD alias failed");
if (canonicalizeProductCode("HL_STD") !== "HOME_LOAN") throw new Error("canonical HL_STD");

const created = store.createProgramme({
  organizationId: "org",
  actorUserId: "maker",
  actorRole: "ADMIN",
  payload: payload(),
});
const published = publish(store, created.id);
const liveId = published.id;

const draft = store.updateProgramme({
  organizationId: "org",
  actorUserId: "maker",
  actorRole: "ADMIN",
  programId: liveId,
  createDraftRevision: true,
  payload: payload({ minRoiExact: "8.250000", maxRoiExact: "8.900000", code: "HL-SAL-001" }),
});

const stillLive = store.getProgramme(liveId);
if (!stillLive?.isLivePublished) throw new Error("Published version was overwritten");
if (draft.isLivePublished) throw new Error("Draft revision became live");
if (draft.versionNumber !== stillLive.versionNumber + 1) throw new Error("Draft version number incorrect");

const aliasTwin = {
  ...stillLive,
  id: "alias-twin",
  productCode: "HL_STD",
  lineageId: stillLive.lineageId,
};
const deduped = dedupePublishedProgrammes([stillLive, aliasTwin]);
if (deduped.length !== 1) throw new Error(`Alias duplicate not collapsed: ${deduped.length}`);

const expired = {
  ...stillLive,
  id: "expired",
  lineageId: "expired-lineage",
  effectiveUntil: "2020-01-01T00:00:00.000Z",
};
const filteredExpired = filterProgrammeRegistry([expired, stillLive], {
  search: "",
  productCode: "HL_STD",
  employmentType: "salaried",
  constitution: "all",
  status: "all",
  effectiveWindow: "expired",
});
if (filteredExpired.length !== 1 || filteredExpired[0].id !== "expired") {
  throw new Error("Expired filter failed");
}

const history = lineageVersions([stillLive, draft], stillLive.lineageId);
if (history.length < 2) throw new Error("Version history missing");
if (!draftRevisionFor([stillLive, draft], stillLive)) throw new Error("Draft revision indicator missing");

rmSync(dir, { recursive: true, force: true });
console.log(
  JSON.stringify({
    ok: true,
    aliases: ["HL_STD", "HOME-LOAN", "HOME_LOAN", "LAP_STD"],
    publishedStayedLive: stillLive.id,
    draftRevisionId: draft.id,
    publishedVersion: stillLive.versionNumber,
    draftVersion: draft.versionNumber,
  }),
);
process.exit(0);
