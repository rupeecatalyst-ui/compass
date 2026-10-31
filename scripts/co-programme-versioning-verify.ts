/**
 * Single-record programme governance checks. No database and no production writes.
 */
import assert from "node:assert/strict";
import { emptyProgrammeEditorState, type ProgrammeEditorState } from "@/lib/product-programme-operations/editor-state";
import {
  parseStructuredProgrammePayload,
  separateProgrammeUpdateControls,
} from "@/lib/product-programme-operations/request-schema";
import { structuredPayloadToUpdateInput } from "@/lib/product-programme-operations/to-registry-input";
import { toProgrammeWritePayload } from "@/lib/product-programme-operations/to-write-payload";
import { rankPublishedProgrammes } from "@/lib/enterprise-lender-registry/published-program-match";
import {
  collectPagedPrograms,
  isPublishedProgramme,
  commitProgrammeCreation,
  commitProgrammeLifecycle,
  planProgrammeCreate,
  presentPolicyChangeHistory,
  programmeAdvisoryLockPair,
  programmeFamilyKey,
  recommendationProgrammeIds,
  resolvePortalProgrammeTarget,
  runProgrammeTransaction,
  selectCurrentProgramme,
  type ProgrammeAuditRecord,
} from "@/lib/enterprise-lender-registry/programme-versioning";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

function programme(
  partial: Partial<EnterpriseLenderProgramRecord> & Pick<EnterpriseLenderProgramRecord, "id">,
): EnterpriseLenderProgramRecord {
  return {
    organizationId: "org",
    lenderId: "bom",
    code: partial.id.toUpperCase(),
    label: partial.id,
    productCode: "HOME_LOAN",
    employmentType: "salaried",
    roiPercent: 7,
    lifecycleStatus: "active",
    status: "active",
    enabled: true,
    isLivePublished: true,
    publicationState: "published",
    completenessState: "complete",
    versionNumber: 1,
    isDeleted: false,
    approvalStatus: "none",
    createdBy: "admin",
    modifiedBy: "admin",
    createdAt: "2026-10-01T00:00:00.000Z",
    updatedAt: "2026-10-01T00:00:00.000Z",
    ...partial,
  };
}

const actor = { actorUserId: "admin-1", actorName: "Admin" };
const deal = { lenderProgramId: "bom", expectedRoi: 7, offerId: "offer-1" };

function step(
  programs: EnterpriseLenderProgramRecord[],
  audit: ProgrammeAuditRecord[],
  programId: string,
  command: Parameters<typeof runProgrammeTransaction>[0]["command"],
  at: string,
  failAudit = false,
) {
  return runProgrammeTransaction({
    programs,
    audit,
    programId,
    command,
    ...actor,
    at,
    failAudit,
  });
}

const published = programme({ id: "bom", roiPercent: 7, versionNumber: 4 });
let state = step([published], [], "bom", { action: "unpublish", expectedVersionNumber: 4 }, "2026-10-27T08:00:00.000Z");
assert.equal(state.error, undefined);
assert.equal(state.programs.length, 1);
assert.equal(state.programs[0]!.id, "bom");
assert.equal(isPublishedProgramme(state.programs[0]!), false);
assert.equal(recommendationProgrammeIds(state.programs).size, 0);

state = step(
  state.programs,
  state.audit,
  "bom",
  { action: "save_draft", expectedVersionNumber: 5, patch: { roiPercent: 7.25 }, reason: "Rate revision" },
  "2026-10-27T08:05:00.000Z",
);
assert.equal(state.error, undefined);
assert.equal(state.programs.length, 1);
assert.equal(state.programs[0]!.roiPercent, 7.25);
assert.equal(recommendationProgrammeIds(state.programs).has("bom"), false);

state = step(
  state.programs,
  state.audit,
  "bom",
  { action: "republish", expectedVersionNumber: 6 },
  "2026-10-27T08:10:00.000Z",
);
assert.equal(state.error, undefined);
assert.equal(state.programs.length, 1);
assert.equal(state.programs[0]!.id, "bom");
assert.equal(state.programs[0]!.code, "BOM");
assert.equal(state.programs[0]!.roiPercent, 7.25);
assert.equal(isPublishedProgramme(state.programs[0]!), true);
assert.deepEqual([...recommendationProgrammeIds(state.programs)], ["bom"]);

const ranked = rankPublishedProgrammes({
  productCode: "HOME_LOAN",
  profile: { employmentType: "salaried", approxCibil: 760, monthlyIncome: 100000, loanAmount: 5000000 },
  candidates: [
    {
      program: state.programs[0]!,
      lenderId: "bom",
      lenderCode: "BOM",
      lenderName: "Bank of Maharashtra",
      priorityRank: 1,
    },
    {
      program: programme({ id: "draft", status: "draft", lifecycleStatus: "draft", enabled: false, roiPercent: 6 }),
      lenderId: "draft-lender",
      lenderCode: "DRAFT",
      lenderName: "Draft Lender",
      priorityRank: 1,
    },
  ],
});
assert.deepEqual(ranked.map((row) => row.programmeId), ["bom"]);
assert.equal(ranked[0]!.interestRateLabel, null);

