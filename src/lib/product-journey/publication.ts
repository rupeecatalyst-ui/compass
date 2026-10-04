import { createHash } from "node:crypto";
import { canonicalizeProductCode } from "@/lib/product-programme-operations/product-aliases";
import {
  getProductJourneyStore,
  ProductJourneyStoreError,
  type JourneyAuditRecord,
  type JourneyBook,
} from "@/lib/product-journey/store";

/**
 * Product Journey publication — Catalyst One authority.
 *
 * Extends Enterprise Initial Data Collection. It does not own a second field
 * catalogue, a second Opportunity flow, or a lender programme.
 * The durable registry is authoritative. This module does not keep a process-memory book.
 */

export const JOURNEY_FIELD_TYPES = [
  "short_text",
  "long_text",
  "mobile",
  "email",
  "number",
  "currency",
  "percentage",
  "date",
  "date_of_birth",
  "single_select",
  "multi_select",
  "yes_no",
  "radio",
  "searchable_master",
  "location",
  "document_link",
  "consent",
  "informational",
  "calculated",
] as const;

export type JourneyFieldType = (typeof JOURNEY_FIELD_TYPES)[number];

export const JOURNEY_STAGE_KINDS = [
  "welcome",
  "mobile",
  "otp",
  "name",
  "questions",
  "recommendation",
  "analysing",
  "lenders",
  "advantage",
  "email",
  "review",
  "documents",
  "confirmation",
] as const;

export type JourneyStageKind = (typeof JOURNEY_STAGE_KINDS)[number];

export type JourneyCondition =
  | { op: "and" | "or"; conditions: JourneyCondition[] }
  | {
      op:
        | "equals"
        | "not_equals"
        | "contains"
        | "gt"
        | "gte"
        | "lt"
        | "lte"
        | "answered"
        | "not_answered";
      fieldId: string;
      value?: string | number | boolean;
    };

export type JourneyStageDraft = {
  stageId: string;
  kind: JourneyStageKind;
  label: string;
  sequence: number;
};

export type JourneyFieldDraft = {
  fieldId: string;
  stageId: string;
  label: string;
  helpText?: string;
  fieldType: JourneyFieldType;
  required: boolean;
  sequence: number;
  options?: { value: string; label: string }[];
  purpose: "" | "identity" | "recommendation" | "application" | "document" | "enrichment";
  visibleWhen?: JourneyCondition;
  requiredWhen?: JourneyCondition;
  notRequiredWhenFilled?: string[];
  includeOnReview?: boolean;
  min?: number;
  max?: number;
};

export type MobileCaptureMode = "required" | "optional" | "off";
export type OtpVerificationMode = "on" | "off";

export function normalizeMobileCapture(value: unknown): MobileCaptureMode {
  if (value === "optional" || value === "off" || value === "required") return value;
  return "required";
}

export function normalizeOtpVerification(value: unknown): OtpVerificationMode {
  return value === "on" ? "on" : "off";
}

/** Public stages honour the published mobile and OTP settings. Absent OTP means off. */
export function governedPublicStages<T extends { kind: string }>(
  stages: T[],
  mobileCapture: unknown,
  otpVerification: unknown,
): T[] {
  const mobile = normalizeMobileCapture(mobileCapture);
  const otp = normalizeOtpVerification(otpVerification);
  return stages.filter((stage) => {
    if (stage.kind === "otp" && otp !== "on") return false;
    if (stage.kind === "mobile" && mobile === "off") return false;
    return true;
  });
}

export type JourneyDraft = {
  productCode: string;
  productLabel: string;
  lifecycle: "draft" | "validated";
  previewed: boolean;
  publiclyEnabled: boolean;
  effectiveFrom?: string;
  advantageEnabled: boolean;
  /** Stored stamp. Runtime meaning: `resolvePublicRecommendationExecutor`. */
  recommendationBinding: "governed_chanakya" | "unavailable";
  consentVersion: string;
  lodSource: "opportunity_lod";
  confirmation: { title: string; body: string };
  sourceReference?: string;
  mobileCapture?: MobileCaptureMode;
  otpVerification?: OtpVerificationMode;
  stages: JourneyStageDraft[];
  fields: JourneyFieldDraft[];
};

