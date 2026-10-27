/**
 * Single-record Product Programme governance.
 * One organization + lender + canonical product + employment category
 * has at most one programme record, published or not. Policy edits stay on that id.
 *
 * Simultaneous creates take a transaction advisory lock on that family key.
 * There is no partial unique database index yet: adding one needs a migration
 * and stored canonical product and employment columns. A session that bypasses
 * this lock can still insert a second row until that constraint is approved.
 */
import { resolveProductSelectionFamilyKey } from "@/constants/enterprise-product-master";
import type { EnterpriseLenderProgramRecord } from "@/types/enterprise-lender-registry";

export type ProgrammeEmploymentCategory = "salaried" | "self_employed" | "unspecified";

export type ProgrammeRecordRole = "published" | "conflict" | "draft" | "unpublished";

export const PROGRAMME_MUST_UNPUBLISH_MESSAGE =
  "This programme is published. Unpublish it before changing commercial policy. No programme was changed.";

export const PROGRAMME_STALE_VERSION_MESSAGE =
  "This programme was updated by someone else. Reload it and try again. No programme was changed.";

export const PROGRAMME_KEY_CONFLICT_MESSAGE =
  "Another programme record already owns this lender, canonical product, and employment category. Open that programme. Nothing was created, merged, or deleted.";

export const PROGRAMME_PORTAL_AMBIGUOUS_MESSAGE =
  "This portal submission does not map to exactly one existing programme. No programme was created or changed.";

export const PROGRAMME_UNPUBLISH_WARNING =
  "Unpublish removes this programme from new CHANAKYA, COMPASS, lender directory, and Deal recommendations until you republish it. Existing deals keep their saved rate and programme reference.";

const COMMERCIAL_FIELDS = [
  "roiPercent",
  "minRoiPercent",
  "maxRoiPercent",
  "processingFeeLabel",
  "processingFeePct",
  "maxFundingAmount",
  "minFundingAmount",
  "maxLtvPercent",
  "maxTenureMonths",
  "minCibil",
  "minIncomeAmount",
  "maxFoirPercent",
  "maxDbrPercent",
  "minAge",
  "maxAge",
  "employmentType",
  "borrowerType",
  "productCode",
  "productId",
  "creditRiskPolicyRef",
  "eligibleStates",
  "eligibleCities",
  "requiredDocumentTypeIds",
  "requiredDocuments",
  "minRoiExact",
  "maxRoiExact",
  "minLoanAmountExact",
  "maxLoanAmountExact",
  "processingFeeAmountExact",
  "processingFeePctExact",
  "minLtvExact",
  "maxLtvExact",
  "minFoirExact",
  "maxFoirExact",
  "minDbrExact",
  "maxDbrExact",
  "spreadExact",
  "minTenureMonths",
  "maxCibil",
  "policyVersionId",
  "rateType",
] as const;

const FIELD_AUDIT_KEYS = [
  ...COMMERCIAL_FIELDS,
  "label",
  "description",
  "notes",
  "remarks",
  "averageTatDays",
] as const;

export type ProgrammePolicyPatch = Partial<
  Pick<EnterpriseLenderProgramRecord, (typeof FIELD_AUDIT_KEYS)[number]>
>;

export type ProgrammeGovernanceCommand =
  | { action: "unpublish"; expectedVersionNumber: number; reason?: string | null }
  | {
      action: "save_draft";
      expectedVersionNumber: number;
      patch: ProgrammePolicyPatch;
      reason?: string | null;
    }
  | { action: "republish"; expectedVersionNumber: number; reason?: string | null }
  | {
      action: "portal_publish";
      expectedVersionNumber: number;
      patch: ProgrammePolicyPatch;
      reason?: string | null;
    };

export type ProgrammeAuditIntent = {
  action: "created" | "submitted" | "approved" | "updated" | "deactivated" | "published";
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  reason: string;
};