const cheaperMinimum = programme({
  id: "cheap-min",
  lenderId: "cheap",
  minRoiExact: "6.90",
  maxRoiExact: "8.50",
  roiPercent: 9,
});
const dearerMinimum = programme({
  id: "dear-min",
  lenderId: "dear",
  minRoiExact: "7.40",
  roiPercent: 6,
});
const genericOnly = programme({ id: "generic-only", lenderId: "generic", roiPercent: 5 });
const minimumRank = rankPublishedProgrammes({
  productCode: "HOME_LOAN",
  profile: { employmentType: "salaried", approxCibil: 760, monthlyIncome: 100000, loanAmount: 5000000 },
  candidates: [dearerMinimum, genericOnly, cheaperMinimum].map((program) => ({
    program,
    lenderId: program.lenderId,
    lenderCode: program.lenderId.toUpperCase(),
    lenderName: program.lenderId,
    priorityRank: 2,
  })),
});
assert.deepEqual(minimumRank.map((row) => row.programmeId), ["cheap-min", "dear-min", "generic-only"]);
assert.equal(minimumRank[0]!.interestRateLabel, "Indicative 6.90% – 8.50%");
assert.equal(minimumRank[2]!.interestRateLabel, null);

const salariedHome = programme({ id: "hl-sal", productCode: "HOME_LOAN", employmentType: "salaried", minRoiExact: "7.00" });
const selfEmployedHome = programme({ id: "hl-se", lenderId: "se", productCode: "HOME_LOAN", employmentType: "self employed", minRoiExact: "7.10" });
const salariedTransfer = programme({ id: "bt-sal", lenderId: "bt", productCode: "HOME_LOAN_BT", employmentType: "salaried", minRoiExact: "6.80" });
const mappingProfile = { employmentType: "salaried", approxCibil: 760, monthlyIncome: 100000, loanAmount: 5000000 };
const mappingCandidates = [salariedHome, selfEmployedHome, salariedTransfer].map((program) => ({
  program,
  lenderId: program.lenderId,
  lenderCode: program.lenderId.toUpperCase(),
  lenderName: program.label,
  priorityRank: 3,
}));
assert.deepEqual(
  rankPublishedProgrammes({ productCode: "HOME_LOAN", profile: mappingProfile, candidates: mappingCandidates }).map((row) => row.programmeId),
  ["hl-sal"],
);
assert.deepEqual(
  rankPublishedProgrammes({
    productCode: "HOME_LOAN",
    profile: { ...mappingProfile, employmentType: "self employed" },
    candidates: mappingCandidates,
  }).map((row) => row.programmeId),
  ["hl-se"],
);
assert.deepEqual(
  rankPublishedProgrammes({ productCode: "HOME_LOAN_BT", profile: mappingProfile, candidates: mappingCandidates }).map((row) => row.programmeId),
  ["bt-sal"],
);

const history = presentPolicyChangeHistory(state.audit);
assert.ok(history.some((row) => row.event === "Unpublished"));
assert.ok(history.some((row) => row.field === "roiPercent" && row.oldValue === "7" && row.newValue === "7.25" && row.reason === "Rate revision"));
assert.equal(state.programs[0]!.isLivePublished, true);
assert.equal(state.programs[0]!.publicationState, "published");

const portalBlocked = step(
  [published],
  [],
  "bom",
  { action: "portal_publish", expectedVersionNumber: 4, patch: { roiPercent: 7.25 } },
  "2026-10-27T08:00:00.000Z",
);
assert.match(portalBlocked.error ?? "", /Unpublish/);
assert.equal(portalBlocked.programs[0], published);
assert.equal(portalBlocked.audit.length, 0);
assert.ok(history.some((row) => row.event === "Published" && row.actor === "Admin"));
assert.equal(deal.lenderProgramId, "bom");
assert.equal(deal.expectedRoi, 7);

const blocked = step(
  [published],
  [],
  "bom",
  { action: "save_draft", expectedVersionNumber: 4, patch: { roiPercent: 8 } },
  "2026-10-27T08:00:00.000Z",
);
assert.match(blocked.error ?? "", /Unpublish/);
assert.equal(blocked.programs, blocked.programs);
assert.equal(blocked.programs[0], published);
assert.equal(blocked.audit.length, 0);

const stalePrograms = [published];
const staleAudit: ProgrammeAuditRecord[] = [];
const stale = step(stalePrograms, staleAudit, "bom", { action: "unpublish", expectedVersionNumber: 3 }, "2026-10-27T08:00:00.000Z");
assert.match(stale.error ?? "", /someone else/);
assert.equal(stale.programs, stalePrograms);
assert.equal(stale.audit, staleAudit);

const rollback = step(
  [published],
  [],
  "bom",
  { action: "unpublish", expectedVersionNumber: 4 },
  "2026-10-27T08:00:00.000Z",
  true,
);
assert.match(rollback.error ?? "", /Audit write failed/);
assert.equal(rollback.programs[0], published);
assert.equal(rollback.audit.length, 0);