export type JourneyValidationResult = { ok: boolean; errors: string[] };

export type JourneyPreviewResult = {
  ok: boolean;
  synthetic: true;
  createdRecords: false;
  errors?: string[];
  journeyVersion: number | null;
  stages: string[];
  visibleFieldIds: string[];
  missingRecommendationFieldIds: string[];
  advantageEnabled: boolean;
  identityStages: { mobile?: string; name?: string; email?: string };
};

export type JourneyMutationResult =
  | { ok: true; journey: PublishedJourneyDefinition }
  | { ok: false; errors: string[] };

export type JourneyRetireResult = { ok: true } | { ok: false; errors: string[] };

export type JourneyAdminView = {
  draft: JourneyDraft | null;
  effectiveVersion: number | null;
  publiclyEnabled: boolean;
  bookRevision: number;
  audits: JourneyAuditRecord[];
  published: PublishedJourneyDefinition | null;
  versions: JourneyAdminVersion[];
};

export type JourneyPublicResult = { publiclyEnabled: boolean };

export type JourneyImportResult = { imported: boolean; alreadyPublished: boolean };

export type JourneyAdminVersion = {
  journeyVersion: number;
  lifecycle: PublishedJourneyDefinition["lifecycle"];
  publishedAt: string;
  effectiveFrom: string;
  configurationHash?: string;
  publishedBy?: string;
};

export type PublishedJourneyDefinition = {
  productCode: string;
  productLabel: string;
  journeyVersion: number;
  lifecycle: "published" | "superseded" | "retired";
  publishedAt: string;
  effectiveFrom: string;
  publishedBy?: string;
  configurationHash?: string;
  sourceReference?: string;
  supersededAt?: string;
  retiredAt?: string;
  publiclyEnabled: boolean;
  advantageEnabled: boolean;
  /** Same stored stamp as the draft. Runtime meaning: `resolvePublicRecommendationExecutor`. */
  recommendationBinding: "governed_chanakya" | "unavailable";
  consentVersion: string;
  lodSource: "opportunity_lod";
  confirmation: { title: string; body: string };
  mobileCapture?: MobileCaptureMode;
  otpVerification?: OtpVerificationMode;
  stages: JourneyStageDraft[];
  fields: JourneyFieldDraft[];
};

/**
 * Public COMPASS customer recommendation executor.
 * `governed_chanakya` is the existing stored stamp for the published-programme
 * matcher (`matchPublishedProgramme`). A missing stamp is the unpinned legacy
 * session, which already uses that same matcher.
 * `unavailable` configures no customer recommendation.
 * Neither value calls `recommendLendersCanonical` or `evaluateCanonicalEligibility`.
 */
export function resolvePublicRecommendationExecutor(
  binding: "governed_chanakya" | "unavailable" | null | undefined,
): "published_programme_matcher" | "none" {
  if (binding == null || binding === "governed_chanakya") return "published_programme_matcher";
  return "none";
}

export function hashJourneyDefinition(
  draft: Pick<JourneyDraft, "stages" | "fields" | "consentVersion" | "lodSource" | "mobileCapture" | "otpVerification">,
): string {
  return createHash("sha256")
    .update(JSON.stringify({
      consentVersion: draft.consentVersion,
      lodSource: draft.lodSource,
      mobileCapture: normalizeMobileCapture(draft.mobileCapture),
      otpVerification: normalizeOtpVerification(draft.otpVerification),
      stages: draft.stages,
      fields: draft.fields,
    }))
    .digest("hex");
}

/** One publication book per canonical product. Aliases share that book. */
function key(productCode: string): string {
  const canonical = canonicalizeProductCode(productCode) ?? productCode.trim();
  return canonical.trim().toLowerCase();
}

function emptyBook(organizationId: string, productCode: string): JourneyBook {
  return {
    organizationId,
    productCode,
    bookRevision: 0,
    draft: null,
    versions: [],
    effectiveVersion: null,
    publiclyEnabled: true,
    audits: [],
  };
}