export type ProgrammeAuditRecord = ProgrammeAuditIntent & {
  entityId: string;
  entityCode: string;
  actorUserId: string;
  actorName?: string;
  at: string;
};

export type ProgrammeFamilyConflict = {
  id: string;
  code: string;
  label: string;
  employmentCategory: ProgrammeEmploymentCategory;
  eligibilityProfile: string;
};

export function programmeEmploymentCategory(
  value: string | null | undefined,
): ProgrammeEmploymentCategory {
  const raw = (value || "")
    .trim()
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
  if (!raw || raw === "both" || raw === "all" || raw === "any" || raw.includes("both")) {
    return "unspecified";
  }
  if (raw === "salaried" || raw.includes("salaried")) return "salaried";
  if (raw.includes("self employed") || raw === "professional" || raw === "business") {
    return "self_employed";
  }
  return "unspecified";
}

export function programmeFamilyKey(
  program: Pick<
    EnterpriseLenderProgramRecord,
    "organizationId" | "lenderId" | "productCode" | "label" | "employmentType"
  >,
): string {
  const code = program.productCode?.trim();
  const product = code
    ? resolveProductSelectionFamilyKey({ code, label: program.label })
    : "unspecified-product";
  return [
    program.organizationId,
    program.lenderId,
    product,
    programmeEmploymentCategory(program.employmentType),
  ].join("|");
}

function num(value: number | null | undefined): string {
  return value == null || !Number.isFinite(Number(value)) ? "" : String(Number(value));
}

function list(values: string[] | null | undefined): string {
  return [...(values ?? [])]
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean)
    .sort()
    .join(",");
}

export function eligibilityProfileKey(
  program: Pick<
    EnterpriseLenderProgramRecord,
    | "borrowerType"
    | "minCibil"
    | "minIncomeAmount"
    | "maxLtvPercent"
    | "minFundingAmount"
    | "maxFundingAmount"
    | "minAge"
    | "maxAge"
    | "maxFoirPercent"
    | "maxDbrPercent"
    | "maxTenureMonths"
    | "eligibleStates"
    | "eligibleCities"
    | "creditRiskPolicyRef"
  >,
): string {
  return [
    (program.borrowerType ?? "").trim().toLowerCase(),
    num(program.minCibil),
    num(program.minIncomeAmount),
    num(program.maxLtvPercent),
    num(program.minFundingAmount),
    num(program.maxFundingAmount),
    num(program.minAge),
    num(program.maxAge),
    num(program.maxFoirPercent),
    num(program.maxDbrPercent),
    num(program.maxTenureMonths),
    list(program.eligibleStates),
    list(program.eligibleCities),
    (program.creditRiskPolicyRef ?? "").trim().toLowerCase(),
  ].join("|");
}

export function isPublishedProgramme(
  program: Pick<
    EnterpriseLenderProgramRecord,
    | "isDeleted"
    | "enabled"
    | "status"
    | "lifecycleStatus"
    | "isLivePublished"
    | "publicationState"
  >,
): boolean {
  return (
    !program.isDeleted &&
    program.enabled &&
    program.status === "active" &&
    program.lifecycleStatus === "active" &&
    program.isLivePublished === true &&
    program.publicationState === "published"
  );
}

export function recommendationProgrammeIds(
  programs: EnterpriseLenderProgramRecord[],
): Set<string> {
  const byKey = new Map<string, EnterpriseLenderProgramRecord[]>();
  for (const program of programs) {
    if (!isCurrentPublishedProgramme(program)) continue;
    const key = programmeFamilyKey(program);
    const group = byKey.get(key) ?? [];
    group.push(program);
    byKey.set(key, group);
  }
  const ids = new Set<string>();
  for (const group of byKey.values()) {
    if (group.length === 1) ids.add(group[0]!.id);
  }
  return ids;
}