const createdProgramme = programme({
  id: "new-bom",
  code: "NEW-BOM",
  status: "draft",
  lifecycleStatus: "draft",
  enabled: true,
  isLivePublished: false,
  publicationState: "draft",
  roiPercent: 7,
});
const createRollback = commitProgrammeCreation({
  programs: [],
  audit: [],
  program: createdProgramme,
  actorUserId: actor.actorUserId,
  actorName: actor.actorName,
  at: "2026-10-27T11:00:00.000Z",
  failAudit: true,
});
assert.match(createRollback.error ?? "", /Audit write failed/);
assert.equal(createRollback.programs.length, 0);
assert.equal(createRollback.audit.length, 0);
const blockedCreate = commitProgrammeCreation({
  programs: [published],
  audit: [],
  program: createdProgramme,
  actorUserId: actor.actorUserId,
  actorName: actor.actorName,
  at: "2026-10-27T11:00:00.000Z",
});
assert.match(blockedCreate.error ?? "", /already owns/);
assert.equal(blockedCreate.programs.length, 1);
assert.equal(blockedCreate.audit.length, 0);
const createCommitted = commitProgrammeCreation({
  programs: [],
  audit: [],
  program: createdProgramme,
  actorUserId: actor.actorUserId,
  actorName: actor.actorName,
  at: "2026-10-27T11:00:00.000Z",
});
assert.equal(createCommitted.error, undefined);
assert.equal(createCommitted.programs.length, 1);
assert.equal(createCommitted.programs[0]!.id, "new-bom");
assert.equal(createCommitted.audit.length, 1);
assert.equal(createCommitted.audit[0]!.action, "created");
assert.equal(createCommitted.audit[0]!.reason, "lender_program_created");
assert.equal(createCommitted.audit[0]!.entityId, "new-bom");

const lifecycleProgramme = programme({
  id: "bom",
  code: "BOM",
  createdBy: "maker-1",
  versionNumber: 4,
  lockVersion: 2,
  publicationState: "draft",
  approvalStatus: "none",
  roiPercent: 7.25,
  productCode: "HOME_LOAN",
  employmentType: "salaried",
});
const lifecycleAt = "2026-10-27T12:00:00.000Z";
const deniedUser = commitProgrammeLifecycle({
  program: lifecycleProgramme,
  audit: [],
  action: "submit",
  actorUserId: "user-1",
  actorRole: "USER",
  at: lifecycleAt,
});
assert.match(deniedUser.error ?? "", /Ordinary users/);
assert.equal(deniedUser.program, lifecycleProgramme);
assert.equal(deniedUser.audit.length, 0);
const selfApprove = commitProgrammeLifecycle({
  program: { ...lifecycleProgramme, createdBy: "admin-1" },
  audit: [],
  action: "approve",
  actorUserId: "admin-1",
  actorRole: "ADMIN",
  at: lifecycleAt,
});
assert.match(selfApprove.error ?? "", /Creator cannot approve/);
assert.equal(selfApprove.audit.length, 0);
const selfApproveSuper = commitProgrammeLifecycle({
  program: { ...lifecycleProgramme, createdBy: "admin-1" },
  audit: [],
  action: "approve",
  actorUserId: "admin-1",
  actorRole: "SUPER_ADMIN",
  at: lifecycleAt,
});
assert.match(selfApproveSuper.error ?? "", /audit reason/);
assert.equal(selfApproveSuper.program.approvalStatus, "none");
const staleSubmit = commitProgrammeLifecycle({
  program: lifecycleProgramme,
  audit: [],
  action: "submit",
  actorUserId: "admin-1",
  actorRole: "ADMIN",
  expectedVersionNumber: 3,
  at: lifecycleAt,
});
assert.match(staleSubmit.error ?? "", /someone else/);
assert.equal(staleSubmit.program, lifecycleProgramme);
assert.equal(staleSubmit.audit.length, 0);
const submitRollback = commitProgrammeLifecycle({
  program: lifecycleProgramme,
  audit: [],
  action: "submit",
  actorUserId: "admin-1",
  actorRole: "ADMIN",
  expectedVersionNumber: 4,
  at: lifecycleAt,
  failAudit: true,
});
assert.match(submitRollback.error ?? "", /Audit write failed/);
assert.equal(submitRollback.program.publicationState, "draft");
assert.equal(submitRollback.program.approvalStatus, "none");
assert.equal(submitRollback.program.roiPercent, 7.25);
assert.equal(submitRollback.audit.length, 0);
const submitted = commitProgrammeLifecycle({
  program: lifecycleProgramme,
  audit: [],
  action: "submit",
  actorUserId: "admin-1",
  actorRole: "ADMIN",
  actorName: "Admin",
  expectedVersionNumber: 4,
  at: lifecycleAt,
});
assert.equal(submitted.error, undefined);
assert.equal(submitted.program.id, "bom");
assert.equal(submitted.program.versionNumber, 4);
assert.equal(submitted.program.lockVersion, 3);
assert.equal(submitted.program.publicationState, "pending_approval");
assert.equal(submitted.program.approvalStatus, "pending");
assert.equal(submitted.program.roiPercent, 7.25);
assert.equal(submitted.program.productCode, "HOME_LOAN");
assert.equal(submitted.audit.length, 1);
assert.equal(submitted.audit[0]!.action, "submitted");
assert.equal(submitted.audit[0]!.previousValue.approvalStatus, "none");
assert.equal(submitted.audit[0]!.newValue.approvalStatus, "pending");
assert.equal(submitted.audit[0]!.newValue.roiPercent, 7.25);
const approveRollback = commitProgrammeLifecycle({
  program: submitted.program,
  audit: submitted.audit,
  action: "approve",
  actorUserId: "admin-1",
  actorRole: "SUPER_ADMIN",
  approvalReason: "Credit policy accepted",
  expectedVersionNumber: 9,
  at: lifecycleAt,
});
assert.match(approveRollback.error ?? "", /someone else/);
assert.equal(approveRollback.program.approvalStatus, "pending");
assert.equal(approveRollback.audit.length, 1);
const approveFailed = commitProgrammeLifecycle({
  program: submitted.program,
  audit: submitted.audit,
  action: "approve",
  actorUserId: "admin-1",
  actorRole: "SUPER_ADMIN",
  approvalReason: "Credit policy accepted",
  expectedVersionNumber: 4,
  at: lifecycleAt,
  failAudit: true,
});
assert.match(approveFailed.error ?? "", /Audit write failed/);
assert.equal(approveFailed.program, submitted.program);
assert.equal(approveFailed.audit.length, 1);
const approved = commitProgrammeLifecycle({
  program: submitted.program,
  audit: submitted.audit,
  action: "approve",
  actorUserId: "admin-1",
  actorRole: "SUPER_ADMIN",
  actorName: "Admin",
  approvalReason: "Credit policy accepted",
  expectedVersionNumber: 4,
  at: lifecycleAt,
});
assert.equal(approved.error, undefined);
assert.equal(approved.program.id, "bom");
assert.equal(approved.program.approvalStatus, "approved");
assert.equal(approved.program.approvalReason, "Credit policy accepted");
assert.equal(approved.program.roiPercent, 7.25);
assert.equal(approved.program.versionNumber, 4);
assert.equal(approved.audit.length, 2);
assert.equal(approved.audit[1]!.action, "approved");
assert.equal(approved.audit[1]!.previousValue.approvalStatus, "pending");
assert.equal(approved.audit[1]!.newValue.approvalStatus, "approved");
assert.equal(approved.audit[1]!.reason, "Credit policy accepted");
const lifecycleHistory = presentPolicyChangeHistory(
  approved.audit.map((entry) => ({ ...entry, at: entry.at })),
);
assert.equal(lifecycleHistory.some((row) => row.event === "Submitted" && row.oldValue === "none" && row.newValue === "pending"), true);
assert.equal(lifecycleHistory.some((row) => row.event === "Approved" && row.oldValue === "pending" && row.newValue === "approved"), true);

