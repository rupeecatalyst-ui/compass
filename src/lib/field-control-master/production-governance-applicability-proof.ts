/**
 * Focused proof for V1.7 product applicability versions.
 * Does not connect to a database and does not modify a production row.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { CANONICAL_PRODUCT_MASTER_SEED } from "@/constants/enterprise-product-master/canonical-catalog";
import {
  canonicalEnterpriseProductCodes,
  createCertifiedFieldApplicabilityVersion,
  type FieldControlApplicabilityInsert,
} from "./production-governance-applicability";
import { submitCertifiedFieldControlReview } from "./production-governance-lifecycle";
import type { CertifiedFieldControlRecord } from "./production-governance-read";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const checks: Array<[string, boolean]> = [];
const STAMP = "2026-09-27T12:00:00.000Z";
const KNOWN = canonicalEnterpriseProductCodes();

function check(name: string, passed: boolean): void {
  checks.push([name, passed]);
  assert.equal(passed, true, name);
}

function request(body?: unknown): Request {
  return new Request("https://catalyst-one.local/applicability-version", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
}

function approved(overrides: Partial<CertifiedFieldControlRecord> = {}): CertifiedFieldControlRecord {
  return {
    id: "fcm:contact.pan:v1",
    fieldId: "contact.pan",
    lineageId: "contact.pan",
    versionNumber: 1,
    previousVersionId: null,
    friendlyLabel: "PAN",
    description: "Permanent account number.",
    helpText: "Governance help.",
    fieldType: "text",
    classification: "raw_canonical",
    owningDomain: "contact",
    ownershipReview: "owner_requires_product_decision",
    sourceBindingJson: { kind: "column", model: "EcmContact", field: "pan" },
    aliasesJson: ["pan_alias"],
    lifecycleStatus: "approved",
    productApplicabilityJson: [],
    customerCategoryApplicabilityJson: [],
    applicabilityDeclared: false,
    authorisedConsumersJson: ["contact_registry"],
    validationSummary: "Stored on the contact.",
    presentationSummary: "Shown as entered.",
    selectOptionSource: "identity_options",
    selectOptionKeysJson: ["pan"],
    currencyUnitsJson: ["rupees"],
    candidateMirrorOf: null,
    controlsRuntime: false,
    customerFacingActivation: false,
    makerUserId: "original-maker",
    checkerUserId: "original-checker",
    effectiveFrom: null,
    effectiveUntil: null,
    createdAt: new Date(STAMP),
    updatedAt: new Date(STAMP),
    ...overrides,
  };
}

function memory(initial: CertifiedFieldControlRecord[], options?: { uniqueConflict?: boolean }) {
  const rows = initial.map((item) => ({ ...item }));
  const creates: FieldControlApplicabilityInsert[] = [];
  const sourceSnapshot = JSON.stringify(rows[0] ?? null);
  return {
    rows,
    creates,
    sourceSnapshot,
    delegate: {
      findUnique: async ({ where }: { where: { id: string } }) => rows.find((item) => item.id === where.id) ?? null,
      findMany: async ({ where }: { where: { fieldId: string } }) => rows.filter((item) => item.fieldId === where.fieldId),
      create: async ({ data }: { data: FieldControlApplicabilityInsert }) => {
        creates.push(data);
        if (options?.uniqueConflict || rows.some((item) => item.id === data.id || (item.fieldId === data.fieldId && item.versionNumber === data.versionNumber))) {
          throw { code: "P2002" };
        }
        const created: CertifiedFieldControlRecord = {
          ...data,
          createdAt: new Date(STAMP),
          updatedAt: new Date("2026-09-27T12:05:00.000Z"),
        };
        rows.push(created);
        return created;
      },
    },
  };
}

async function propose(
  role: string,
  userId: string,
  body: unknown,
  store: ReturnType<typeof memory>,
  id = "fcm:contact.pan:v1",
) {
  const result = await createCertifiedFieldApplicabilityVersion(request(body), id, {
    authenticate: () => {
      if (!role) {
        throw { status: 401, body: { success: false, error: { code: "UNAUTHORIZED", message: "Authentication required" } } };
      }
      return { role, userId };
    },
    findUnique: store.delegate.findUnique,
    findMany: store.delegate.findMany,
    create: store.delegate.create,
    knownProductCodes: KNOWN,
  });
  return { result, store };
}

async function main(): Promise<void> {
  check("canonical_codes_include_home_loan", KNOWN.includes("HOME_LOAN") && !KNOWN.includes("HL") && !KNOWN.includes("product:home-loan"));

  const missingAuth = await propose("", "maker-2", { productCodes: ["HOME_LOAN"], expectedUpdatedAt: STAMP }, memory([approved()]));
  check("missing_auth_is_401", missingAuth.result.ok === false && missingAuth.result.status === 401 && missingAuth.store.creates.length === 0);

  const viewer = await propose("ANALYST", "maker-2", { productCodes: ["HOME_LOAN"], expectedUpdatedAt: STAMP }, memory([approved()]));
  check("non_admin_is_403", viewer.result.ok === false && viewer.result.status === 403 && viewer.store.creates.length === 0);

  const blank = await propose("ADMIN", "  ", { productCodes: ["HOME_LOAN"], expectedUpdatedAt: STAMP }, memory([approved()]));
  check("blank_actor_is_401", blank.result.ok === false && blank.result.status === 401 && blank.store.creates.length === 0);

  const unknownProp = await propose("ADMIN", "maker-2", { productCodes: ["HOME_LOAN"], expectedUpdatedAt: STAMP, makerUserId: "forged" }, memory([approved()]));
  check("unknown_property_is_400", unknownProp.result.ok === false && unknownProp.result.status === 400 && unknownProp.store.creates.length === 0);

  const emptyProducts = await propose("ADMIN", "maker-2", { productCodes: [], expectedUpdatedAt: STAMP }, memory([approved()]));
  check("empty_products_rejected", emptyProducts.result.ok === false && emptyProducts.result.status === 400 && emptyProducts.store.creates.length === 0);

  const alias = await propose("ADMIN", "maker-2", { productCodes: ["HL"], expectedUpdatedAt: STAMP }, memory([approved()]));
  check("alias_rejected", alias.result.ok === false && alias.result.status === 400 && alias.store.creates.length === 0);

  const edieKey = await propose("ADMIN", "maker-2", { productCodes: ["product:home-loan"], expectedUpdatedAt: STAMP }, memory([approved()]));
  check("edie_key_rejected", edieKey.result.ok === false && edieKey.result.status === 400 && edieKey.store.creates.length === 0);

  const freeTyped = await propose("ADMIN", "maker-2", { productCodes: ["NOT_A_PRODUCT"], expectedUpdatedAt: STAMP }, memory([approved()]));
  check("unknown_product_rejected", freeTyped.result.ok === false && freeTyped.result.status === 400 && freeTyped.store.creates.length === 0);

  const created = await propose("SUPER_ADMIN", "maker-2", { productCodes: ["HOME_LOAN", "HOME_LOAN_BT"], expectedUpdatedAt: STAMP }, memory([approved()]));
  check("proposal_created", created.result.ok === true && created.result.status === 201);
  const next = created.result.ok ? created.result.data.definition : null;
  const source = created.store.rows[0];
  const stored = created.store.rows[1];
  check("source_not_mutated", created.store.sourceSnapshot === JSON.stringify(source) && source?.lifecycleStatus === "approved" && source.versionNumber === 1);
  check("single_create", created.store.creates.length === 1);
  check("version_identity", next?.id === "fcm:contact.pan:v2" && next?.versionNumber === 2 && next?.previousVersionId === "fcm:contact.pan:v1");
  check("lineage_preserved", next?.fieldId === "contact.pan" && next?.lineageId === "contact.pan");
  check("binding_preserved", JSON.stringify(stored?.sourceBindingJson) === JSON.stringify(source?.sourceBindingJson));
  check("classification_preserved", next?.classification === "raw_canonical");
  check("domain_preserved", next?.owningDomain === "contact");
  check("type_preserved", next?.fieldType === "text");
  check("products_validated", JSON.stringify(next?.productApplicability) === JSON.stringify(["HOME_LOAN", "HOME_LOAN_BT"]));
  check("declaration_is_explicit", next?.applicabilityDeclared === true && created.store.creates[0]?.applicabilityDeclared === true);
  check("customer_categories_preserved", JSON.stringify(next?.customerCategoryApplicability) === JSON.stringify([]));
  check("consumers_preserved", JSON.stringify(next?.authorisedConsumers) === JSON.stringify(["contact_registry"]));
  check("aliases_and_units_preserved", JSON.stringify(next?.aliases) === JSON.stringify(["pan_alias"]) && JSON.stringify(next?.currencyUnits) === JSON.stringify(["rupees"]) && JSON.stringify(next?.selectOptionKeys) === JSON.stringify(["pan"]));
  check("maker_is_actor", next?.makerUserId === "maker-2" && source?.makerUserId === "original-maker");
  check("checker_null", next?.checkerUserId === null);
  check("draft_lifecycle", next?.lifecycleStatus === "draft");
  check("effective_dates_null", next?.effectiveFrom === null && next?.effectiveUntil === null);
  check("runtime_off", next?.controlsRuntime === false && next?.customerFacingActivation === false);
  check("ownership_preserved", next?.ownershipReview === "owner_requires_product_decision");

  const certified = await propose("ADMIN", "maker-2", { productCodes: ["HOME_LOAN"], expectedUpdatedAt: STAMP }, memory([approved({ ownershipReview: "certified_binding" })]));
  check("certified_binding_excluded", certified.result.ok === false && certified.result.status === 409 && certified.store.creates.length === 0);

  for (const lifecycleStatus of ["draft", "checker_review", "active", "superseded", "inactive"] as const) {
    const blocked = await propose("ADMIN", "maker-2", { productCodes: ["HOME_LOAN"], expectedUpdatedAt: STAMP }, memory([approved({ lifecycleStatus })]));
    check(`blocked_${lifecycleStatus}`, blocked.result.ok === false && blocked.result.status === 409 && blocked.store.creates.length === 0);
  }

  const stale = await propose("ADMIN", "maker-2", { productCodes: ["HOME_LOAN"], expectedUpdatedAt: "2026-09-27T11:00:00.000Z" }, memory([approved()]));
  check("stale_source_rejected", stale.result.ok === false && stale.result.status === 409 && stale.store.creates.length === 0);

  const raced = await propose("ADMIN", "maker-2", { productCodes: ["HOME_LOAN"], expectedUpdatedAt: STAMP }, memory([approved()], { uniqueConflict: true }));
  check("unique_conflict_is_409", raced.result.ok === false && raced.result.status === 409 && raced.store.creates.length === 1 && raced.store.rows.length === 1);

  const newer = memory([approved(), approved({ id: "fcm:contact.pan:v2", versionNumber: 2, lifecycleStatus: "draft", previousVersionId: "fcm:contact.pan:v1" })]);
  const fromOlder = await propose("ADMIN", "maker-2", { productCodes: ["HOME_LOAN"], expectedUpdatedAt: STAMP }, newer);
  check("newer_version_blocks_create", fromOlder.result.ok === false && fromOlder.result.status === 409 && fromOlder.store.creates.length === 0 && fromOlder.store.rows.length === 2);

  const missing = await propose("ADMIN", "maker-2", { productCodes: ["HOME_LOAN"], expectedUpdatedAt: STAMP }, memory([]), "fcm:missing:v1");
  check("missing_definition_is_404", missing.result.ok === false && missing.result.status === 404 && missing.store.creates.length === 0);

  const draft = created.store.rows[1];
  check("created_row_present", Boolean(draft));
  if (!draft) return;
  const submitted = await submitCertifiedFieldControlReview(request({ expectedUpdatedAt: draft.updatedAt.toISOString() }), draft.id, {
    authenticate: () => ({ role: "ADMIN", userId: "checker-9" }),
    findUnique: async ({ where }) => created.store.rows.find((item) => item.id === where.id) ?? null,
    updateMany: async ({ where, data }) => {
      const index = created.store.rows.findIndex((item) => item.id === where.id && item.lifecycleStatus === where.lifecycleStatus && item.ownershipReview === where.ownershipReview && item.versionNumber === where.versionNumber && item.updatedAt.getTime() === where.updatedAt.getTime());
      if (index < 0) return { count: 0 };
      created.store.rows[index] = { ...created.store.rows[index]!, lifecycleStatus: data.lifecycleStatus, checkerUserId: data.checkerUserId, updatedAt: new Date("2026-09-27T12:06:00.000Z") };
      return { count: 1 };
    },
  });
  check("v16_lifecycle_accepts_new_draft", submitted.ok === true && submitted.status === 200 && created.store.rows[1]?.lifecycleStatus === "checker_review" && created.store.rows[0]?.lifecycleStatus === "approved");

  const service = readFileSync(join(here, "production-governance-applicability.ts"), "utf8");
  const route = readFileSync(join(repoRoot, "src/app/api/admin/field-control-definitions/[id]/applicability-version/route.ts"), "utf8");
  const proposal = readFileSync(join(repoRoot, "src/components/catalyst-one/field-control-master/governed-applicability-proposal.tsx"), "utf8");
  const executable = [service, route].join("\n").split("\n").filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*")).join("\n");
  check("route_uses_canonical_codes", route.includes("canonicalEnterpriseProductCodes") && !route.includes("resolveCanonicalProductCode"));
  check("catalog_matches_seed", KNOWN.length === CANONICAL_PRODUCT_MASTER_SEED.length);
  check("no_prior_version_write", !executable.includes("update(") && !executable.includes("updateMany(") && !executable.includes("upsert(") && !executable.includes("delete(") && !executable.includes("deleteMany("));
  check("no_programme_or_edie_write", !executable.toLowerCase().includes("product-programme") && !executable.toLowerCase().includes("edie") && !executable.toLowerCase().includes("lenderprogram"));
  check("no_channel_write", !executable.toLowerCase().includes("compass") && !executable.toLowerCase().includes("chanakya") && !executable.toLowerCase().includes("sarathi"));
  check("proposal_has_no_runtime_controls", proposal.includes("Propose Applicability") && proposal.includes("Creating this proposal creates a new governed version. It does not change application behaviour.") && !proposal.includes("Activate") && !proposal.includes("customerFacingActivation") && !proposal.includes("controlsRuntime"));
  const foundationDiff = execFileSync("git", ["diff", "--name-only", "HEAD", "--", "prisma/migrations/20260926180000_field_control_master_foundation_v1/migration.sql"], { cwd: repoRoot, encoding: "utf8" });
  check("foundation_migration_unchanged", foundationDiff.trim() === "");
  const schemaPatch = execFileSync("git", ["diff", "-U0", "HEAD", "--", "prisma/schema.prisma"], { cwd: repoRoot, encoding: "utf8" });
  const schemaAdded = schemaPatch.split("\n").filter((line) => line.startsWith("+") && !line.startsWith("+++"));
  const schemaRemoved = schemaPatch.split("\n").filter((line) => line.startsWith("-") && !line.startsWith("---"));
  check("schema_adds_only_custom_field", schemaAdded.length === 1 && schemaAdded[0]?.trim() === "+  custom_field" && schemaRemoved.length === 0);

  const failed = checks.filter(([, passed]) => !passed);
  console.log(`FIELD_CONTROL_APPLICABILITY_V17_PROOF PASS checks=${checks.length} failed=${failed.length}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