export function listProgrammeFamilyConflicts(
  programs: EnterpriseLenderProgramRecord[],
): Array<{ familyKey: string; programmes: ProgrammeFamilyConflict[] }> {
  const byFamily = new Map<string, ProgrammeFamilyConflict[]>();
  for (const program of programs) {
    if (program.isDeleted) continue;
    const familyKey = programmeFamilyKey(program);
    const row: ProgrammeFamilyConflict = {
      id: program.id,
      code: program.code,
      label: program.label,
      employmentCategory: programmeEmploymentCategory(program.employmentType),
      eligibilityProfile: eligibilityProfileKey(program),
    };
    const listForKey = byFamily.get(familyKey) ?? [];
    listForKey.push(row);
    byFamily.set(familyKey, listForKey);
  }
  return [...byFamily.entries()]
    .filter(([, programmes]) => programmes.length > 1)
    .map(([familyKey, programmes]) => ({ familyKey, programmes }));
}

export function programmeKeyOwners(
  candidate: Pick<
    EnterpriseLenderProgramRecord,
    "id" | "organizationId" | "lenderId" | "productCode" | "label" | "employmentType"
  >,
  siblings: EnterpriseLenderProgramRecord[],
): EnterpriseLenderProgramRecord[] {
  const key = programmeFamilyKey(candidate);
  return siblings.filter(
    (program) =>
      program.id !== candidate.id &&
      !program.isDeleted &&
      programmeFamilyKey(program) === key,
  );
}

export function publishedKeyConflicts(
  candidate: EnterpriseLenderProgramRecord,
  siblings: EnterpriseLenderProgramRecord[],
): EnterpriseLenderProgramRecord[] {
  return programmeKeyOwners(candidate, siblings).filter(isPublishedProgramme);
}

export function formatProgrammeKeyConflict(rows: EnterpriseLenderProgramRecord[]): string {
  const detail = rows
    .map(
      (row) =>
        `${row.code} (${row.id}, ${programmeEmploymentCategory(row.employmentType)}, ${row.status})`,
    )
    .join("; ");
  return `${PROGRAMME_KEY_CONFLICT_MESSAGE} Existing programme: ${detail}.`;
}

export function planProgrammeCreate(input: {
  candidate: EnterpriseLenderProgramRecord;
  siblings: EnterpriseLenderProgramRecord[];
}): { ok: true; familyKey: string } | { ok: false; message: string; existingIds: string[] } {
  const owners = programmeKeyOwners(input.candidate, input.siblings);
  if (owners.length === 0) {
    return { ok: true, familyKey: programmeFamilyKey(input.candidate) };
  }
  return {
    ok: false,
    existingIds: owners.map((owner) => owner.id),
    message: formatProgrammeKeyConflict(owners),
  };
}

/** Two int4 keys for pg_advisory_xact_lock. Same business key always locks together. */
export function programmeAdvisoryLockPair(familyKey: string): [number, number] {
  let left = 0;
  let right = 0;
  for (let index = 0; index < familyKey.length; index += 1) {
    const code = familyKey.charCodeAt(index);
    left = Math.imul(left, 31) + code;
    right = Math.imul(right, 33) + code;
  }
  return [left | 0, right | 0];
}

function parsedTime(value: string | null | undefined): number | null {
  if (!value) return null;
  const time = Date.parse(value);
  return Number.isFinite(time) ? time : null;
}

export function programmeEffectiveWindowContains(
  program: Pick<EnterpriseLenderProgramRecord, "effectiveFrom" | "effectiveUntil">,
  now: Date,
): boolean {
  const time = now.getTime();
  const from = parsedTime(program.effectiveFrom);
  const until = parsedTime(program.effectiveUntil);
  if (from != null && from > time) return false;
  if (until != null && until <= time) return false;
  return true;
}

export function isCurrentPublishedProgramme(
  program: EnterpriseLenderProgramRecord,
  now: Date = new Date(),
): boolean {
  return isPublishedProgramme(program) && programmeEffectiveWindowContains(program, now);
}