const other = programme({
  id: "other",
  code: "OTHER",
  minCibil: 750,
  roiPercent: 8,
});
const draft = programme({
  id: "draft-bom",
  code: "BOM",
  status: "inactive",
  lifecycleStatus: "inactive",
  enabled: false,
  versionNumber: 2,
  roiPercent: 7.25,
});
const conflictBefore = [other, draft];
const conflict = step(conflictBefore, [], "draft-bom", { action: "republish", expectedVersionNumber: 2 }, "2026-10-27T09:00:00.000Z");
assert.match(conflict.error ?? "", /already owns/);
assert.equal(conflict.programs, conflictBefore);
assert.equal(conflict.programs[0]!.roiPercent, 8);
assert.equal(isPublishedProgramme(conflict.programs[1]!), false);

const salaried = programme({ id: "sal", employmentType: "salaried" });
const selfEmployed = programme({ id: "se", employmentType: "self-employed", lenderId: "bom" });
assert.deepEqual([...recommendationProgrammeIds([salaried, selfEmployed])].sort(), ["sal", "se"]);
assert.equal(selectCurrentProgramme([salaried, selfEmployed], "salaried")?.id, "sal");
assert.equal(selectCurrentProgramme([salaried, selfEmployed], "self_employed")?.id, "se");
assert.equal(selectCurrentProgramme([selfEmployed], "salaried"), null);

const open = programme({ id: "open", employmentType: null });
assert.equal(selectCurrentProgramme([open], "salaried")?.id, "open");
assert.equal(selectCurrentProgramme([salaried, open], "salaried")?.id, "sal");

const home = programme({ id: "hl", productCode: "HOME_LOAN" });
const balance = programme({ id: "bt", productCode: "HOME_LOAN_BT" });
assert.deepEqual([...recommendationProgrammeIds([home, balance])].sort(), ["bt", "hl"]);

const duplicate = programme({ id: "dup", minCibil: 700 });
assert.equal(recommendationProgrammeIds([home, duplicate]).size, 0);

