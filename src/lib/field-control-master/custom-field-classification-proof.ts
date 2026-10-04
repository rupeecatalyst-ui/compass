/**
 * Focused proof for the additive custom_field classification.
 * Does not connect to a database and does not execute the migration.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { classificationLabel, factLabel } from "./governance-presentation";
import { FIELD_CONTROL_CLASSIFICATIONS } from "@/types/field-control-master";

const here = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(here, "../../..");
const checks: Array<[string, boolean]> = [];
const PRIOR = [
  "raw_canonical",
  "derived",
  "reference_mirror",
  "alias",
  "system",
  "configuration",
  "programme_constraint_reference",
] as const;

function check(name: string, passed: boolean): void {
  checks.push([name, passed]);
  assert.equal(passed, true, name);
}

function source(path: string): string {
  return readFileSync(join(repoRoot, path), "utf8");
}

function main(): void {
  const schema = source("prisma/schema.prisma");
  const enumBody = schema.slice(schema.indexOf("enum FieldControlClassification {"), schema.indexOf("enum FieldControlOwningDomain {"));
  const enumValues = enumBody
    .split("\n")
    .map((line) => line.trim().replace(/\r/g, ""))
    .filter((line) => line && !line.startsWith("enum") && line !== "{")
    .map((line) => line.replace(/[,}]/g, ""))
    .filter((line) => line.length > 0);
  check("prisma_enum_appends_custom_field", enumValues.at(-1) === "custom_field" && enumValues.at(-2) === "programme_constraint_reference");
  for (const value of PRIOR) {
    check(`prisma_keeps_${value}`, enumBody.includes(value));
  }
  check("prisma_enum_count", enumValues.length === 8);

  const migration = source("prisma/migrations/20260927193000_field_control_classification_custom_field/migration.sql");
  const executable = migration
    .split("\n")
    .filter((line) => line.trim() && !line.trim().startsWith("--"))
    .join("\n");
  check(
    "migration_adds_only_custom_field",
    executable === "ALTER TYPE \"FieldControlClassification\" ADD VALUE IF NOT EXISTS 'custom_field';",
  );
  for (const forbidden of ["DROP", "DELETE", "UPDATE", "ALTER TABLE", "INSERT"]) {
    check(`migration_has_no_${forbidden.toLowerCase().replace(" ", "_")}`, !executable.includes(forbidden));
  }

  const foundation = source("prisma/migrations/20260926180000_field_control_master_foundation_v1/migration.sql");
  check("foundation_runtime_check_unchanged", foundation.includes('CONSTRAINT "fcm_foundation_v1_no_runtime_control" CHECK ("controls_runtime" = false)'));
  check("foundation_customer_facing_check_unchanged", foundation.includes('CONSTRAINT "fcm_foundation_v1_no_customer_facing" CHECK ("customer_facing_activation" = false)'));
  check("foundation_enum_has_no_custom_field", !foundation.includes("'custom_field'"));
  const foundationDiff = execFileSync("git", ["diff", "--name-only", "HEAD", "--", "prisma/migrations/20260926180000_field_control_master_foundation_v1/migration.sql"], { cwd: repoRoot, encoding: "utf8" });
  check("foundation_migration_diff_empty", foundationDiff.trim() === "");

  check("type_appends_custom_field", FIELD_CONTROL_CLASSIFICATIONS.at(-1) === "custom_field" && FIELD_CONTROL_CLASSIFICATIONS.length === 8);
  check("prior_classifications_kept", PRIOR.every((value, index) => FIELD_CONTROL_CLASSIFICATIONS[index] === value));
  check("label_is_custom_field", classificationLabel("custom_field") === "Custom Field");
  check("custom_field_is_not_a_fact_label", factLabel("custom_field") === null);
  check("raw_label_unchanged", classificationLabel("raw_canonical") === "Raw canonical");
  check("configuration_label_unchanged", classificationLabel("configuration") === "Configuration");

  const types = source("src/types/field-control-master.ts");
  check("definition_runtime_flag_stays_literal_false", types.includes("controlsRuntime: false") && types.includes("customerFacingActivation: false"));
  const createService = source("src/lib/field-control-master/production-governance-create.ts");
  check("v15_create_does_not_accept_custom_field", !createService.includes("custom_field"));

  const changed = execFileSync("git", ["diff", "--name-only", "HEAD"], { cwd: repoRoot, encoding: "utf8" });
  const dealWorkspaceChanges = changed
    .split(/\r?\n/)
    .filter((line) => line.includes("src/components/catalyst-one/deal-workspace/"));
  check(
    "diff_limits_deal_workspace_to_custom_fields",
    dealWorkspaceChanges.every(
      (line) =>
        line.endsWith("deal-workspace-host.tsx") ||
        line.endsWith("deal-custom-fields-section.tsx") ||
        line.endsWith("custom-field-input.tsx"),
    ),
  );
  for (const forbidden of [
    "src/lib/product-programme-operations/",
    "src/lib/edie-certified/",
    "server/services/compass-customer-gateway/",
    "src/lib/chanakya",
    "src/constants/enterprise-ai-platform/",
    "src/lib/product-recommendation/",
  ]) {
    check(`diff_excludes_${forbidden.split("/").filter(Boolean).pop()}`, !changed.includes(forbidden));
  }
  check("no_value_table_in_migration", !migration.toLowerCase().includes("field_control_value") && !migration.toLowerCase().includes("placement"));
  check("no_deal_column_in_migration", !migration.includes("EnterpriseDeal"));

  const failed = checks.filter(([, passed]) => !passed);
  console.log(`FIELD_CONTROL_CUSTOM_FIELD_CLASSIFICATION_V18A_PROOF PASS checks=${checks.length} failed=${failed.length}`);
}

main();