export function programmeVersionPresentation(
  program: EnterpriseLenderProgramRecord,
  siblings: EnterpriseLenderProgramRecord[],
): { role: ProgrammeRecordRole; label: string } {
  if (program.status === "draft" || program.lifecycleStatus === "draft") {
    return { role: "draft", label: "Draft" };
  }
  if (isPublishedProgramme(program)) {
    const conflict = publishedKeyConflicts(program, siblings).length > 0;
    return conflict
      ? { role: "conflict", label: "Published conflict" }
      : { role: "published", label: "Published" };
  }
  return { role: "unpublished", label: "Unpublished" };
}

export function selectCurrentProgramme(
  programs: EnterpriseLenderProgramRecord[],
  employmentType?: string | null,
): EnterpriseLenderProgramRecord | null {
  const allowed = recommendationProgrammeIds(programs);
  const current = programs.filter((program) => allowed.has(program.id));
  const wanted = programmeEmploymentCategory(employmentType);
  const exact = current.filter(
    (program) => programmeEmploymentCategory(program.employmentType) === wanted,
  );
  if (exact.length === 1) return exact[0]!;
  if (exact.length > 1 || wanted === "unspecified") return null;
  const open = current.filter(
    (program) => programmeEmploymentCategory(program.employmentType) === "unspecified",
  );
  return open.length === 1 ? open[0]! : null;
}

function normalized(value: unknown): unknown {
  if (Array.isArray(value)) return value;
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (value == null || value === "") return null;
  return value;
}

function sameValue(left: unknown, right: unknown): boolean {
  return JSON.stringify(normalized(left)) === JSON.stringify(normalized(right));
}

export function publishedProgrammeCommercialChange(
  existing: EnterpriseLenderProgramRecord,
  patch: ProgrammePolicyPatch,
): boolean {
  return COMMERCIAL_FIELDS.some((field) => {
    if (patch[field] === undefined) return false;
    return !sameValue(existing[field], patch[field]);
  });
}

export function programmePolicySnapshot(
  program: EnterpriseLenderProgramRecord,
): Record<string, unknown> {
  const snapshot: Record<string, unknown> = {
    id: program.id,
    code: program.code,
    label: program.label,
    status: program.status,
    enabled: program.enabled,
    lifecycleStatus: program.lifecycleStatus,
    versionNumber: program.versionNumber,
    lenderId: program.lenderId,
    productId: program.productId ?? null,
    productCode: program.productCode ?? null,
  };
  for (const field of FIELD_AUDIT_KEYS) {
    snapshot[field] = normalized(program[field]);
  }
  snapshot.employmentCategory = programmeEmploymentCategory(program.employmentType);
  snapshot.eligibilityProfile = eligibilityProfileKey(program);
  return snapshot;
}

function fieldChanges(
  before: EnterpriseLenderProgramRecord,
  after: EnterpriseLenderProgramRecord,
): Array<{ field: string; oldValue: unknown; newValue: unknown }> {
  const changes = [];
  for (const field of FIELD_AUDIT_KEYS) {
    if (sameValue(before[field], after[field])) continue;
    changes.push({ field, oldValue: normalized(before[field]), newValue: normalized(after[field]) });
  }
  return changes;
}

function snapshotAudit(
  action: ProgrammeAuditIntent["action"],
  before: EnterpriseLenderProgramRecord,
  after: EnterpriseLenderProgramRecord,
  reason: string,
): ProgrammeAuditIntent {
  return {
    action,
    previousValue: programmePolicySnapshot(before),
    newValue: programmePolicySnapshot(after),
    reason,
  };
}

export function auditIntentsForProgrammeChange(
  before: EnterpriseLenderProgramRecord,
  after: EnterpriseLenderProgramRecord,
  reason: string,
): ProgrammeAuditIntent[] {
  const changes = fieldChanges(before, after);
  if (changes.length === 0) return [];
  return [snapshotAudit("updated", before, after, reason), ...changes.map((change) => fieldAudit(change, reason))];
}