async function loadBook(organizationId: string, productCode: string): Promise<JourneyBook> {
  try {
    const store = await getProductJourneyStore();
    return (await store.read(organizationId, key(productCode))) ?? emptyBook(organizationId, key(productCode));
  } catch (error) {
    if (error instanceof ProductJourneyStoreError) throw error;
    throw new ProductJourneyStoreError("STORE_UNAVAILABLE", "The product journey registry is unavailable.");
  }
}

async function saveBook(previous: JourneyBook, next: JourneyBook): Promise<void> {
  const store = await getProductJourneyStore();
  next.bookRevision = previous.bookRevision + 1;
  await store.compareAndSwap(previous.organizationId, previous.productCode, previous.bookRevision, next);
}

function audit(
  book: JourneyBook,
  input: Omit<JourneyAuditRecord, "at" | "productCode">,
): JourneyAuditRecord {
  const entry: JourneyAuditRecord = {
    ...input,
    productCode: book.productCode,
    at: new Date().toISOString(),
  };
  book.audits = [...book.audits, entry];
  return entry;
}

function conditionFields(condition: JourneyCondition | undefined, into: string[]): void {
  if (!condition) return;
  switch (condition.op) {
    case "and":
    case "or":
      for (const child of condition.conditions) conditionFields(child, into);
      return;
    default:
      into.push(condition.fieldId);
  }
}

export function evaluateJourneyCondition(
  condition: JourneyCondition | undefined,
  answers: Record<string, unknown>,
): boolean {
  if (!condition) return true;
  switch (condition.op) {
    case "and":
      return condition.conditions.every((child) => evaluateJourneyCondition(child, answers));
    case "or":
      return condition.conditions.some((child) => evaluateJourneyCondition(child, answers));
    default: {
      const raw = answers[condition.fieldId];
      const present = raw != null && String(raw).trim() !== "";
      if (condition.op === "answered") return present;
      if (condition.op === "not_answered") return !present;
      if (!present && condition.op !== "not_equals") return false;
      const left = raw == null ? "" : String(raw);
      const right = condition.value == null ? "" : String(condition.value);
      if (condition.op === "equals") return left === right;
      if (condition.op === "not_equals") return left !== right;
      if (condition.op === "contains") return left.toLowerCase().includes(right.toLowerCase());
      const leftNumber = Number(left);
      const rightNumber = Number(right);
      if (!Number.isFinite(leftNumber) || !Number.isFinite(rightNumber)) return false;
      if (condition.op === "gt") return leftNumber > rightNumber;
      if (condition.op === "gte") return leftNumber >= rightNumber;
      const order = leftNumber === rightNumber ? 0 : leftNumber > rightNumber ? 1 : -1;
      if (condition.op === "lt") return order === -1;
      return order !== 1;
    }
  }
}

function hasCircularConditions(fields: JourneyFieldDraft[]): boolean {
  const graph = new Map<string, string[]>();
  for (const field of fields) {
    const refs: string[] = [];
    conditionFields(field.visibleWhen, refs);
    conditionFields(field.requiredWhen, refs);
    graph.set(field.fieldId, refs);
  }
  const state = new Map<string, "visiting" | "done">();
  const visit = (id: string): boolean => {
    const mark = state.get(id);
    if (mark === "visiting") return true;
    if (mark === "done") return false;
    state.set(id, "visiting");
    for (const next of graph.get(id) ?? []) {
      if (graph.has(next) && visit(next)) return true;
    }
    state.set(id, "done");
    return false;
  };
  for (const id of graph.keys()) {
    if (visit(id)) return true;
  }
  return false;
}

