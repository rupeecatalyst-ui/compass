/**
 * Focused proof for the read-only certified Field Control Master API.
 * Does not connect to a database.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import {
  fieldControlDefinitionReader,
  governanceDefinitionKeys,
  projectCertifiedFieldControlDefinition,
  projectFieldControlSourceBinding,
  readCertifiedFieldControlDetail,
  readCertifiedFieldControlList,
  type CertifiedFieldControlRecord,
  type FieldControlListReadArgs,
} from "./production-governance-read";

const here = dirname(fileURLToPath(import.meta.url));
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

function request(url: string): Request {
  return new Request(url);
}

function record(overrides: Partial<CertifiedFieldControlRecord> = {}): CertifiedFieldControlRecord {
  return {
    id: "fcm:derived:proposedEmiRupees:v1",
    fieldId: "derived:proposedEmiRupees",
    lineageId: "derived:proposedEmiRupees",
    versionNumber: 1,
    previousVersionId: null,
    friendlyLabel: "Proposed EMI",
    description: "Reducing-balance monthly EMI.",
    helpText: "Do not merge with current home-loan EMI.",
    fieldType: "currency",
    classification: "derived",
    owningDomain: "derived_engine",
    ownershipReview: "certified_binding",
    sourceBindingJson: { kind: "derived_calculator", calculatorId: "calculateReducingBalanceEmi" },
    aliasesJson: [],
    lifecycleStatus: "draft",
    productApplicabilityJson: ["HOME_LOAN", "HOME_LOAN_BT"],
    customerCategoryApplicabilityJson: [],
    applicabilityDeclared: false,
    authorisedConsumersJson: ["home_loan_recommendation_engine"],
    validationSummary: "FCM does not execute this calculator.",
    presentationSummary: "Whole rupees.",
    selectOptionSource: null,
    selectOptionKeysJson: [],
    currencyUnitsJson: ["rupees"],
    candidateMirrorOf: null,
    controlsRuntime: false,
    customerFacingActivation: false,
    makerUserId: "foundation-v1.3-derived-batch",
    checkerUserId: null,
    effectiveFrom: null,
    effectiveUntil: null,
    createdAt: new Date("2026-09-26T00:00:00.000Z"),
    updatedAt: new Date("2026-09-26T00:00:00.000Z"),
    ...overrides,
  };
}

const listUrl = "https://catalyst.local/api/admin/field-control-definitions";

async function listAs(role: string, url = listUrl, findMany?: (args: FieldControlListReadArgs) => Promise<CertifiedFieldControlRecord[]>) {
  let calls = 0;
  const result = await readCertifiedFieldControlList(request(url), {
    authenticate: () => ({ role }),
    findMany: async (args) => {
      calls += 1;
      return findMany ? findMany(args) : [];
    },
  });
  return { result, calls };
}

async function main(): Promise<void> {
const unauthenticated = await readCertifiedFieldControlList(request(listUrl), {
  authenticate: () => unauthorized(),
  findMany: async () => {
    throw new Error("findMany must not run");
  },
});
check("unauthenticated_is_401", unauthenticated.ok === false && unauthenticated.status === 401 && unauthenticated.code === "UNAUTHORIZED");
check("unauthenticated_has_no_definitions", !("definitions" in unauthenticated));

const outsider = await listAs("RM");
check("non_admin_is_403", outsider.result.ok === false && outsider.result.status === 403 && outsider.result.code === "FORBIDDEN");
check("non_admin_does_not_read", outsider.calls === 0);

const superAdmin = await listAs("SUPER_ADMIN", listUrl, async () => [record()]);
check("super_admin_is_allowed", superAdmin.result.ok === true && superAdmin.result.status === 200 && superAdmin.calls === 1);

const admin = await listAs("ADMIN", listUrl, async () => [record()]);
check("admin_is_allowed", admin.result.ok === true && admin.result.status === 200 && admin.calls === 1);

const unknownParam = await listAs("ADMIN", `${listUrl}?where=fieldId`);
check("unknown_query_is_400", unknownParam.result.ok === false && unknownParam.result.status === 400 && unknownParam.calls === 0);

const badEnum = await listAs("ADMIN", `${listUrl}?classification=not_a_class`);
check("invalid_enum_is_400", badEnum.result.ok === false && badEnum.result.status === 400 && badEnum.calls === 0);

const badSort = await listAs("ADMIN", `${listUrl}?sort=sourceBindingJson`);
check("invalid_sort_is_400", badSort.result.ok === false && badSort.result.status === 400 && badSort.calls === 0);

const badLimit = await listAs("ADMIN", `${listUrl}?limit=0`);
check("malformed_limit_is_400", badLimit.result.ok === false && badLimit.result.status === 400 && badLimit.calls === 0);
const hugeLimit = await listAs("ADMIN", `${listUrl}?limit=101`);
check("over_cap_limit_is_400", hugeLimit.result.ok === false && hugeLimit.result.status === 400);

let captured: FieldControlListReadArgs | undefined;
await listAs(
  "ADMIN",
  `${listUrl}?owningDomain=derived_engine&classification=derived&lifecycleStatus=draft&ownershipReview=certified_binding&q=proposed&sort=friendlyLabel&direction=desc&limit=12`,
  async (args) => {
    captured = args;
    return [];
  },
);
check("valid_filters_are_allowlisted", Boolean(captured));
const whereText = JSON.stringify(captured?.where);
check("query_searches_only_field_id_and_label", whereText.includes("fieldId") && whereText.includes("friendlyLabel") && !whereText.includes("helpText") && !whereText.includes("sourceBindingJson"));
check(
  "query_has_no_raw_filter",
  whereText.includes("derived_engine") &&
    whereText.includes("certified_binding") &&
    captured?.take === 12 &&
    !whereText.includes("SELECT") &&
    !whereText.includes("programme"),
);
check(
  "sort_is_allowlisted",
  JSON.stringify(captured?.orderBy) === JSON.stringify([{ friendlyLabel: "desc" }, { id: "asc" }]),
);

const column = projectFieldControlSourceBinding({ kind: "column", model: "EcmContact", field: "name", extra: "ignore" });
check("column_binding_is_descriptive", column.kind === "column" && column.model === "EcmContact" && column.field === "name" && !("extra" in column));

const derived = projectFieldControlSourceBinding({
  kind: "derived_calculator",
  calculatorId: "calculateReducingBalanceEmi",
  execute: true,
});
check(
  "derived_binding_is_descriptive",
  derived.kind === "derived_calculator" && derived.calculatorId === "calculateReducingBalanceEmi" && !("execute" in derived),
);

const unknown = projectFieldControlSourceBinding({ kind: "shell", command: "calculateReducingBalanceEmi" });
check("unknown_binding_is_unrecognized", unknown.kind === "unrecognized" && Object.keys(unknown).length === 1);

const projected = projectCertifiedFieldControlDefinition(record());
check("null_fields_remain_null", projected.previousVersionId === null && projected.checkerUserId === null && projected.effectiveFrom === null && projected.effectiveUntil === null && projected.selectOptionSource === null && projected.candidateMirrorOf === null);
check("arrays_remain_arrays", Array.isArray(projected.aliases) && Array.isArray(projected.currencyUnits) && projected.currencyUnits[0] === "rupees" && projected.productApplicability.length === 2);
check("applicability_declared_remains_false", projected.applicabilityDeclared === false);
check("controls_remain_stored_booleans", projected.controlsRuntime === false && projected.customerFacingActivation === false);
const keys = Object.keys(projected).sort();
check(
  "projection_has_no_invented_action",
  JSON.stringify(keys) === JSON.stringify([...governanceDefinitionKeys()].sort()) &&
    !("actions" in projected) &&
    !("execute" in projected),
);

const failedRead = await readCertifiedFieldControlList(request(listUrl), {
  authenticate: () => ({ role: "ADMIN" }),
  findMany: async () => {
    throw new Error("database unavailable");
  },
});
check(
  "read_failure_does_not_invent_rows",
  failedRead.ok === false && failedRead.status === 500 && failedRead.code === "FIELD_CONTROL_READ_FAILED" && !("definitions" in failedRead),
);

let missingDelegate = false;
try {
  fieldControlDefinitionReader({});
} catch {
  missingDelegate = true;
}
check("missing_delegate_fails_closed", missingDelegate);
const missingClient = await readCertifiedFieldControlList(request(listUrl), {
  authenticate: () => ({ role: "ADMIN" }),
  findMany: (args) => fieldControlDefinitionReader({}).findMany(args),
});
check(
  "missing_client_does_not_fall_back",
  missingClient.ok === false && missingClient.status === 500 && missingClient.code === "FIELD_CONTROL_READ_FAILED" && !("definitions" in missingClient),
);

const missing = await readCertifiedFieldControlDetail(request(`${listUrl}/missing`), "missing-id", {
  authenticate: () => ({ role: "SUPER_ADMIN" }),
  findUnique: async () => null,
});
check("missing_detail_is_404", missing.ok === false && missing.status === 404 && missing.code === "NOT_FOUND");

const source = [
  readFileSync(join(here, "production-governance-read.ts"), "utf8"),
  readFileSync(join(here, "../../app/api/admin/field-control-definitions/route.ts"), "utf8"),
  readFileSync(join(here, "../../app/api/admin/field-control-definitions/[id]/route.ts"), "utf8"),
].join("\n");
const executable = source
  .split("\n")
  .filter((line) => !line.trim().startsWith("//") && !line.trim().startsWith("*") && !line.trim().startsWith("/*"))
  .join("\n")
  .replace(/'(?:''|[^'])*'/g, "''")
  .replace(/"(?:\\"|[^"])*"/g, '""');
for (const forbidden of ["create(", "createMany(", "update(", "updateMany(", "upsert(", "delete(", "deleteMany(", "$executeRaw", "$queryRaw"]) {
  check(`no_${forbidden.replace(/[^a-z]/gi, "_")}`, !executable.includes(forbidden));
}
check("no_inspection_registry_import", !source.includes("listFieldControlDefinitions") && !source.includes('from "./registry"') && !source.includes("registry.ts"));
check("routes_are_get_only", !source.includes("export async function POST") && !source.includes("export async function PATCH") && !source.includes("export async function PUT") && !source.includes("export async function DELETE"));
check("prisma_reads_are_find_only", source.includes("findMany") && source.includes("findUnique"));

const failed = checks.filter(([, passed]) => !passed);
console.log(`FIELD_CONTROL_PRODUCTION_READ_PROOF PASS checks=${checks.length} failed=${failed.length}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
