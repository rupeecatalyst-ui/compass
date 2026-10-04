/**
 * Focused proof for Design New Field draft creation.
 * Does not connect to a database and does not place or store values.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { FIELD_CONTROL_FIELD_TYPES } from "@/types/field-control-master";

import {
  buildCustomFieldDraftInsert,
  createCustomFieldDraft,
  DESIGN_NEW_FIELD_DOMAINS,
  parseCustomFieldDraftRequest,
  type CustomFieldDraftInsert,
} from "./custom-field-design";
import { parseFieldControlDraftRequest } from "./production-governance-create";
import { planFieldControlLifecycle } from "./production-governance-lifecycle";
import {
  projectCertifiedFieldControlDefinition,
  projectFieldControlSourceBinding,
  type CertifiedFieldControlRecord,
} from "./production-governance-read";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const checks: Array<[string, boolean]> = [];

function check(name: string, passed: boolean): void {
  checks.push([name, passed]);
  assert.equal(passed, true, name);
}

function source(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

const copy = {
  friendlyLabel: "Deal Decline Reason",
  description: "Why the deal was declined.",
  helpText: "Choose one reason.",
  validationSummary: "One reason is required.",
  presentationSummary: "Available only after an approved placement.",
};

const declineOptions = [
  { key: "customer_withdrew", label: "Customer withdrew" },
  { key: "pricing_not_acceptable", label: "Pricing not acceptable" },
  { key: "eligibility_issue", label: "Eligibility issue" },
  { key: "documentation_incomplete", label: "Documentation incomplete" },
  { key: "lender_declined", label: "Lender declined" },
  { key: "other", label: "Other" },
];

function declineBody(overrides: Record<string, unknown> = {}) {
  return {
    fieldId: "deal.declineReason",
    owningDomain: "deal",
    fieldType: "single_select",
    ...copy,
    options: declineOptions,
    ...overrides,
  };
}

function request(body: unknown): Request {
  return new Request("http://catalyst.local/custom-field-drafts", {
    method: "POST",
    body: JSON.stringify(body),
  });
}

function storedRow(data: CustomFieldDraftInsert): CertifiedFieldControlRecord {
  return {
    ...data,
    createdAt: new Date("2026-09-28T08:00:00.000Z"),
    updatedAt: new Date("2026-09-28T08:00:00.000Z"),
  };
}

async function main(): Promise<void> {
  const dialog = source("src/components/catalyst-one/field-control-master/create-field-draft-dialog.tsx");
  const registerWriter = source("src/lib/field-control-master/production-governance-create.ts");
  const designWriter = source("src/lib/field-control-master/custom-field-design.ts");
  const route = source("src/app/api/admin/field-control-definitions/custom-field-drafts/route.ts");
  check("design_new_field_enabled", dialog.includes('data-design-new-field="enabled"') && dialog.includes("DESIGN_NEW_FIELD_LABEL"));
  check("register_existing_remains", dialog.includes("REGISTER_EXISTING_FIELD_LABEL") && dialog.includes("DRAFT_CREATE_PATH") && dialog.includes("listDraftSourceAllowlistEntries"));
  check("register_writer_cannot_create_custom_field", !registerWriter.includes("custom_field"));
  let registerRejected = false;
  try {
    parseFieldControlDraftRequest({ mode: "custom_field", allowlistEntryId: "x", ...copy });
  } catch {
    registerRejected = true;
  }
  check("register_parser_rejects_custom_mode", registerRejected);

  const created: CustomFieldDraftInsert[] = [];
  const deps = {
    authenticate: () => ({ role: "ADMIN", userId: "maker-1" }),
    findFirst: async ({ where }: { where: { OR: Array<{ id?: string; fieldId?: string; lineageId?: string }> } }) =>
      created
        .map(storedRow)
        .find((row) =>
          where.OR.some(
            (clause) =>
              clause.id === row.id || clause.fieldId === row.fieldId || clause.lineageId === row.lineageId,
          ),
        ) ?? null,
    create: async ({ data }: { data: CustomFieldDraftInsert }) => {
      created.push(data);
      return storedRow(data);
    },
  };

  const forbidden = await createCustomFieldDraft(request(declineBody()), {
    ...deps,
    authenticate: () => ({ role: "USER", userId: "maker-1" }),
    create: async () => {
      throw new Error("create must not run");
    },
  });
  check("non_admin_fails_closed", forbidden.ok === false && forbidden.status === 403 && created.length === 0);

  const saved = await createCustomFieldDraft(request(declineBody()), deps);
  check("deal_decline_reason_accepted", saved.ok === true && saved.status === 201);
  if (!saved.ok) return;
  const definition = saved.data.definition;
  check("classification_forced_custom_field", definition.classification === "custom_field");
  check("status_forced_draft", definition.lifecycleStatus === "draft");
  check("runtime_forced_false", definition.controlsRuntime === false);
  check("customer_facing_forced_false", definition.customerFacingActivation === false);
  check("maker_is_session", definition.makerUserId === "maker-1");
  check("checker_is_null", definition.checkerUserId === null);
  check("custom_value_storage_binding", definition.sourceBinding.kind === "custom_value_storage" && definition.sourceBinding.fieldId === "deal.declineReason");
  check("no_column_binding", definition.sourceBinding.kind !== "column");
  check(
    "decline_options_store_key_label_order_and_active",
    definition.selectOptions.length === 6 &&
      definition.selectOptions[0]?.key === "customer_withdrew" &&
      definition.selectOptions[0]?.label === "Customer withdrew" &&
      definition.selectOptions[0]?.sortOrder === 1 &&
      definition.selectOptions[0]?.retired === false &&
      definition.selectOptionKeys[5] === "other",
  );

  const duplicate = await createCustomFieldDraft(request(declineBody()), deps);
  check("duplicate_field_id_rejected", duplicate.ok === false && duplicate.status === 409 && created.length === 1);
  const superAdmin = await createCustomFieldDraft(request(declineBody({ fieldId: "deal.superAdminProbe", options: [{ key: "other", label: "Other" }] })), {
    ...deps,
    authenticate: () => ({ role: "SUPER_ADMIN", userId: "maker-2" }),
  });
  check("super_admin_can_create", superAdmin.ok === true && superAdmin.ok && superAdmin.data.definition.makerUserId === "maker-2");

  const invalidDomain = await createCustomFieldDraft(request(declineBody({ owningDomain: "assessment", fieldId: "assessment.note", fieldType: "text", options: undefined })), deps);
  check("invalid_domain_rejected", invalidDomain.ok === false && invalidDomain.status === 400);
  const malformed = await createCustomFieldDraft(request(declineBody({ fieldId: "deal.decline reason" })), deps);
  check("malformed_field_id_rejected", malformed.ok === false && malformed.status === 400);
  const prefixedWrong = await createCustomFieldDraft(request(declineBody({ owningDomain: "contact" })), deps);
  check("domain_prefix_must_match", prefixedWrong.ok === false && prefixedWrong.status === 400);

  for (const fieldType of FIELD_CONTROL_FIELD_TYPES) {
    const select = fieldType === "single_select" || fieldType === "multi_select";
    const logicalName = `${fieldType.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase())}Sample`;
    const body = {
      fieldId: `contact.${logicalName}`,
      owningDomain: "contact",
      fieldType,
      ...copy,
      ...(select ? { options: [{ key: "one", label: "One" }] } : {}),
    };
    const parsed = parseCustomFieldDraftRequest(body);
    const insert = buildCustomFieldDraftInsert(parsed, "maker-1");
    check(`field_type_${fieldType}`, insert.fieldType === fieldType && insert.classification === "custom_field" && insert.controlsRuntime === false);
  }

  let singleMissing = false;
  let multiMissing = false;
  let duplicateKeys = false;
  let textOptions = false;
  try {
    parseCustomFieldDraftRequest(declineBody({ options: undefined }));
  } catch {
    singleMissing = true;
  }
  try {
    parseCustomFieldDraftRequest(declineBody({ fieldType: "multi_select", options: [] }));
  } catch {
    multiMissing = true;
  }
  try {
    parseCustomFieldDraftRequest(declineBody({ options: [{ key: "other", label: "Other" }, { key: "other", label: "Again" }] }));
  } catch {
    duplicateKeys = true;
  }
  try {
    parseCustomFieldDraftRequest(declineBody({ fieldType: "text", options: [{ key: "other", label: "Other" }] }));
  } catch {
    textOptions = true;
  }
  check("single_select_requires_options", singleMissing);
  check("multi_select_requires_options", multiMissing);
  check("duplicate_option_keys_rejected", duplicateKeys);
  check("non_select_options_rejected", textOptions);

  const currency = buildCustomFieldDraftInsert(
    parseCustomFieldDraftRequest({ fieldId: "accounting.feeAmount", owningDomain: "accounting", fieldType: "currency", ...copy }),
    "maker-1",
  );
  check("currency_uses_existing_rupee_unit", JSON.stringify(currency.currencyUnitsJson) === JSON.stringify(["rupees"]));
  check("launch_domains", JSON.stringify(DESIGN_NEW_FIELD_DOMAINS) === JSON.stringify(["contact", "company", "opportunity", "deal", "accounting"]));

  const binding = projectFieldControlSourceBinding({ kind: "custom_value_storage", fieldId: "deal.declineReason", model: "EnterpriseDeal" });
  check("projector_drops_physical_column", binding.kind === "custom_value_storage" && !("model" in binding));

  const lifecycleRow = storedRow(created[0]!);
  const submitted = planFieldControlLifecycle({
    action: "submit",
    actorUserId: "maker-1",
    row: lifecycleRow,
    expectedUpdatedAt: lifecycleRow.updatedAt,
  });
  check("lifecycle_accepts_custom_field_submit", "data" in submitted && submitted.data.lifecycleStatus === "checker_review");
  const approved = planFieldControlLifecycle({
    action: "approve",
    actorUserId: "checker-2",
    row: { ...lifecycleRow, lifecycleStatus: "checker_review" },
    expectedUpdatedAt: lifecycleRow.updatedAt,
  });
  check(
    "approval_does_not_activate_runtime",
    "data" in approved && approved.data.lifecycleStatus === "approved" && !("controlsRuntime" in approved.data),
  );

  const combined = [dialog, designWriter, route].join("\n");
  for (const forbiddenPath of ["product-programme", "compass", "chanakya", "sarathi", "EnterpriseDeal", "placement"]) {
    check(`no_${forbiddenPath.replace(/[^a-z]/gi, "_")}`, !combined.toLowerCase().includes(forbiddenPath.toLowerCase()));
  }
  const projected = projectCertifiedFieldControlDefinition(storedRow(created[0]!));
  check("projection_keeps_string_keys", projected.selectOptionKeys.includes("lender_declined"));

  const failed = checks.filter(([, passed]) => !passed);
  console.log(`FIELD_CONTROL_DESIGN_NEW_FIELD_PROOF PASS checks=${checks.length} failed=${failed.length}`);
}

main().catch((err: unknown) => {
  console.error(err);
  process.exit(1);
});