const portal = resolvePortalProgrammeTarget({
  organizationId: "org",
  lenderId: "bom",
  productCode: "HOME_LOAN",
  employmentType: "salaried",
  programmes: [home, duplicate],
});
assert.equal(portal.ok, false);
const mapped = resolvePortalProgrammeTarget({
  previousProgramId: "hl",
  organizationId: "org",
  lenderId: "bom",
  productCode: "HOME_LOAN",
  employmentType: "salaried",
  programmes: [home],
});
assert.equal(mapped.ok && mapped.programmeId, "hl");
const mappedDuplicate = resolvePortalProgrammeTarget({
  previousProgramId: "hl",
  organizationId: "org",
  lenderId: "bom",
  productCode: "HL_STD",
  employmentType: "salaried",
  programmes: [home, duplicate],
});
assert.equal(mappedDuplicate.ok, false);

const orphan = programme({
  id: "orphan",
  isLivePublished: false,
  publicationState: "draft",
  status: "draft",
  lifecycleStatus: "draft",
  enabled: true,
  versionNumber: 1,
});
const resumed = resolvePortalProgrammeTarget({
  organizationId: "org",
  lenderId: "bom",
  productCode: "HOME_LOAN",
  employmentType: "salaried",
  programmes: [orphan],
});
assert.equal(resumed.ok && resumed.programmeId, "orphan");
assert.equal(
  planProgrammeCreate({ candidate: programme({ id: "second-create" }), siblings: [orphan] }).ok,
  false,
);

const eight = [
  ["A", "HOME_LOAN", "Salaried"],
  ["B", "HOME_LOAN", "Self-Employed"],
  ["C", "HOME_LOAN_BT", "Salaried"],
  ["D", "home_loan_bt", "Self Employed Professional"],
  ["E", "LAP", "Salaried"],
  ["F", "LAP_STD", "self_employed"],
  ["G", "PERSONAL_LOAN", "Salaried"],
  ["H", "BL_STD", "Self-Employed"],
] as const;
const owned: EnterpriseLenderProgramRecord[] = [];
for (const [id, productCode, employmentType] of eight) {
  const row = programme({ id, productCode, employmentType, roiPercent: 7 });
  const plan = planProgrammeCreate({ candidate: row, siblings: owned });
  assert.equal(plan.ok, true, id);
  owned.push(row);
}
assert.equal(new Set(owned.map(programmeFamilyKey)).size, 8);
const alias = programme({ id: "alias", productCode: "HL_STD", employmentType: "salaried", roiPercent: 9.5, minCibil: 800 });
const aliasPlan = planProgrammeCreate({ candidate: alias, siblings: owned });
assert.equal(aliasPlan.ok, false);
assert.deepEqual(
  programmeAdvisoryLockPair(programmeFamilyKey(owned[0]!)),
  programmeAdvisoryLockPair(programmeFamilyKey(alias)),
);
const rateVariant = programme({
  id: "rate",
  productCode: "HOME_LOAN",
  employmentType: "Salaried",
  roiPercent: 7.25,
  minCibil: 650,
  maxLtvPercent: 75,
});
assert.equal(planProgrammeCreate({ candidate: rateVariant, siblings: owned }).ok, false);
const unspecified = programme({ id: "open-slot", employmentType: "both", productCode: "HOME_LOAN" });
assert.equal(planProgrammeCreate({ candidate: unspecified, siblings: owned }).ok, true);
assert.notEqual(programmeFamilyKey(unspecified), programmeFamilyKey(owned[0]!));

const securedCapital = programme({ id: "wc-s", productCode: "WORKING_CAPITAL_SECURED", employmentType: "business" });
const unsecuredCapital = programme({ id: "wc-u", productCode: "WORKING_CAPITAL_UNSECURED", employmentType: "business" });
assert.notEqual(programmeFamilyKey(securedCapital), programmeFamilyKey(unsecuredCapital));
assert.equal(planProgrammeCreate({ candidate: unsecuredCapital, siblings: [securedCapital] }).ok, true);
assert.notEqual(programmeFamilyKey(owned[6]!), programmeFamilyKey(owned[7]!));

const unpublishedOwner = programme({
  id: "draft-owner",
  status: "draft",
  lifecycleStatus: "draft",
  enabled: false,
  roiPercent: 6,
});
assert.equal(
  planProgrammeCreate({
    candidate: programme({ id: "second-draft", roiPercent: 11, minCibil: 600 }),
    siblings: [unpublishedOwner],
  }).ok,
  false,
);
assert.equal(recommendationProgrammeIds([unpublishedOwner]).size, 0);
const expired = programme({ id: "expired", effectiveUntil: "2020-01-01T00:00:00.000Z", roiPercent: 4 });
const scheduled = programme({ id: "scheduled", effectiveFrom: "2099-01-01T00:00:00.000Z", roiPercent: 4 });
assert.equal(recommendationProgrammeIds([expired, scheduled]).size, 0);
const staleRank = rankPublishedProgrammes({
  productCode: "HL_STD",
  profile: { employmentType: "salaried", approxCibil: 760, monthlyIncome: 100000, loanAmount: 5000000 },
  candidates: [expired, scheduled, unpublishedOwner].map((program) => ({
    program,
    lenderId: "bom",
    lenderCode: "BOM",
    lenderName: "Bank of Maharashtra",
    priorityRank: 1,
  })),
});
assert.equal(staleRank.length, 0);
const crossProduct = rankPublishedProgrammes({
  productCode: "HOME_LOAN",
  profile: { employmentType: "salaried" },
  candidates: [
    {
      program: balance,
      lenderId: "bom",
      lenderCode: "BOM",
      lenderName: "Bank of Maharashtra",
      priorityRank: 1,
    },
  ],
});
assert.equal(crossProduct.length, 0);
assert.equal(selectCurrentProgramme([salaried, selfEmployed], null), null);