function fieldAudit(
  change: { field: string; oldValue: unknown; newValue: unknown },
  reason: string,
): ProgrammeAuditIntent {
  return {
    action: "updated",
    previousValue: { field: change.field, value: change.oldValue },
    newValue: { field: change.field, value: change.newValue },
    reason,
  };
}

function stale(program: EnterpriseLenderProgramRecord, expectedVersionNumber: number) {
  if (program.versionNumber !== expectedVersionNumber) {
    return { ok: false as const, code: "STALE_VERSION", message: PROGRAMME_STALE_VERSION_MESSAGE };
  }
  return null;
}

function applyPatch(
  program: EnterpriseLenderProgramRecord,
  patch: ProgrammePolicyPatch,
  at: string,
): EnterpriseLenderProgramRecord {
  const next: EnterpriseLenderProgramRecord = { ...program, updatedAt: at };
  for (const field of FIELD_AUDIT_KEYS) {
    if (patch[field] !== undefined) {
      (next as unknown as Record<string, unknown>)[field] = patch[field];
    }
  }
  next.id = program.id;
  next.code = program.code;
  next.organizationId = program.organizationId;
  next.lenderId = program.lenderId;
  next.isDeleted = program.isDeleted;
  next.versionNumber = program.versionNumber + 1;
  return next;
}

function unpublishedCopy(
  program: EnterpriseLenderProgramRecord,
  at: string,
): EnterpriseLenderProgramRecord {
  return {
    ...program,
    status: "draft",
    enabled: true,
    lifecycleStatus: "draft",
    isLivePublished: false,
    publicationState: "draft",
    versionNumber: program.versionNumber + 1,
    updatedAt: at,
  };
}

export function applyProgrammeGovernance(input: {
  program: EnterpriseLenderProgramRecord;
  siblings: EnterpriseLenderProgramRecord[];
  command: ProgrammeGovernanceCommand;
  at: string;
}):
  | { ok: true; program: EnterpriseLenderProgramRecord; audit: ProgrammeAuditIntent[] }
  | { ok: false; code: string; message: string } {
  const { program, command } = input;
  const versionError = stale(program, command.expectedVersionNumber);
  if (versionError) return versionError;
  const reason = command.reason?.trim() || `programme_${command.action}`;

  if (command.action === "unpublish") {
    if (!isPublishedProgramme(program)) {
      return {
        ok: false,
        code: "NOT_PUBLISHED",
        message: "This programme is already unpublished. No programme was changed.",
      };
    }
    const next = unpublishedCopy(program, input.at);
    return {
      ok: true,
      program: next,
      audit: [snapshotAudit("deactivated", program, next, reason)],
    };
  }

  if (command.action === "save_draft") {
    if (isPublishedProgramme(program) && publishedProgrammeCommercialChange(program, command.patch)) {
      return { ok: false, code: "MUST_UNPUBLISH", message: PROGRAMME_MUST_UNPUBLISH_MESSAGE };
    }
    const next = applyPatch(program, command.patch, input.at);
    next.status = program.status;
    next.enabled = program.enabled;
    next.lifecycleStatus = program.lifecycleStatus;
    const owners = programmeKeyOwners(next, input.siblings);
    if (owners.length > 0) {
      return { ok: false, code: "PROGRAMME_KEY_CONFLICT", message: formatProgrammeKeyConflict(owners) };
    }
    const changes = fieldChanges(program, next);
    if (changes.length === 0) return { ok: true, program, audit: [] };
    return {
      ok: true,
      program: next,
      audit: [
        snapshotAudit("updated", program, next, reason),
        ...changes.map((change) => fieldAudit(change, reason)),
      ],
    };
  }

  if (command.action === "republish") {
    if (isPublishedProgramme(program)) {
      return {
        ok: false,
        code: "ALREADY_PUBLISHED",
        message: "This programme is already published. No programme was changed.",
      };
    }
    const candidate = { ...program, status: "active" as const, enabled: true, lifecycleStatus: "active" as const };
    const conflicts = programmeKeyOwners(candidate, input.siblings);
    if (conflicts.length > 0) {
      return { ok: false, code: "PROGRAMME_KEY_CONFLICT", message: formatProgrammeKeyConflict(conflicts) };
    }
    const next = {
      ...candidate,
      isLivePublished: true,
      publicationState: "published" as const,
      versionNumber: program.versionNumber + 1,
      updatedAt: input.at,
    };
    return {
      ok: true,
      program: next,
      audit: [snapshotAudit("published", program, next, reason)],
    };
  }

  if (isPublishedProgramme(program) && publishedProgrammeCommercialChange(program, command.patch)) {
    return { ok: false, code: "MUST_UNPUBLISH", message: PROGRAMME_MUST_UNPUBLISH_MESSAGE };
  }
  if (isPublishedProgramme(program)) {
    return { ok: true, program, audit: [] };
  }
  const merged = applyPatch(program, command.patch, input.at);
  merged.status = "active";
  merged.enabled = true;
  merged.lifecycleStatus = "active";
  merged.isLivePublished = true;
  merged.publicationState = "published";
  const conflicts = programmeKeyOwners(merged, input.siblings);
  if (conflicts.length > 0) {
    return { ok: false, code: "PROGRAMME_KEY_CONFLICT", message: formatProgrammeKeyConflict(conflicts) };
  }
  const changes = fieldChanges(program, merged);
  const audit: ProgrammeAuditIntent[] = [
    ...changes.map((change) => fieldAudit(change, reason)),
    snapshotAudit("published", program, merged, reason),
  ];
  return { ok: true, program: merged, audit };
}

