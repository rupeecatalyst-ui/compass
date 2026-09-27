/**
 * Focused proof for Field Control draft creation.
 * Does not connect to a database and does not insert allowlisted rows.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DRAFT_SOURCE_ALLOWLIST, listDraftSourceAllowlistEntries } from "./draft-source-allowlist";
import {
  CREATE_FIELD_SAFETY_COPY,
  draftOwnershipReviewLabel,
} from "./draft-creation-presentation";
import {
  createCertifiedFieldControlDraft,
  fieldControlDraftId,
  type DraftConflictWhere,
  type FieldControlDraftInsert,
} from "./production-governance-create";
import {
  projectCertifiedFieldControlDefinition,
  type CertifiedFieldControlRecord,
} from "./production-governance-read";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const checks: Array<[string, boolean]> = [];

function check(name: string, passed: boolean): void {
  checks.push([name, passed]);
  assert.equal(passed, true, name);
}

function unauthorized(): never {
  throw {
    status: 401,
    body: { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } },
  };
}

function request(body?: unknown): Request {
  return new Request("https://catalyst.local/api/admin/field-control-definitions/drafts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function copy(label = "PAN") {
  return {
    friendlyLabel: label,
    description: "Governance description for this existing source.",
    helpText: "Help text does not change capture.",
    validationSummary: "Validation note. FCM does not capture the value.",
    presentationSummary: "Presentation note only.",
  };
}

function validBody(overrides: Record<string, unknown> = {}) {
  return {
    mode: "raw_canonical",
    allowlistEntryId: "contact.pan",
    ...copy(),
    ...overrides,
  };
}

function rowFromInsert(data: FieldControlDraftInsert): CertifiedFieldControlRecord {
  return {
    ...data,
    createdAt: new Date("2026-09-27T00:00:00.000Z"),
    updatedAt: new Date("2026-09-27T00:00:00.000Z"),
  };
}

function bindingKey(value: unknown): string {
  return JSON.stringify(value);
}

function matches(row: CertifiedFieldControlRecord, where: DraftConflictWhere): boolean {
  if (where.OR) {
    return where.OR.some((item) => (item.id !== undefined && row.id === item.id) || (item.fieldId !== undefined && row.fieldId === item.fieldId));
  }
  if (where.sourceBindingJson) {
    return bindingKey(row.sourceBindingJson) === bindingKey(where.sourceBindingJson.equals);
  }
  return false;
}

function memoryStore(initial: CertifiedFieldControlRecord[] = []) {
  const rows = [...initial];
  let creates = 0;
  return {
    get creates() {
      return creates;
    },
    rows,
    delegate: {
      findFirst: async ({ where }: { where: DraftConflictWhere }) => rows.find((row) => matches(row, where)) ?? null,
      create: async ({ data }: { data: FieldControlDraftInsert }) => {
        creates += 1;
        const row = rowFromInsert(data);
        rows.push(row);
        return row;
      },
    },
  };
}

async function createAs(
  role: string,
  userId: string,
  body: unknown,
  store = memoryStore(),
) {
  const result = await createCertifiedFieldControlDraft(request(body), {
    authenticate: () => ({ role, userId }),
    findFirst: store.delegate.findFirst,
    create: store.delegate.create,
  });
  return { result, store };
}

function existing(overrides: Partial<CertifiedFieldControlRecord> = {}): CertifiedFieldControlRecord {
  const fieldId = overrides.fieldId ?? "contact.pan";
  return {
    ...rowFromInsert({
      id: fieldControlDraftId(fieldId),
      fieldId,
      lineageId: fieldId,
      versionNumber: 1,
      previousVersionId: null,
      friendlyLabel: "Existing",
      description: "Already stored.",
      helpText: "Already stored.",
      fieldType: "text",
      classification: "raw_canonical",
      owningDomain: "contact",
      ownershipReview: "owner_requires_product_decision",
      sourceBindingJson: { kind: "column", model: "EcmContact", field: "pan" },
      aliasesJson: [],
      lifecycleStatus: "draft",
      productApplicabilityJson: [],
      customerCategoryApplicabilityJson: [],
      applicabilityDeclared: false,
      authorisedConsumersJson: [],
      validationSummary: "Stored.",
      presentationSummary: "Stored.",
      selectOptionSource: null,
      selectOptionKeysJson: [],
      currencyUnitsJson: [],
      candidateMirrorOf: null,
      controlsRuntime: false,
      customerFacingActivation: false,
      makerUserId: "earlier-user",
      checkerUserId: null,
      effectiveFrom: null,
      effectiveUntil: null,
    }),
    ...overrides,
  };
}

function blob(path: string): { bytes: number; sha256: string } {
  const bytes = execFileSync("git", ["cat-file", "blob", `HEAD:${path}`], { cwd: repoRoot });
  return {
    bytes: bytes.length,
    sha256: createHash("sha256").update(bytes).digest("hex").toUpperCase(),
  };
}

async function main(): Promise<void> {
  const missingAuth = await createCertifiedFieldControlDraft(request(validBody()), {
    authenticate: () => unauthorized(),
    findFirst: async () => {
      throw new Error("findFirst must not run");
    },
    create: async () => {
      throw new Error("create must not run");
    },
  });
  check("missing_auth_is_401", missingAuth.ok === false && missingAuth.status === 401 && missingAuth.code === "UNAUTHORIZED");

  const outsider = await createAs("ANALYST", "user-1", validBody());
  check("non_admin_is_403", outsider.result.ok === false && outsider.result.status === 403 && outsider.result.code === "FORBIDDEN");
  check("non_admin_does_not_insert", outsider.store.creates === 0);

  const blankUser = await createAs("ADMIN", "   ", validBody());
  check("blank_user_does_not_insert", blankUser.result.ok === false && blankUser.result.status === 401 && blankUser.store.creates === 0);

  const unknownProperty = await createAs("ADMIN", "user-1", { ...validBody(), controlsRuntime: false });
  check("unknown_property_is_400", unknownProperty.result.ok === false && unknownProperty.result.status === 400 && unknownProperty.store.creates === 0);

  const freeModel = await createAs("ADMIN", "user-1", { ...validBody(), model: "EcmContact" });
  check("free_typed_model_is_400", freeModel.result.ok === false && freeModel.result.status === 400 && freeModel.store.creates === 0);

  const freeField = await createAs("ADMIN", "user-1", { ...validBody(), field: "pan" });
  check("free_typed_field_is_400", freeField.result.ok === false && freeField.result.status === 400 && freeField.store.creates === 0);

  const freeCalculator = await createAs("SUPER_ADMIN", "user-1", { ...validBody(), calculator: "calculateSalariedFoir" });
  check("free_typed_calculator_is_400", freeCalculator.result.ok === false && freeCalculator.result.status === 400 && freeCalculator.store.creates === 0);

  const unknownEntry = await createAs("ADMIN", "user-1", validBody({ allowlistEntryId: "contact.notRegistered" }));
  check("unknown_allowlist_is_400", unknownEntry.result.ok === false && unknownEntry.result.status === 400 && unknownEntry.store.creates === 0);

  const duplicateField = await createAs("ADMIN", "user-1", validBody(), memoryStore([existing({})]));
  check(
    "duplicate_field_id_is_409",
    duplicateField.result.ok === false &&
      duplicateField.result.status === 409 &&
      duplicateField.result.code === "FIELD_CONTROL_IDENTITY_CONFLICT" &&
      duplicateField.store.creates === 0,
  );

  const duplicateColumn = await createAs(
    "ADMIN",
    "user-1",
    validBody(),
    memoryStore([
      existing({
        id: "fcm:other.pan:v1",
        fieldId: "other.pan",
        lineageId: "other.pan",
        sourceBindingJson: { kind: "column", model: "EcmContact", field: "pan" },
      }),
    ]),
  );
  check("duplicate_column_is_409", duplicateColumn.result.ok === false && duplicateColumn.result.status === 409 && duplicateColumn.store.creates === 0);

  const duplicateCalculator = await createAs(
    "ADMIN",
    "user-1",
    validBody({ mode: "derived", allowlistEntryId: "derived:foirPercent", friendlyLabel: "FOIR" }),
    memoryStore([
      existing({
        id: "fcm:other.foir:v1",
        fieldId: "other.foir",
        lineageId: "other.foir",
        classification: "derived",
        owningDomain: "derived_engine",
        fieldType: "percentage",
        sourceBindingJson: { kind: "derived_calculator", calculatorId: "calculateSalariedFoir" },
      }),
    ]),
  );
  check(
    "duplicate_calculator_is_409",
    duplicateCalculator.result.ok === false && duplicateCalculator.result.status === 409 && duplicateCalculator.store.creates === 0,
  );

  const uniqueRace = await createCertifiedFieldControlDraft(request(validBody()), {
    authenticate: () => ({ role: "ADMIN", userId: "user-1" }),
    findFirst: async () => null,
    create: async () => {
      const error = new Error("Unique constraint failed") as Error & { code: string };
      error.code = "P2002";
      throw error;
    },
  });
  check("p2002_is_409", uniqueRace.ok === false && uniqueRace.status === 409 && uniqueRace.code === "FIELD_CONTROL_IDENTITY_CONFLICT");

  const sharedLabel = memoryStore();
  const firstLabel = await createAs("ADMIN", "maker-1", validBody({ allowlistEntryId: "contact.personalEmail", friendlyLabel: "Email address" }), sharedLabel);
  const secondLabel = await createAs("ADMIN", "maker-1", validBody({ allowlistEntryId: "contact.officialEmail", friendlyLabel: "Email address" }), sharedLabel);
  check(
    "same_label_is_not_a_conflict",
    firstLabel.result.ok === true && secondLabel.result.ok === true && sharedLabel.creates === 2 && sharedLabel.rows[0]?.fieldId !== sharedLabel.rows[1]?.fieldId,
  );

  const raw = await createAs("SUPER_ADMIN", "maker-42", validBody());
  check("raw_create_is_201", raw.result.ok === true && raw.result.status === 201 && raw.store.creates === 1);
  if (raw.result.ok) {
    const definition = raw.result.data.definition;
    const inserted = raw.store.rows[0];
    check("raw_id", definition.id === "fcm:contact.pan:v1" && inserted?.id === definition.id);
    check("raw_lineage", definition.lineageId === definition.fieldId && definition.fieldId === "contact.pan");
    check("raw_version", definition.versionNumber === 1 && definition.previousVersionId === null);
    check("raw_lifecycle", definition.lifecycleStatus === "draft");
    check("raw_ownership", definition.ownershipReview === "owner_requires_product_decision");
    check("raw_runtime_off", definition.controlsRuntime === false && definition.customerFacingActivation === false);
    check("raw_applicability_off", definition.applicabilityDeclared === false);
    check(
      "raw_arrays_empty",
      definition.productApplicability.length === 0 &&
        definition.customerCategoryApplicability.length === 0 &&
        definition.authorisedConsumers.length === 0 &&
        definition.aliases.length === 0,
    );
    check("raw_checker_and_dates", definition.checkerUserId === null && definition.effectiveFrom === null && definition.effectiveUntil === null);
    check("raw_maker", definition.makerUserId === "maker-42");
    check(
      "raw_binding",
      definition.sourceBinding.kind === "column" && definition.sourceBinding.model === "EcmContact" && definition.sourceBinding.field === "pan",
    );
    check("raw_projector_kind", projectCertifiedFieldControlDefinition(inserted!).sourceBinding.kind === "column");
  }

  const derived = await createAs("ADMIN", "maker-7", validBody({ mode: "derived", allowlistEntryId: "derived:foirPercent", friendlyLabel: "FOIR" }));
  check("derived_create_is_201", derived.result.ok === true && derived.result.status === 201);
  if (derived.result.ok) {
    const definition = derived.result.data.definition;
    check("derived_locked_state", definition.lifecycleStatus === "draft" && definition.ownershipReview === "owner_requires_product_decision" && definition.controlsRuntime === false && definition.customerFacingActivation === false && definition.applicabilityDeclared === false && definition.makerUserId === "maker-7" && definition.checkerUserId === null && definition.versionNumber === 1 && definition.lineageId === "derived:foirPercent" && definition.id === "fcm:derived:foirPercent:v1");
    check(
      "derived_binding",
      definition.sourceBinding.kind === "derived_calculator" && definition.sourceBinding.calculatorId === "calculateSalariedFoir",
    );
    check("derived_projector_kind", projectCertifiedFieldControlDefinition(derived.store.rows[0]!).sourceBinding.kind === "derived_calculator");
    check("derived_not_unrecognized", definition.sourceBinding.kind !== "unrecognized");
  }

  check("allowlist_count", DRAFT_SOURCE_ALLOWLIST.length === 11);
  check("raw_allowlist_count", listDraftSourceAllowlistEntries("raw_canonical").length === 10);
  check("derived_allowlist_count", listDraftSourceAllowlistEntries("derived").length === 1);
  const certifiedFieldIds = [
    "contact.dateOfBirth",
    "contact.name",
    "contact.mobilePrimary",
    "opportunity.requestedAmount",
    "opportunity.productCode",
    "opportunity.employmentTypeCode",
    "opportunity.cityLabel",
    "opportunity.stateLabel",
    "derived:proposedEmiRupees",
    "derived:effectiveTenureMonths",
    "derived:assessedOfferRupees",
    "derived:btSavingsRupees",
  ];
  check(
    "certified_rows_are_not_allowlisted",
    certifiedFieldIds.every((fieldId) => !DRAFT_SOURCE_ALLOWLIST.some((entry) => entry.fieldId === fieldId)),
  );

  const dialog = readFileSync(join(repoRoot, "src/components/catalyst-one/field-control-master/create-field-draft-dialog.tsx"), "utf8");
  const presentation = readFileSync(join(here, "draft-creation-presentation.ts"), "utf8");
  const page = readFileSync(join(repoRoot, "src/app/(dashboard)/admin/field-control-master/page.tsx"), "utf8");
  check("safety_sentence", CREATE_FIELD_SAFETY_COPY === "Creating a field definition does not change application behaviour." && dialog.includes("CREATE_FIELD_SAFETY_COPY") && presentation.includes(CREATE_FIELD_SAFETY_COPY));
  check("design_new_field_disabled", dialog.includes('data-design-new-field="disabled"') && dialog.includes("disabled") && dialog.includes("DESIGN_NEW_FIELD_NOTE"));
  check("only_save_draft_submits", dialog.includes('type="submit"') && dialog.includes("SAVE_DRAFT_LABEL") && dialog.split('type="submit"').length === 2);
  for (const forbidden of ["Activate", "Publish", "Approve", "Submit for review"]) {
    check(`ui_has_no_${forbidden.replace(/[^a-z]+/gi, "_")}`, !dialog.includes(forbidden) && !presentation.includes(forbidden));
  }
  check("no_runtime_toggle", !dialog.includes("controlsRuntime") && !dialog.includes("customerFacingActivation") && !dialog.includes("applicabilityDeclared"));
  check("picker_uses_allowlist", dialog.includes("listDraftSourceAllowlistEntries") && !dialog.includes("listFieldControlDefinitions"));
  check("ownership_label", draftOwnershipReviewLabel() === "Owner requires product decision" && dialog.includes("draftOwnershipReviewLabel()") && !dialog.includes("Certified binding"));
  check("page_keeps_frozen_view", page.includes("FieldControlMasterView") && page.includes("CreateFieldDraftDialog") && !page.includes("field-control-master-view"));

  const createSource = [
    readFileSync(join(here, "production-governance-create.ts"), "utf8"),
    readFileSync(join(repoRoot, "src/app/api/admin/field-control-definitions/drafts/route.ts"), "utf8"),
  ].join("\n");
  check("no_registry_fallback", !createSource.includes("listFieldControlDefinitions") && !createSource.includes("./registry"));
  check("route_is_post_only", createSource.includes("export async function POST") && !createSource.includes("export async function GET") && !createSource.includes("export async function PATCH") && !createSource.includes("export async function PUT") && !createSource.includes("export async function DELETE"));
  const executable = createSource
    .split("\n")
    .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*") && !line.trim().startsWith("/*"))
    .join("\n");
  for (const forbidden of ["update(", "updateMany(", "upsert(", "delete(", "deleteMany(", "$executeRaw", "$queryRaw", "migrate"]) {
    check(`create_has_no_${forbidden.replace(/[^a-z]/gi, "_")}`, !executable.includes(forbidden));
  }

  const view = readFileSync(join(repoRoot, "src/components/catalyst-one/field-control-master/field-control-master-view.tsx"), "utf8");
  const lifecycleActions = readFileSync(join(repoRoot, "src/components/catalyst-one/field-control-master/governed-field-lifecycle-actions.tsx"), "utf8");
  check("create_service_has_no_lifecycle_writer", !createSource.includes("submitCertifiedFieldControlReview") && !createSource.includes("decideCertifiedFieldControlReview"));
  check("view_does_not_call_draft_create", !view.includes("createCertifiedFieldControlDraft") && !view.includes("/drafts"));
  check("lifecycle_actions_do_not_create_drafts", !lifecycleActions.includes("createCertifiedFieldControlDraft") && !lifecycleActions.includes("DRAFT_SOURCE_ALLOWLIST") && !lifecycleActions.includes("allowlistEntryId"));
  check("v15_create_files_unchanged", execFileSync("git", ["diff", "--name-only", "HEAD", "--", "src/lib/field-control-master/production-governance-create.ts", "src/app/api/admin/field-control-definitions/drafts/route.ts", "src/lib/field-control-master/draft-source-allowlist.ts"], { cwd: repoRoot, encoding: "utf8" }).trim() === "");

  const frozen: Array<[string, number, string]> = [
    ["src/lib/field-control-master/production-governance-read.ts", 17317, "CF53CA32E8EEE09BDF9F2F9722565D6D4AB70709E351FE7000B30A2380E089E3"],
    ["src/lib/field-control-master/production-governance-read-proof.ts", 10594, "F9A167562C8B34B369DB7D20B7D2E7F855B951840FC6759272E5AA42C9CC17ED"],
    ["src/app/api/admin/field-control-definitions/route.ts", 1109, "14616E66451E485A0F281F26D36753F5FB8F5532D91477CB1A01B81754516EBB"],
    ["src/app/api/admin/field-control-definitions/[id]/route.ts", 1243, "653A3D36236641C06BD1CE93AE15B3EE772D71AE2FE9ADC1E32E84CE5D4081CD"],
    ["src/lib/field-control-master/governance-presentation.ts", 12873, "7AC01ED6F8FB9A5D59AAB22DD9F876B73827BEA369329C15642508BF0A90B304"],
    ["prisma/migrations/20260926180000_field_control_master_foundation_v1/migration.sql", 3660, "1B05A9EAE8A0AD7A0227BF2847D51A2E39DEA1F96AACCE1C11CD2F6CBB8B3E5D"],
    ["src/lib/field-control-master/foundation-v1-2-seed.sql", 44107, "BAE4E1E80AA1869783948C559F2966FF93DB627DEBD274A52C3DE7B2CC50D352"],
    ["src/lib/field-control-master/foundation-v1-2-verification.sql", 6595, "B4A7905C34168C6484B98CDA2EA44E8EDEA9084C02CDE73D87A062F0A347B3E9"],
    ["src/lib/field-control-master/foundation-v1-3-derived-seed.sql", 42569, "A815AA6084D68044DF0BCA53193A5A3A521438BBB8E6DEEF54568CD4DEF0913A"],
    ["src/lib/field-control-master/foundation-v1-3-derived-verification.sql", 20192, "A8692233C8B32743CCBC0E4FEF8EFA9293A9853F26EB7105D2A7D7B1F8678D63"],
  ];
  for (const [path, bytes, sha256] of frozen) {
    const actual = blob(path);
    check(`frozen_${path.split("/").pop()}`, actual.bytes === bytes && actual.sha256 === sha256);
  }
  const diff = execFileSync("git", ["diff", "--name-only", "HEAD", "--", ...frozen.map(([path]) => path)], { cwd: repoRoot, encoding: "utf8" });
  check("frozen_worktree_diff_empty", diff.trim() === "");

  const failed = checks.filter(([, passed]) => !passed);
  console.log(`FIELD_CONTROL_DRAFT_CREATE_PROOF PASS checks=${checks.length} failed=${failed.length}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