export function validateJourneyDraft(draft: JourneyDraft | null): { ok: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!draft) return { ok: false, errors: ["DRAFT_REQUIRED"] };
  if (!draft.productLabel.trim()) errors.push("PRODUCT_LABEL_REQUIRED");
  if (!draft.consentVersion.trim()) errors.push("CONSENT_VERSION_REQUIRED");
  if (draft.lodSource !== "opportunity_lod") errors.push("LOD_SOURCE_REQUIRED");
  if (!draft.recommendationBinding) errors.push("RECOMMENDATION_BINDING_REQUIRED");
  if (!draft.confirmation?.title?.trim() || !draft.confirmation?.body?.trim()) {
    errors.push("CONFIRMATION_REQUIRED");
  }
  if (!draft.stages.length) errors.push("STAGES_REQUIRED");
  const stageIds = new Set<string>();
  for (const stage of draft.stages) {
    if (!stage.stageId.trim() || !stage.label.trim()) errors.push("STAGE_LABEL_REQUIRED");
    if (stageIds.has(stage.stageId)) errors.push("DUPLICATE_STAGE");
    stageIds.add(stage.stageId);
    if (!(JOURNEY_STAGE_KINDS as readonly string[]).includes(stage.kind)) {
      errors.push("UNSUPPORTED_STAGE_KIND");
    }
  }
  const identityStage = (kind: JourneyStageKind) =>
    draft.stages.find((stage) => stage.kind === kind)?.stageId;
  const mobileStage = identityStage("mobile");
  const nameStage = identityStage("name");
  const emailStage = identityStage("email");
  const identityStages = [mobileStage, nameStage, emailStage].filter(Boolean);
  if (new Set(identityStages).size !== identityStages.length) {
    errors.push("IDENTITY_STAGES_MUST_DIFFER");
  }
  if (normalizeOtpVerification(draft.otpVerification) === "on" && !identityStage("otp")) {
    errors.push("OTP_STAGE_REQUIRED");
  }
  if (normalizeMobileCapture(draft.mobileCapture) === "required" && !mobileStage) {
    errors.push("MOBILE_STAGE_REQUIRED");
  }
  const knownFields = new Set(draft.fields.map((field) => field.fieldId));
  for (const field of draft.fields) {
    if (!field.fieldId.trim() || !field.label.trim()) errors.push("FIELD_LABEL_REQUIRED");
    if (!stageIds.has(field.stageId)) errors.push("FIELD_STAGE_MISSING");
    if (!(JOURNEY_FIELD_TYPES as readonly string[]).includes(field.fieldType)) {
      errors.push("UNSUPPORTED_FIELD_TYPE");
    }
    if (!field.purpose) errors.push("PURPOSE_REQUIRED");
    if (field.min != null && !Number.isFinite(field.min)) errors.push("FIELD_MIN_INVALID");
    if (field.max != null && !Number.isFinite(field.max)) errors.push("FIELD_MAX_INVALID");
    if (field.min != null && field.max != null && field.min > field.max) errors.push("FIELD_RANGE_INVALID");
    const refs: string[] = [];
    conditionFields(field.visibleWhen, refs);
    conditionFields(field.requiredWhen, refs);
    if (refs.some((ref) => !knownFields.has(ref) && ref !== field.fieldId)) {
      errors.push("CONDITION_UNKNOWN_FIELD");
    }
  }
  if (hasCircularConditions(draft.fields)) errors.push("CIRCULAR_CONDITION");
  const unique = [...new Set(errors)];
  if (unique.length === 0) draft.lifecycle = "validated";
  return { ok: unique.length === 0, errors: unique };
}

export async function validateProductJourneyDraft(
  organizationId: string,
  productCode: string,
  actorId: string,
): Promise<JourneyValidationResult> {
  const book = await loadBook(organizationId, productCode);
  const validation = validateJourneyDraft(book.draft);
  if (!book.draft) return validation;
  const next = structuredClone(book);
  next.draft = structuredClone(book.draft);
  if (validation.ok && next.draft) next.draft.lifecycle = "validated";
  audit(next, {
    action: "validate",
    version: next.effectiveVersion,
    previousVersion: book.effectiveVersion,
    actorId,
    validationResult: validation.ok ? "pass" : validation.errors.join(","),
    configurationHash: next.draft ? hashJourneyDefinition(next.draft) : null,
  });
  await saveBook(book, next);
  return validation;
}