export function runProgrammeTransaction(input: {
  programs: EnterpriseLenderProgramRecord[];
  audit: ProgrammeAuditRecord[];
  programId: string;
  command: ProgrammeGovernanceCommand;
  actorUserId: string;
  actorName?: string;
  at: string;
  failAudit?: boolean;
}): { programs: EnterpriseLenderProgramRecord[]; audit: ProgrammeAuditRecord[]; error?: string } {
  const program = input.programs.find((row) => row.id === input.programId && !row.isDeleted);
  if (!program) {
    return { programs: input.programs, audit: input.audit, error: "Lender program not found." };
  }
  const applied = applyProgrammeGovernance({
    program,
    siblings: input.programs,
    command: input.command,
    at: input.at,
  });
  if (!applied.ok || input.failAudit) {
    return {
      programs: input.programs,
      audit: input.audit,
      error: applied.ok
        ? "Audit write failed. Programme was not changed."
        : applied.message,
    };
  }
  if (applied.audit.length === 0) {
    return { programs: input.programs, audit: input.audit };
  }
  return {
    programs: input.programs.map((row) => (row.id === applied.program.id ? applied.program : row)),
    audit: [
      ...input.audit,
      ...applied.audit.map((entry) => ({
        ...entry,
        entityId: applied.program.id,
        entityCode: applied.program.code,
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        at: input.at,
      })),
    ],
  };
}

export function commitProgrammeCreation(input: {
  programs: EnterpriseLenderProgramRecord[];
  audit: ProgrammeAuditRecord[];
  program: EnterpriseLenderProgramRecord;
  actorUserId: string;
  actorName?: string;
  reason?: string;
  at: string;
  failAudit?: boolean;
}): { programs: EnterpriseLenderProgramRecord[]; audit: ProgrammeAuditRecord[]; error?: string } {
  const plan = planProgrammeCreate({ candidate: input.program, siblings: input.programs });
  if (!plan.ok) {
    return { programs: input.programs, audit: input.audit, error: plan.message };
  }
  if (input.failAudit) {
    return {
      programs: input.programs,
      audit: input.audit,
      error: "Audit write failed. Programme was not created.",
    };
  }
  return {
    programs: [...input.programs, input.program],
    audit: [
      ...input.audit,
      {
        action: "created",
        previousValue: {},
        newValue: input.program as unknown as Record<string, unknown>,
        reason: input.reason?.trim() || "lender_program_created",
        entityId: input.program.id,
        entityCode: input.program.code,
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        at: input.at,
      },
    ],
  };
}