const parked = programme({
  id: "parked",
  status: "inactive",
  lifecycleStatus: "inactive",
  enabled: false,
  versionNumber: 1,
  employmentType: "salaried",
});
const occupied = step(
  [parked, selfEmployed],
  [],
  "parked",
  { action: "save_draft", expectedVersionNumber: 1, patch: { employmentType: "self-employed" } },
  "2026-10-27T10:00:00.000Z",
);
assert.match(occupied.error ?? "", /already owns/);
assert.equal(occupied.programs.length, 2);
assert.equal(occupied.programs[0]!.employmentType, "salaried");

const queue = new Map<string, Promise<void>>();
const concurrentStore: EnterpriseLenderProgramRecord[] = [];
function createUnderLock(row: EnterpriseLenderProgramRecord) {
  const key = programmeAdvisoryLockPair(programmeFamilyKey(row)).join(",");
  const previous = queue.get(key) ?? Promise.resolve();
  const run = previous.then(async () => {
    const plan = planProgrammeCreate({ candidate: row, siblings: concurrentStore });
    if (!plan.ok) return plan.message;
    concurrentStore.push(row);
    return "created";
  });
  queue.set(key, run.then(() => undefined, () => undefined));
  return run;
}
const firstCreate = programme({ id: "race-1", code: "RACE-1" });
const secondCreate = programme({ id: "race-2", code: "RACE-2", roiPercent: 8.1, minCibil: 720 });

const bomPublished = programme({
  id: "289b8e13-619a-4196-8250-1c2fe1a3d824",
  lenderId: "bom",
  code: "BASE_BOM_HOME_LOAN_BT",
  productCode: "HOME_LOAN_BT",
  employmentType: "salaried",
  versionNumber: 4,
});
const bomRetired = programme({
  id: "cms8ht3lx00e5wed8b2jk2bn9",
  lenderId: "bom",
  code: "BASE_BOM_HOME_LOAN_BT",
  productCode: "HOME_LOAN_BT",
  employmentType: "salaried",
  publicationState: "superseded",
  isLivePublished: false,
  versionNumber: 2,
});
const bomFamily = [bomPublished, bomRetired];
assert.equal(planProgrammeCreate({ candidate: programme({ id: "bom-new", lenderId: "bom", productCode: "HOME_LOAN_BT" }), siblings: bomFamily }).ok, false);
const bomPortal = resolvePortalProgrammeTarget({
  organizationId: "org",
  lenderId: "bom",
  productCode: "HOME_LOAN_BT",
  employmentType: "salaried",
  programmes: bomFamily,
});
assert.equal(bomPortal.ok && bomPortal.programmeId, bomPublished.id);
let bomState = step(bomFamily, [], bomPublished.id, { action: "save_draft", expectedVersionNumber: 4, patch: { roiPercent: 7.4 } }, "2026-10-28T01:00:00.000Z");
assert.match(bomState.error ?? "", /Unpublish/);
assert.equal(isPublishedProgramme(bomState.programs.find((row) => row.id === bomPublished.id)!), true);
bomState = step(bomState.programs, bomState.audit, bomPublished.id, { action: "unpublish", expectedVersionNumber: 4 }, "2026-10-28T01:01:00.000Z");
assert.equal(bomState.error, undefined);
assert.equal(bomState.programs.find((row) => row.id === bomRetired.id)!.publicationState, "superseded");
bomState = step(bomState.programs, bomState.audit, bomPublished.id, { action: "save_draft", expectedVersionNumber: 5, patch: { roiPercent: 7.4 } }, "2026-10-28T01:02:00.000Z");
assert.equal(bomState.error, undefined);
bomState = step(bomState.programs, bomState.audit, bomPublished.id, { action: "republish", expectedVersionNumber: 6 }, "2026-10-28T01:03:00.000Z");
assert.equal(bomState.error, undefined);
assert.equal(isPublishedProgramme(bomState.programs.find((row) => row.id === bomPublished.id)!), true);
assert.equal(bomState.programs.filter((row) => row.id === bomRetired.id).length, 1);
assert.deepEqual([...recommendationProgrammeIds(bomState.programs)], [bomPublished.id]);

