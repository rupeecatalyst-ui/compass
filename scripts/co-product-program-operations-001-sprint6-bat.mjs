import { mkdtempSync, rmSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { IsolatedProgrammeDurableStore } from "../src/lib/product-programme-operations/isolated-durable-store.ts";
import { PROGRAMME_BAT_FIXTURES } from "../src/lib/product-programme-operations/fixtures.ts";
import { deriveEmploymentFamily } from "../src/lib/product-programme-operations/employment.ts";
import { evaluateProgrammeCompleteness } from "../src/lib/product-programme-operations/completeness.ts";
import { matchPublishedProgramme } from "../src/lib/product-programme-operations/match-published.ts";
import { mergeEdieAndProgrammeLod } from "../src/lib/product-programme-operations/lod-merge.ts";
import { citePublishedProgramme } from "../src/lib/product-programme-operations/proposal-citation.ts";
import {
  stampDealProgrammeSelection,
  readDealProgrammeStamp,
  preserveExistingProgrammeStamp,
} from "../src/lib/product-programme-operations/deal-stamp.ts";
import { recommendPublishedLendersFromOptions } from "../src/lib/enterprise-lender-registry/recommend-from-registry.ts";
import { isPublishedCommercialProgram } from "../src/lib/enterprise-lender-registry/program-architecture.ts";
import { recommendOpportunityFromPublishedProgramme, resetOpportunityCompassRecommendations } from "../src/lib/enterprise-opportunity-compass/compass-engine.ts";
import { ENTERPRISE_MARKETING_EXECUTION_ENABLED } from "../src/constants/enterprise-marketing-engine/safety.ts";
import { PROGRAMME_EMPLOYMENT_TYPES, PROGRAMME_LEGAL_CONSTITUTIONS } from "../src/constants/product-programme-operations/controlled-masters.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const results = [];

function record(id, ok, detail) {
  results.push({ id, ok, detail });
  if (!ok) throw new Error(`${id} FAIL: ${detail}`);
}

function toProgram(row) {
  return {
    ...row,
    enabled: row.enabled !== false,
    isDeleted: Boolean(row.isDeleted),
    eligibleStates: row.geographyStates ?? row.eligibleStates ?? [],
  };
}

function lenderOption(id = "fixture-lender-hdfc") {
  return {
    id,
    code: "FIX",
    displayName: "Fixture Housing Finance",
    legalName: "Fixture Housing Finance",
    institutionCategory: "housing_finance_company",
    classification: "housing_finance_company",
    source: "api",
  };
}

function fileShape(overrides = {}) {
  return {
    loanProduct: "HOME_LOAN",
    employmentType: "salaried",
    loanAmount: 2500000,
    approxCibilScore: "750_799",
    city: "Mumbai",
    transactionType: "fresh",
    ...overrides,
  };
}

function cycle(store, payload, org = "org") {
  const created = store.createProgramme({
    organizationId: org,
    actorUserId: "maker",
    actorRole: "ADMIN",
    payload,
  });
  store.submit({ organizationId: org, actorUserId: "maker", actorRole: "ADMIN", programId: created.id });
  store.approve({ organizationId: org, actorUserId: "checker", actorRole: "ADMIN", programId: created.id });
  return store.publishApproved({
    organizationId: org,
    actorUserId: "checker",
    actorRole: "ADMIN",
    programId: created.id,
  });
}

const dir = mkdtempSync(join(tmpdir(), "ppo-s6-"));
const store = new IsolatedProgrammeDurableStore(join(dir, "db.json"));

const draft = store.createProgramme({
  organizationId: "org",
  actorUserId: "maker",
  actorRole: "ADMIN",
  payload: PROGRAMME_BAT_FIXTURES.homeLoanSalaried(),
});
record("BAT-01", draft.publicationState === "draft", draft.publicationState);

record(
  "BAT-02",
  PROGRAMME_EMPLOYMENT_TYPES.some((item) => item.id === "salaried") &&
    deriveEmploymentFamily(["salaried", "self-employed-business"]) === "both",
  "controlled employment + derived Both",
);

record(
  "BAT-03",
  PROGRAMME_LEGAL_CONSTITUTIONS.some((item) => item.id === "private_limited") &&
    !PROGRAMME_LEGAL_CONSTITUTIONS.some((item) => item.id === "nri"),
  "constitution separate from NRI residency",
);

const reloaded = store.reload();
const roundTrip = reloaded.programmes.find((row) => row.id === draft.id);
record(
  "BAT-04",
  roundTrip?.minRoiExact === "8.400000" &&
    roundTrip.employmentTypes.includes("salaried") &&
    roundTrip.legalConstitutions.includes("individual") &&
    roundTrip.policyVersionId === "fixture-policy-v1",
  "commercial fields survived process reload",
);

const incomplete = store.createProgramme({
  organizationId: "org",
  actorUserId: "maker",
  actorRole: "ADMIN",
  payload: PROGRAMME_BAT_FIXTURES.incompleteDraft(),
});
let publishIncompleteBlocked = false;
try {
  store.publishApproved({
    organizationId: "org",
    actorUserId: "maker",
    actorRole: "ADMIN",
    programId: incomplete.id,
  });
} catch {
  publishIncompleteBlocked = true;
}
record("BAT-05", publishIncompleteBlocked && !evaluateProgrammeCompleteness(PROGRAMME_BAT_FIXTURES.incompleteDraft()).complete, "incomplete cannot publish");

store.submit({ organizationId: "org", actorUserId: "maker", actorRole: "ADMIN", programId: draft.id });
record("BAT-06", store.getProgramme(draft.id)?.publicationState === "pending_approval", "complete programme submitted");

let selfApproveBlocked = false;
try {
  store.approve({ organizationId: "org", actorUserId: "maker", actorRole: "ADMIN", programId: draft.id });
} catch {
  selfApproveBlocked = true;
}
record("BAT-07", selfApproveBlocked, "creator cannot self-approve");

store.approve({ organizationId: "org", actorUserId: "checker", actorRole: "ADMIN", programId: draft.id });
const published = toProgram(
  store.publishApproved({ organizationId: "org", actorUserId: "checker", actorRole: "ADMIN", programId: draft.id }),
);
record("BAT-08", published.isLivePublished && published.publicationState === "published", published.publicationState);
record("BAT-09", published.lenderId === "fixture-lender-hdfc", published.lenderId);
record(
  "BAT-10",
  Boolean(published.policyVersionId) && (published.requiredDocumentTypeIds ?? []).length > 0,
  "policy and documents present",
);

const revision = store.updateProgramme({
  organizationId: "org",
  actorUserId: "maker",
  actorRole: "ADMIN",
  programId: published.id,
  createDraftRevision: true,
  payload: PROGRAMME_BAT_FIXTURES.homeLoanSalaried({ minRoiExact: "8.250000", maxRoiExact: "8.900000" }),
});
const liveAfterEdit = store.getProgramme(published.id);
record("BAT-11", revision.publicationState === "draft" && revision.versionNumber === published.versionNumber + 1, `draft v${revision.versionNumber}`);
record("BAT-12", liveAfterEdit?.isLivePublished === true && liveAfterEdit.minRoiExact === "8.400000", "published stayed live");

store.submit({ organizationId: "org", actorUserId: "maker", actorRole: "ADMIN", programId: revision.id });
store.approve({ organizationId: "org", actorUserId: "checker", actorRole: "ADMIN", programId: revision.id });
const republished = toProgram(
  store.publishApproved({ organizationId: "org", actorUserId: "checker", actorRole: "ADMIN", programId: revision.id }),
);
const previous = store.getProgramme(published.id);
record("BAT-13", republished.isLivePublished && republished.minRoiExact === "8.250000", republished.minRoiExact);
record("BAT-14", previous?.publicationState === "superseded" && store.listLineage(published.lineageId).length === 2, previous?.publicationState);

store.deactivate({ organizationId: "org", actorUserId: "checker", actorRole: "ADMIN", programId: republished.id });
const deactivated = toProgram(store.getProgramme(republished.id));
record("BAT-15", !matchPublishedProgramme(deactivated, { productCode: "HOME_LOAN" }).matched, "deactivated excluded");

const active = toProgram(
  cycle(store, PROGRAMME_BAT_FIXTURES.homeLoanSalaried({ code: "FIX-HL-SAL-2", label: "Salaried 2" })),
);
const ranked = recommendPublishedLendersFromOptions([lenderOption()], {
  file: fileShape(),
  programmes: [active],
});
record("BAT-16", ranked[0]?.programmeId === active.id && ranked[0]?.score === 88, ranked[0]?.reason ?? "no rank");
resetOpportunityCompassRecommendations();
const compass = recommendOpportunityFromPublishedProgramme({ contextRef: "opp-bat", program: active });
record("BAT-17", Boolean(compass?.message.includes(active.code)), compass?.message ?? "missing");
record("BAT-18", matchPublishedProgramme(active, { productCode: "HL_STD", employmentType: "salaried", cibil: 740 }).matched, "alias matching");

const lod = mergeEdieAndProgrammeLod({
  edieTypeRefs: ["doc:identity:aadhaar"],
  program: active,
});
record(
  "BAT-19",
  lod.some((item) => item.source === "edie") && lod.some((item) => item.source === "programme_overlay"),
  lod.map((item) => item.source).join(","),
);

const citation = citePublishedProgramme(active);
record("BAT-20", citation.programmeVersion === active.versionNumber && Boolean(citation.roiRange), JSON.stringify(citation));

const stamp = readDealProgrammeStamp(stampDealProgrammeSelection({ snapshot: {}, program: active }));
const later = { ...active, id: "newer-version", versionNumber: active.versionNumber + 1 };
const preserved = preserveExistingProgrammeStamp(
  stamp,
  readDealProgrammeStamp(stampDealProgrammeSelection({ snapshot: {}, program: later })),
);
record("BAT-21", stamp?.programmeId === active.id && preserved.programmeId === active.id, preserved.programmeId);

let tenantBlocked = false;
try {
  store.updateProgramme({
    organizationId: "other-org",
    actorUserId: "maker",
    actorRole: "ADMIN",
    programId: active.id,
    payload: PROGRAMME_BAT_FIXTURES.homeLoanSalaried(),
  });
} catch {
  tenantBlocked = true;
}
record("BAT-22", tenantBlocked, "cross-tenant blocked");

let ordinaryBlocked = false;
try {
  store.updateProgramme({
    organizationId: "org",
    actorUserId: "rm",
    actorRole: "RELATIONSHIP_MANAGER",
    programId: active.id,
    payload: PROGRAMME_BAT_FIXTURES.homeLoanSalaried(),
  });
} catch {
  ordinaryBlocked = true;
}
record("BAT-23", ordinaryBlocked, "ordinary user blocked");

const stub = store.createProgramme({
  organizationId: "org",
  actorUserId: "maker",
  actorRole: "ADMIN",
  payload: PROGRAMME_BAT_FIXTURES.incompleteDraft(),
});
record("BAT-24", !matchPublishedProgramme(toProgram(stub), { productCode: "HOME_LOAN" }).matched, stub.publicationState);

const heuristic = recommendPublishedLendersFromOptions([lenderOption()], { file: fileShape(), programmes: [] });
record("BAT-25", heuristic.length === 0, `count=${heuristic.length}`);

const recSrc = readFileSync(join(root, "src/lib/enterprise-lender-registry/recommend-from-registry.ts"), "utf8");
record("BAT-26", !/institutionCategory === "nbfc"|Bank\/HFC\/NBFC/.test(recSrc), "no category heuristic");

record("BAT-27", ENTERPRISE_MARKETING_EXECUTION_ENABLED === false, String(ENTERPRISE_MARKETING_EXECUTION_ENABLED));

const emailHits = ["nodemailer", "sendgrid", "ses.sendEmail", "transporter.sendMail"].filter((needle) =>
  recSrc.includes(needle),
);
record("BAT-28", emailHits.length === 0, emailHits.join(",") || "no email senders in ranker");

const se = cycle(store, PROGRAMME_BAT_FIXTURES.homeLoanSelfEmployed());
const bt = cycle(store, PROGRAMME_BAT_FIXTURES.homeLoanBalanceTransfer());
const both = cycle(store, PROGRAMME_BAT_FIXTURES.multiEmployment());
record("FIXTURE-SE", se.employmentTypes.includes("self-employed-professional"), se.code);
record("FIXTURE-BT", bt.productCode === "HOME_LOAN_BT" && bt.transactionTypes.includes("balance_transfer"), bt.code);
record("FIXTURE-BOTH", deriveEmploymentFamily(both.employmentTypes) === "both", both.employmentTypes.join(","));

const {
  LEGACY_PROGRAMME_REVIEW_LABEL,
  isLegacyProgrammeReviewRequired,
  isRegistryVisibleProgramme,
  mustCreateDraftRevision,
} = await import("../src/lib/product-programme-operations/legacy-review.ts");
const { programmeStatusLabel } = await import("../src/lib/product-programme-operations/registry-filters.ts");
const { buildChanakyaProgrammeEvidence } = await import("../src/lib/product-programme-operations/chanakya-evidence.ts");

const legacy = {
  ...active,
  isLivePublished: false,
  publicationState: "published",
  completenessState: "incomplete",
  status: "active",
  lifecycleStatus: "active",
  enabled: true,
  isDeleted: false,
};
record("BAT-LEGACY-01", isLegacyProgrammeReviewRequired(legacy) === true, "legacy detector");
record("BAT-LEGACY-02", isRegistryVisibleProgramme(legacy) === true && !isPublishedCommercialProgram(legacy), "visible not live");
record("BAT-LEGACY-03", programmeStatusLabel(legacy) === LEGACY_PROGRAMME_REVIEW_LABEL, programmeStatusLabel(legacy));
record("BAT-LEGACY-04", mustCreateDraftRevision(legacy) === true, "draft revision required");
resetOpportunityCompassRecommendations();
record(
  "BAT-LEGACY-05",
  recommendOpportunityFromPublishedProgramme({ contextRef: "opp-legacy", program: legacy }) === null,
  "compass excludes legacy",
);
const legacyLod = mergeEdieAndProgrammeLod({
  edieTypeRefs: ["doc:identity:aadhaar"],
  program: legacy,
});
record("BAT-LEGACY-06", !legacyLod.some((item) => item.source === "programme_overlay"), "lod overlay skipped");
let citationBlocked = false;
try {
  citePublishedProgramme(legacy);
} catch {
  citationBlocked = true;
}
record("BAT-LEGACY-07", citationBlocked, "citation blocked");
const stamped = stampDealProgrammeSelection({
  snapshot: { publishedProgrammeStamp: { programmeId: "existing-stamp", programmeVersion: 1 } },
  program: legacy,
});
record(
  "BAT-LEGACY-08",
  stamped.publishedProgrammeStamp?.programmeId === "existing-stamp",
  "existing deal stamp preserved",
);
const rankedLegacy = recommendPublishedLendersFromOptions([lenderOption()], {
  file: fileShape(),
  programmes: [legacy],
});
record("BAT-LEGACY-09", rankedLegacy.length === 0, `count=${rankedLegacy.length}`);
const evidence = buildChanakyaProgrammeEvidence(legacy);
record(
  "BAT-LEGACY-10",
  evidence.available === false && evidence.reason.includes(LEGACY_PROGRAMME_REVIEW_LABEL),
  evidence.reason,
);
record("BAT-LEGACY-11", ENTERPRISE_MARKETING_EXECUTION_ENABLED === false, "marketing remains disabled");

rmSync(dir, { recursive: true, force: true });
console.log(JSON.stringify({ ok: true, passed: results.length, results }, null, 2));
process.exit(0);