export function programmeLifecycleDecision(input: {
  action: "submit" | "approve";
  actorRole: string;
  actorUserId: string;
  createdBy: string;
  approvalReason?: string | null;
}): { ok: true } | { ok: false; message: string } {
  if (input.actorRole !== "ADMIN" && input.actorRole !== "SUPER_ADMIN") {
    return { ok: false, message: "Ordinary users cannot mutate programmes." };
  }
  if (input.action === "approve" && input.createdBy === input.actorUserId && input.actorRole !== "SUPER_ADMIN") {
    return { ok: false, message: "Creator cannot approve their own programme." };
  }
  if (
    input.action === "approve" &&
    input.createdBy === input.actorUserId &&
    input.actorRole === "SUPER_ADMIN" &&
    !input.approvalReason?.trim()
  ) {
    return { ok: false, message: "Super Admin self-approval requires an audit reason." };
  }
  return { ok: true };
}

export function commitProgrammeLifecycle(input: {
  program: EnterpriseLenderProgramRecord;
  audit: ProgrammeAuditRecord[];
  action: "submit" | "approve";
  actorUserId: string;
  actorRole: string;
  actorName?: string;
  approvalReason?: string | null;
  expectedVersionNumber?: number | null;
  at: string;
  failAudit?: boolean;
}): { program: EnterpriseLenderProgramRecord; audit: ProgrammeAuditRecord[]; error?: string } {
  const decision = programmeLifecycleDecision({
    action: input.action,
    actorRole: input.actorRole,
    actorUserId: input.actorUserId,
    createdBy: input.program.createdBy,
    approvalReason: input.approvalReason,
  });
  if (!decision.ok) return { program: input.program, audit: input.audit, error: decision.message };
  const version = input.program.versionNumber;
  const lock = input.program.lockVersion ?? 1;
  if (
    input.expectedVersionNumber != null &&
    input.expectedVersionNumber !== version &&
    input.expectedVersionNumber !== lock
  ) {
    return { program: input.program, audit: input.audit, error: PROGRAMME_STALE_VERSION_MESSAGE };
  }
  if (input.failAudit) {
    return {
      program: input.program,
      audit: input.audit,
      error: "Audit write failed. Programme was not changed.",
    };
  }
  const reason =
    input.action === "approve"
      ? input.approvalReason?.trim() || "approved"
      : "submitted_for_approval";
  const next: EnterpriseLenderProgramRecord =
    input.action === "submit"
      ? {
          ...input.program,
          publicationState: "pending_approval",
          approvalStatus: "pending",
          submittedByUserId: input.actorUserId,
          modifiedBy: input.actorUserId,
          lockVersion: lock + 1,
        }
      : {
          ...input.program,
          approvalStatus: "approved",
          approvedBy: input.actorUserId,
          approvedAt: input.at,
          approvalReason: reason,
          modifiedBy: input.actorUserId,
          lockVersion: lock + 1,
        };
  return {
    program: next,
    audit: [
      ...input.audit,
      {
        action: input.action === "submit" ? "submitted" : "approved",
        previousValue: input.program as unknown as Record<string, unknown>,
        newValue: next as unknown as Record<string, unknown>,
        reason,
        entityId: input.program.id,
        entityCode: input.program.code,
        actorUserId: input.actorUserId,
        actorName: input.actorName,
        at: input.at,
      },
    ],
  };
}