export async function previewProductJourney(
  organizationId: string,
  productCode: string,
  answers: Record<string, unknown>,
  actorId = "product-journey-preview",
): Promise<JourneyPreviewResult> {
  const book = await loadBook(organizationId, productCode);
  const source = book.draft ?? book.versions.find((item) => item.journeyVersion === book.effectiveVersion);
  if (!source) {
    return {
      ok: false,
      synthetic: true,
      createdRecords: false,
      errors: ["NOTHING_TO_PREVIEW"],
      journeyVersion: null,
      stages: [],
      visibleFieldIds: [],
      missingRecommendationFieldIds: [],
      advantageEnabled: false,
      identityStages: {},
    };
  }
  if (book.draft && source === book.draft) {
    const validation = validateJourneyDraft(book.draft);
    if (!validation.ok) {
      return {
        ok: false,
        synthetic: true,
        createdRecords: false,
        errors: validation.errors,
        journeyVersion: null,
        stages: [],
        visibleFieldIds: [],
        missingRecommendationFieldIds: [],
        advantageEnabled: false,
        identityStages: {},
      };
    }
    const next = structuredClone(book);
    if (next.draft) {
      next.draft.lifecycle = "validated";
      next.draft.previewed = true;
    }
    audit(next, {
      action: "preview",
      version: next.effectiveVersion,
      previousVersion: book.effectiveVersion,
      actorId,
      validationResult: "pass",
      configurationHash: next.draft ? hashJourneyDefinition(next.draft) : null,
    });
    await saveBook(book, next);
    source.previewed = true;
  }
  const stages = governedPublicStages(
    [...source.stages].sort((a, b) => a.sequence - b.sequence),
    source.mobileCapture,
    source.otpVerification,
  );
  const visible = source.fields.filter((field) =>
    evaluateJourneyCondition(field.visibleWhen, answers),
  );
  const missing = visible.filter((field) => {
    if (field.purpose !== "recommendation") return false;
    const conditionallyRequired = field.requiredWhen
      ? evaluateJourneyCondition(field.requiredWhen, answers)
      : false;
    if (!field.required && !conditionallyRequired) return false;
    const value = answers[field.fieldId];
    return value == null || String(value).trim() === "";
  });
  return {
    ok: true,
    synthetic: true,
    createdRecords: false,
    journeyVersion: "journeyVersion" in source ? source.journeyVersion : null,
    stages: stages.map((stage) => stage.stageId),
    visibleFieldIds: visible
      .sort((a, b) => a.sequence - b.sequence)
      .map((field) => field.fieldId),
    missingRecommendationFieldIds: missing.map((field) => field.fieldId),
    advantageEnabled: source.advantageEnabled,
    identityStages: {
      mobile: stages.find((stage) => stage.kind === "mobile")?.stageId,
      name: stages.find((stage) => stage.kind === "name")?.stageId,
      email: stages.find((stage) => stage.kind === "email")?.stageId,
    },
  };
}

export async function saveProductJourneyDraft(
  organizationId: string,
  draft: JourneyDraft,
  actorId: string,
): Promise<JourneyDraft> {
  const book = await loadBook(organizationId, draft.productCode);
  const next = structuredClone(book);
  const stored = structuredClone(draft);
  stored.productCode = key(draft.productCode);
  stored.lifecycle = "draft";
  stored.previewed = false;
  stored.publiclyEnabled = draft.publiclyEnabled !== false;
  next.productCode = stored.productCode;
  next.draft = stored;
  next.publiclyEnabled = stored.publiclyEnabled;
  audit(next, {
    action: "save_draft",
    version: next.effectiveVersion,
    previousVersion: book.effectiveVersion,
    actorId,
    validationResult: "not_validated",
    configurationHash: hashJourneyDefinition(stored),
  });
  await saveBook(book, next);
  return structuredClone(stored);
}

export async function publishProductJourney(
  organizationId: string,
  productCode: string,
  actorId: string,
): Promise<JourneyMutationResult> {
  const book = await loadBook(organizationId, productCode);
  const validation = validateJourneyDraft(book.draft);
  if (!validation.ok || !book.draft) return { ok: false, errors: validation.errors };
  if (!book.draft.previewed) return { ok: false, errors: ["PREVIEW_REQUIRED"] };
  const version = book.versions.reduce((max, item) => Math.max(max, item.journeyVersion), 0) + 1;
  if (book.versions.some((item) => item.journeyVersion === version)) {
    return { ok: false, errors: ["VERSION_ALREADY_USED"] };
  }
  const now = new Date().toISOString();
  const published: PublishedJourneyDefinition = {
    ...structuredClone(book.draft),
    journeyVersion: version,
    lifecycle: "published",
    publishedAt: now,
    effectiveFrom: book.draft.effectiveFrom || now,
    publishedBy: actorId,
    configurationHash: hashJourneyDefinition(book.draft),
    sourceReference: book.draft.sourceReference,
    publiclyEnabled: book.draft.publiclyEnabled !== false,
  };
  const next = structuredClone(book);
  next.publiclyEnabled = published.publiclyEnabled;
  for (const existing of next.versions) {
    if (existing.lifecycle === "published") {
      existing.lifecycle = "superseded";
      existing.supersededAt = now;
    }
  }
  next.versions.push(published);
  next.effectiveVersion = version;
  if (next.draft) {
    next.draft.lifecycle = "draft";
    next.draft.previewed = false;
  }
  audit(next, {
    action: "publish",
    version,
    previousVersion: book.effectiveVersion,
    actorId,
    validationResult: "pass",
    configurationHash: published.configurationHash ?? null,
  });
  await saveBook(book, next);
  return { ok: true, journey: structuredClone(published) };
}