const hsbcPublished = programme({
  id: "c0b7427a-c6ab-4b74-b6f7-6e9d4f5eca99",
  lenderId: "hsbc",
  code: "BASE_HSBC_HOME_LOAN",
  productCode: "HOME_LOAN",
  versionNumber: 3,
});
const hsbcFamily = [
  hsbcPublished,
  programme({ id: "09e9234f-0aa0-4310-b5aa-323d8f9e0845", lenderId: "hsbc", code: "BASE_HSBC_HOME_LOAN", productCode: "HOME_LOAN", publicationState: "superseded", isLivePublished: false }),
  programme({ id: "cms8hvq3u00zbwed8r0fmxfgh", lenderId: "hsbc", code: "BASE_HSBC_HOME_LOAN", productCode: "HOME_LOAN", publicationState: "archived", isLivePublished: false }),
];
const hsbcRetry = resolvePortalProgrammeTarget({
  previousProgramId: hsbcPublished.id,
  organizationId: "org",
  lenderId: "hsbc",
  productCode: "HOME_LOAN",
  employmentType: "salaried",
  programmes: hsbcFamily,
});
assert.equal(hsbcRetry.ok && hsbcRetry.programmeId, hsbcPublished.id);
let hsbcState = step(hsbcFamily, [], hsbcPublished.id, { action: "unpublish", expectedVersionNumber: 3 }, "2026-10-28T01:04:00.000Z");
assert.equal(hsbcState.error, undefined);
hsbcState = step(hsbcState.programs, hsbcState.audit, hsbcPublished.id, { action: "republish", expectedVersionNumber: 4 }, "2026-10-28T01:05:00.000Z");
assert.equal(hsbcState.error, undefined);
assert.equal(hsbcState.programs.filter((row) => row.publicationState === "superseded" || row.publicationState === "archived").length, 2);
assert.deepEqual([...recommendationProgrammeIds(hsbcState.programs)], [hsbcPublished.id]);

const cbiPublished = programme({
  id: "a5d48536-11cd-401e-98ec-bd1d8ee1e4a4",
  lenderId: "cbi",
  code: "CBI_HL_SAL_001",
  productCode: "HOME_LOAN",
  versionNumber: 2,
});
const cbiPending = programme({
  id: "e3faa669-e804-4cab-8a28-682d1fd8dffd",
  lenderId: "cbi",
  code: "CBI_HL_SAL_001",
  productCode: "HOME_LOAN",
  publicationState: "pending_approval",
  isLivePublished: false,
  lifecycleStatus: "inactive",
});
const cbiFamily = [cbiPublished, cbiPending];
assert.equal(planProgrammeCreate({ candidate: programme({ id: "cbi-new", lenderId: "cbi", productCode: "HOME_LOAN" }), siblings: cbiFamily }).ok, false);
const cbiAttempt = step(cbiFamily, [], cbiPublished.id, { action: "save_draft", expectedVersionNumber: 2, patch: { roiPercent: 8 } }, "2026-10-28T01:06:00.000Z");
assert.match(cbiAttempt.error ?? "", /already owns/);
assert.equal(cbiAttempt.programs.find((row) => row.id === cbiPublished.id)!.publicationState, "published");
assert.equal(cbiAttempt.audit.length, 0);
const cbiUnpublish = step(cbiFamily, [], cbiPublished.id, { action: "unpublish", expectedVersionNumber: 2 }, "2026-10-28T01:07:00.000Z");
assert.match(cbiUnpublish.error ?? "", /already owns/);
assert.equal(isPublishedProgramme(cbiUnpublish.programs.find((row) => row.id === cbiPublished.id)!), true);
const cbiRepublishPending = step(cbiFamily, [], cbiPending.id, { action: "republish", expectedVersionNumber: 1 }, "2026-10-28T01:08:00.000Z");
assert.match(cbiRepublishPending.error ?? "", /already owns/);
assert.deepEqual([...recommendationProgrammeIds(cbiFamily)], [cbiPublished.id]);

const hdfcPublished = programme({
  id: "b8d185ff-0ff0-4080-a433-67d8f20a2f09",
  lenderId: "hdfc",
  code: "HDFC_HLBT_SAL_001",
  productCode: "HOME_LOAN_BT",
  employmentType: "salaried",
  versionNumber: 2,
});
const hdfcDraft = programme({
  id: "cms8ht6k300etwed84p1jnis5",
  lenderId: "hdfc",
  code: "BASE_HDFC_HOME_LOAN_BT",
  productCode: "HOME_LOAN_BT",
  employmentType: "",
  publicationState: "draft",
  isLivePublished: false,
  status: "draft",
  lifecycleStatus: "draft",
});
assert.equal(planProgrammeCreate({ candidate: programme({ id: "hdfc-se", lenderId: "hdfc", productCode: "HOME_LOAN_BT", employmentType: "self employed" }), siblings: [hdfcPublished, hdfcDraft] }).ok, true);
const hdfcEdit = step([hdfcPublished, hdfcDraft], [], hdfcPublished.id, { action: "unpublish", expectedVersionNumber: 2 }, "2026-10-28T01:09:00.000Z");
assert.equal(hdfcEdit.error, undefined);
assert.equal(hdfcEdit.programs.find((row) => row.id === hdfcDraft.id)!.publicationState, "draft");
assert.equal(recommendationProgrammeIds([hdfcPublished, hdfcDraft]).has(hdfcDraft.id), false);