export function resolvePortalProgrammeTarget(input: {
  previousProgramId?: string | null;
  organizationId: string;
  lenderId: string;
  productCode?: string | null;
  employmentType?: string | null;
  label?: string | null;
  programmes: EnterpriseLenderProgramRecord[];
}): { ok: true; programmeId: string | null } | { ok: false; message: string } {
  const live = input.programmes.filter((program) => !program.isDeleted);
  const probe = {
    id: input.previousProgramId || "portal-probe",
    organizationId: input.organizationId,
    lenderId: input.lenderId,
    productCode: input.productCode ?? null,
    label: input.label ?? "",
    employmentType: input.employmentType ?? null,
  };
  const owners = programmeKeyOwners(probe, live);
  if (input.previousProgramId) {
    const existing = live.find((program) => program.id === input.previousProgramId);
    if (!existing || existing.lenderId !== input.lenderId) {
      return { ok: false, message: PROGRAMME_PORTAL_AMBIGUOUS_MESSAGE };
    }
    const otherOwner = owners.find((program) => program.id !== existing.id);
    if (otherOwner) return { ok: false, message: formatProgrammeKeyConflict([otherOwner]) };
    return { ok: true, programmeId: existing.id };
  }
  if (owners.length > 1) return { ok: false, message: PROGRAMME_PORTAL_AMBIGUOUS_MESSAGE };
  return { ok: true, programmeId: owners[0]?.id ?? null };
}

export function presentPolicyChangeHistory(
  entries: Array<{
    action: string;
    previousValue?: Record<string, unknown> | null;
    newValue?: Record<string, unknown> | null;
    actorName?: string | null;
    actorUserId?: string | null;
    reason?: string | null;
    at: string;
  }>,
): Array<{
  at: string;
  actor: string;
  field: string;
  oldValue: string;
  newValue: string;
  event: string;
  reason: string;
}> {
  const display = (value: unknown) => {
    if (value == null || value === "") return "—";
    if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
      return String(value);
    }
    return JSON.stringify(value);
  };
  const rows = [];
  for (const entry of entries) {
    const actor = entry.actorName || entry.actorUserId || "Unknown";
    const field = entry.newValue?.field ?? entry.previousValue?.field;
    if (typeof field === "string") {
      rows.push({
        at: entry.at,
        actor,
        field,
        oldValue: display(entry.previousValue?.value),
        newValue: display(entry.newValue?.value),
        event: "Field change",
        reason: entry.reason?.trim() || "—",
      });
      continue;
    }
    if (entry.action === "submitted" || entry.action === "approved") {
      rows.push({
        at: entry.at,
        actor,
        field: "approvalStatus",
        oldValue: display(entry.previousValue?.approvalStatus),
        newValue: display(entry.newValue?.approvalStatus),
        event: entry.action === "submitted" ? "Submitted" : "Approved",
        reason: entry.reason?.trim() || "—",
      });
    } else if (entry.action === "created") {
      rows.push({
        at: entry.at,
        actor,
        field: "programme",
        oldValue: "—",
        newValue: display(entry.newValue?.code),
        event: "Created",
        reason: entry.reason?.trim() || "—",
      });
    } else if (entry.action === "deactivated") {
      rows.push({
        at: entry.at,
        actor,
        field: "publication",
        oldValue: display(entry.previousValue?.status),
        newValue: "draft",
        event: "Unpublished",
        reason: entry.reason?.trim() || "—",
      });
    } else if (entry.action === "published" || entry.action === "activated") {
      rows.push({
        at: entry.at,
        actor,
        field: "publication",
        oldValue: display(entry.previousValue?.status),
        newValue: "active",
        event: "Published",
        reason: entry.reason?.trim() || "—",
      });
    }
  }
  return rows;
}

export async function collectPagedPrograms<T>(
  load: (page: number, pageSize: number) => Promise<{ items: T[]; total: number }>,
  pageSize = 200,
): Promise<T[]> {
  const items: T[] = [];
  for (let page = 1; page <= 500; page += 1) {
    const batch = await load(page, pageSize);
    items.push(...batch.items);
    if (batch.items.length === 0 || items.length >= batch.total || batch.items.length < pageSize) {
      break;
    }
  }
  return items;
}