export async function rollbackProductJourney(
  organizationId: string,
  productCode: string,
  version: number,
  actorId: string,
): Promise<JourneyMutationResult> {
  const book = await loadBook(organizationId, productCode);
  const target = book.versions.find((item) => item.journeyVersion === version);
  if (!target || target.lifecycle === "retired") return { ok: false, errors: ["VERSION_NOT_RESTORABLE"] };
  const next = structuredClone(book);
  const now = new Date().toISOString();
  for (const item of next.versions) {
    if (item.lifecycle === "published") {
      item.lifecycle = "superseded";
      item.supersededAt = now;
    }
  }
  const restored = next.versions.find((item) => item.journeyVersion === version);
  if (!restored) return { ok: false, errors: ["VERSION_NOT_RESTORABLE"] };
  restored.lifecycle = "published";
  restored.retiredAt = undefined;
  next.effectiveVersion = restored.journeyVersion;
  next.publiclyEnabled = true;
  audit(next, {
    action: "rollback",
    version: restored.journeyVersion,
    previousVersion: book.effectiveVersion,
    actorId,
    validationResult: "pass",
    configurationHash: restored.configurationHash ?? null,
  });
  await saveBook(book, next);
  return { ok: true, journey: structuredClone(restored) };
}

export async function retireProductJourney(
  organizationId: string,
  productCode: string,
  actorId: string,
): Promise<JourneyRetireResult> {
  const book = await loadBook(organizationId, productCode);
  const current = book.versions.find((item) => item.journeyVersion === book.effectiveVersion);
  if (!current) return { ok: false, errors: ["NOTHING_PUBLISHED"] };
  const next = structuredClone(book);
  const retired = next.versions.find((item) => item.journeyVersion === current.journeyVersion);
  if (!retired) return { ok: false, errors: ["NOTHING_PUBLISHED"] };
  retired.lifecycle = "retired";
  retired.retiredAt = new Date().toISOString();
  next.effectiveVersion = null;
  next.publiclyEnabled = false;
  audit(next, {
    action: "retire",
    version: retired.journeyVersion,
    previousVersion: book.effectiveVersion,
    actorId,
    validationResult: "pass",
    configurationHash: retired.configurationHash ?? null,
  });
  await saveBook(book, next);
  return { ok: true };
}

export async function resolvePublishedJourney(
  organizationId: string,
  productCode: string,
  pinnedVersion: number | null,
): Promise<PublishedJourneyDefinition | null> {
  const book = await loadBook(organizationId, productCode);
  if (book.bookRevision === 0 && book.versions.length === 0) return null;
  if (pinnedVersion != null) {
    const pinned = book.versions.find((item) => item.journeyVersion === pinnedVersion);
    return pinned ? structuredClone(pinned) : null;
  }
  if (!book.publiclyEnabled || book.effectiveVersion == null) return null;
  const current = book.versions.find((item) => item.journeyVersion === book.effectiveVersion);
  if (!current || current.lifecycle !== "published") return null;
  if (current.effectiveFrom && Date.parse(current.effectiveFrom) > Date.now()) return null;
  return structuredClone(current);
}