const duplicatePublished = [
  programme({ id: "live-a", lenderId: "dup", productCode: "HOME_LOAN" }),
  programme({ id: "live-b", lenderId: "dup", productCode: "HL_STD" }),
];
assert.equal(recommendationProgrammeIds(duplicatePublished).size, 0);
assert.equal(selectCurrentProgramme(duplicatePublished, "salaried"), null);
assert.equal(planProgrammeCreate({ candidate: programme({ id: "live-c", lenderId: "dup", productCode: "HOME_LOAN" }), siblings: duplicatePublished }).ok, false);
const inactiveStillOccupies = programme({
  id: "inactive-current",
  lenderId: "dup2",
  productCode: "LAP",
  lifecycleStatus: "inactive",
  publicationState: "published",
});
assert.equal(planProgrammeCreate({ candidate: programme({ id: "dup2-new", lenderId: "dup2", productCode: "LAP" }), siblings: [inactiveStillOccupies] }).ok, false);

const boiPublished = programme({
  id: "boi-hl",
  code: "BASE_BOI_HOME_LOAN",
  lenderId: "boi",
  label: "Bank of India Home Loan",
  minRoiExact: "7.100000",
  maxRoiExact: "8.500000",
  roiPercent: 7.1,
  versionNumber: 3,
});
const boiUnpublished = step(
  [boiPublished],
  [],
  boiPublished.id,
  { action: "unpublish", expectedVersionNumber: 3 },
  "2026-10-30T08:00:00.000Z",
);
assert.equal(boiUnpublished.error, undefined);
const boiDraft = boiUnpublished.programs[0]!;
assert.equal(boiDraft.id, boiPublished.id);
assert.equal(boiDraft.publicationState, "draft");
assert.equal(boiDraft.minRoiExact, "7.100000");
const boiEditor = {
  ...emptyProgrammeEditorState(),
  lenderId: boiDraft.lenderId,
  code: boiDraft.code,
  label: boiDraft.label,
  productCode: "HOME_LOAN",
  employmentTypes: ["salaried"],
  minRoiExact: "7.25",
  maxRoiExact: "8.500000",
  roiPercent: 7.1,
} as ProgrammeEditorState;
const boiSaveBody = {
  ...toProgrammeWritePayload(boiEditor),
  roiPercent: boiEditor.roiPercent ?? null,
  expectedLockVersion: 1,
  expectedVersionNumber: boiDraft.versionNumber,
  changeReason: "draft_saved",
};
const boiControls = separateProgrammeUpdateControls(boiSaveBody);
const boiParsed = parseStructuredProgrammePayload({
  lenderId: boiDraft.lenderId,
  code: boiDraft.code,
  label: boiDraft.label,
  ...boiControls.commercial,
});
const boiUpdate = {
  ...structuredPayloadToUpdateInput(boiParsed, "admin"),
  ...(boiControls.roiPercent !== undefined ? { roiPercent: boiControls.roiPercent } : {}),
};
assert.equal(boiParsed.minRoiExact, "7.250000");
assert.equal(boiUpdate.minRoiExact, "7.250000");
assert.equal(boiUpdate.maxRoiExact, "8.500000");
assert.equal(boiUpdate.roiPercent, 7.1);
assert.equal(boiControls.commercial.roiPercent, undefined);
const boiSaved = {
  ...boiDraft,
  minRoiExact: boiUpdate.minRoiExact,
  maxRoiExact: boiUpdate.maxRoiExact,
  roiPercent: boiUpdate.roiPercent,
  versionNumber: boiDraft.versionNumber + 1,
};
const boiRepublished = step(
  [boiSaved],
  [],
  boiSaved.id,
  { action: "republish", expectedVersionNumber: boiSaved.versionNumber },
  "2026-10-30T08:05:00.000Z",
);
assert.equal(boiRepublished.error, undefined);
assert.equal(boiRepublished.programs[0]!.id, "boi-hl");
assert.equal(boiRepublished.programs[0]!.minRoiExact, "7.250000");
assert.equal(boiRepublished.programs[0]!.roiPercent, 7.1);
assert.equal(boiRepublished.programs[0]!.publicationState, "published");
assert.equal(boiRepublished.programs.length, 1);
const boiSubmittedWithoutSave = commitProgrammeLifecycle({
  program: boiDraft,
  audit: [],
  action: "submit",
  actorUserId: "admin",
  actorRole: "ADMIN",
  expectedVersionNumber: boiDraft.versionNumber,
  at: "2026-10-30T08:02:00.000Z",
});
assert.equal(boiSubmittedWithoutSave.error, undefined);
assert.equal(boiSubmittedWithoutSave.program.minRoiExact, "7.100000");

async function verifyPagination() {
  const raced = await Promise.all([createUnderLock(firstCreate), createUnderLock(secondCreate)]);
  assert.equal(raced.filter((result) => result === "created").length, 1);
  assert.match(raced.find((result) => result !== "created") ?? "", /already owns/);
  assert.equal(concurrentStore.length, 1);
  assert.equal(concurrentStore[0]!.id, "race-1");
  const pages = await collectPagedPrograms(async (page, pageSize) => {
    const start = (page - 1) * pageSize;
    const all = Array.from({ length: 450 }, (_, index) => index);
    return { items: all.slice(start, start + pageSize), total: all.length };
  });
  assert.equal(pages.length, 450);
  assert.equal(pages[449], 449);
  assert.equal(pages.slice(0, 200).includes(449), false);
}

verifyPagination()
  .then(() => {
    console.log("single-record programme governance checks passed");
    process.exit(0);
  })
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