export async function journeyPublicationState(
  organizationId: string,
  productCode: string,
): Promise<"none" | "effective" | "unavailable"> {
  const book = await loadBook(organizationId, productCode);
  if (book.versions.length === 0) return "none";
  return (await resolvePublishedJourney(organizationId, productCode, null)) ? "effective" : "unavailable";
}

export async function recordMissingJourneyPin(input: {
  organizationId: string;
  productCode: string;
  pinnedVersion: number | null;
  actorId: string;
}): Promise<void> {
  const book = await loadBook(input.organizationId, input.productCode);
  const next = structuredClone(book);
  audit(next, {
    action: "missing_pin",
    version: input.pinnedVersion,
    previousVersion: book.effectiveVersion,
    actorId: input.actorId,
    validationResult: "fail_closed",
    configurationHash: null,
  });
  await saveBook(book, next);
}

export async function setProductJourneyPublicEnabled(
  organizationId: string,
  productCode: string,
  publiclyEnabled: boolean,
  actorId: string,
): Promise<JourneyPublicResult> {
  const book = await loadBook(organizationId, productCode);
  const next = structuredClone(book);
  next.publiclyEnabled = publiclyEnabled;
  if (next.draft) next.draft.publiclyEnabled = publiclyEnabled;
  audit(next, {
    action: "set_public",
    version: next.effectiveVersion,
    previousVersion: book.effectiveVersion,
    actorId,
    validationResult: publiclyEnabled ? "enabled" : "disabled",
    configurationHash: null,
  });
  await saveBook(book, next);
  return { publiclyEnabled };
}

export async function readProductJourneyAdmin(
  organizationId: string,
  productCode: string,
): Promise<JourneyAdminView> {
  const book = await loadBook(organizationId, productCode);
  const published = book.versions.find((item) => item.journeyVersion === book.effectiveVersion) ?? null;
  return {
    draft: book.draft ? structuredClone(book.draft) : null,
    effectiveVersion: book.effectiveVersion,
    publiclyEnabled: book.publiclyEnabled,
    bookRevision: book.bookRevision,
    audits: book.audits,
    published: published ? structuredClone(published) : null,
    versions: book.versions.map((version) => ({
      journeyVersion: version.journeyVersion,
      lifecycle: version.lifecycle,
      publishedAt: version.publishedAt,
      effectiveFrom: version.effectiveFrom,
      configurationHash: version.configurationHash,
      publishedBy: version.publishedBy,
    })),
  };
}

/** Generic presentation of a published definition. Product code selects the definition only. */
export function renderPublishedJourney(definition: PublishedJourneyDefinition): {
  productCode: string;
  productLabel: string;
  journeyVersion: number;
  stages: string[];
  questions: { fieldId: string; stageId: string; sequence: number; label: string }[];
} {
  const stages = [...definition.stages].sort((a, b) => a.sequence - b.sequence);
  const questions = [...definition.fields].sort((a, b) => a.sequence - b.sequence);
  return {
    productCode: definition.productCode,
    productLabel: definition.productLabel,
    journeyVersion: definition.journeyVersion,
    stages: stages.map((stage) => stage.stageId),
    questions: questions.map((field) => ({
      fieldId: field.fieldId,
      stageId: field.stageId,
      sequence: field.sequence,
      label: field.label,
    })),
  };
}

const STAGE_KIND_BY_ID: Record<string, JourneyStageKind> = {
  welcome: "welcome",
  mobile: "mobile",
  otp: "otp",
  displayName: "name",
  recommendation: "questions",
  analysing: "analysing",
  lenders: "lenders",
  advantage: "advantage",
  email: "email",
  application: "questions",
  review: "review",
  documents: "documents",
  confirmation: "confirmation",
};

function canonicalFieldType(fieldType: string): JourneyFieldType {
  if (fieldType === "tel") return "mobile";
  if (fieldType === "select") return "single_select";
  if (fieldType === "city") return "location";
  if (fieldType === "text") return "short_text";
  if ((JOURNEY_FIELD_TYPES as readonly string[]).includes(fieldType)) return fieldType as JourneyFieldType;
  return "short_text";
}

function stageForProjectedField(field: { fieldId: string; purpose?: string }): string {
  if (field.fieldId === "mobile" || field.fieldId === "mobilePrimary") return "mobile";
  if (field.fieldId === "displayName" || field.fieldId === "fullName") return "displayName";
  if (field.fieldId === "personalEmail" || field.fieldId === "email") return "email";
  if (field.purpose === "recommendation") return "recommendation";
  if (field.purpose === "document") return "documents";
  return "application";
}

type ProjectedJourneyField = {
  fieldId: string;
  label: string;
  helpText?: string;
  fieldType: string;
  required: boolean;
  sequence: number;
  options?: { value: string; label: string }[];
  purpose?: JourneyFieldDraft["purpose"];
  visibleWhenField?: string;
  visibleWhenValues?: string[];
  requiredWhenField?: string;
  requiredWhenValues?: string[];
  notRequiredWhenFilled?: string[];
  min?: number;
  max?: number;
};

/**
 * Builds a draft from an IDC projection. It does not publish.
 * A config/read request must never call this.
 */
export function buildJourneyDraftFromProjection(input: {
  productCode: string;
  productLabel: string;
  advantageEnabled: boolean;
  stageIds: string[];
  fields: ProjectedJourneyField[];
}): JourneyDraft {
  const stages: JourneyStageDraft[] = input.stageIds.map((stageId, index) => ({
    stageId,
    kind: STAGE_KIND_BY_ID[stageId] ?? "questions",
    label: stageId,
    sequence: index + 1,
  }));
  const knownFieldIds = new Set(input.fields.map((field) => field.fieldId));
  const fields: JourneyFieldDraft[] = input.fields.map((field) => {
    const visibleValues = field.visibleWhenValues ?? [];
    const visibleWhen: JourneyCondition | undefined =
      field.visibleWhenField && knownFieldIds.has(field.visibleWhenField)
        ? visibleValues.length <= 1
          ? { op: "equals", fieldId: field.visibleWhenField, value: visibleValues[0] ?? "" }
          : {
              op: "or",
              conditions: visibleValues.map((value) => ({
                op: "equals" as const,
                fieldId: field.visibleWhenField as string,
                value,
              })),
            }
        : undefined;
    const requiredValues = field.requiredWhenValues ?? [];
    const requiredWhen: JourneyCondition | undefined =
      field.requiredWhenField && knownFieldIds.has(field.requiredWhenField)
        ? requiredValues.length <= 1
          ? { op: "equals", fieldId: field.requiredWhenField, value: requiredValues[0] ?? "" }
          : {
              op: "or",
              conditions: requiredValues.map((value) => ({
                op: "equals" as const,
                fieldId: field.requiredWhenField as string,
                value,
              })),
            }
        : undefined;
    return {
      fieldId: field.fieldId,
      stageId: stageForProjectedField(field),
      label: field.label,
      helpText: field.helpText,
      fieldType: canonicalFieldType(field.fieldType),
      required: field.required,
      sequence: field.sequence,
      options: field.options,
      purpose: field.purpose ?? "",
      visibleWhen,
      requiredWhen,
      notRequiredWhenFilled: field.notRequiredWhenFilled,
      includeOnReview: true,
      min: field.min,
      max: field.max,
    };
  });
  return {
    productCode: input.productCode,
    productLabel: input.productLabel,
    lifecycle: "draft",
    previewed: false,
    publiclyEnabled: true,
    advantageEnabled: input.advantageEnabled,
    recommendationBinding: "governed_chanakya",
    consentVersion: "compass-consent-v1",
    lodSource: "opportunity_lod",
    mobileCapture: "required",
    otpVerification: "off",
    sourceReference: "enterprise-initial-data-collection",
    confirmation: {
      title: "Application received",
      body: "Your application reference is ready. Document requirements come from the Opportunity checklist.",
    },
    stages,
    fields,
  };
}

export async function importJourneyDraft(input: {
  organizationId: string;
  actorId: string;
  draft: JourneyDraft;
}): Promise<JourneyImportResult> {
  const book = await loadBook(input.organizationId, input.draft.productCode);
  if (book.versions.length > 0) {
    return { imported: false, alreadyPublished: true };
  }
  if (book.draft) {
    return { imported: false, alreadyPublished: false };
  }
  await saveProductJourneyDraft(input.organizationId, input.draft, input.actorId);
  return { imported: true, alreadyPublished: false };
}
