/**
 * Read-only proof for Field Inventory and the R2 presentation changes.
 * Does not connect to a database and does not create a Field Control row.
 */
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { DRAFT_SOURCE_ALLOWLIST } from "./draft-source-allowlist";
import { CREATE_FIELD_SAFETY_COPY } from "./draft-creation-presentation";
import { listFieldInventoryEntries } from "./field-inventory-catalogue";
import { fieldInventoryMatchesSearch } from "./field-inventory-presentation";
import { isFieldControlMasterAdminPath } from "./field-control-master-route";

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

function diffNames(paths: string[]): string {
  return execFileSync("git", ["diff", "--name-only", "HEAD", "--", ...paths], {
    cwd: repoRoot,
    encoding: "utf8",
  }).trim();
}

function main(): void {
  const entries = listFieldInventoryEntries();
  const ids = entries.map((entry) => entry.identity);
  const unique = new Set(ids);
  check("unique_identities", unique.size === entries.length);
  check("historical_155", entries.filter((entry) => entry.boundary === "historical_155").length === 155);
  check("outside_raw_10", entries.filter((entry) => entry.boundary === "outside_v1_5_raw").length === 10);
  check("total_165", entries.length === 165);

  const groups = {
    assessment: 0,
    idc: 0,
    ppo: 0,
    derived: 0,
    certified_column: 0,
    legacy_alias: 0,
    outside_raw: 0,
  };
  for (const entry of entries) groups[entry.group] += 1;
  check("assessment_63", groups.assessment === 63);
  check("idc_29", groups.idc === 29);
  check("ppo_38", groups.ppo === 38);
  check("derived_9", groups.derived === 9);
  check("certified_columns_8", groups.certified_column === 8);
  check("legacy_aliases_8", groups.legacy_alias === 8);

  const byId = new Map(entries.map((entry) => [entry.identity, entry]));
  const certified = [
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
    "twelve_certified_registered",
    certified.every((id) => {
      const entry = byId.get(id);
      return (
        entry?.fcmStatus === "Registered in FCM" &&
        entry.ownershipStatus === "Production certified binding" &&
        entry.fcmFieldId === id &&
        entry.registrationEligibility === "Registered"
      );
    }),
  );

  const pan = byId.get("contact.pan");
  check(
    "contact_pan_registered_not_certified",
    pan?.fcmStatus === "Registered in FCM" &&
      pan.ownershipStatus === "Owner requires product decision" &&
      pan.fcmFieldId === "contact.pan" &&
      pan.source === "EcmContact.pan" &&
      pan.boundary === "outside_v1_5_raw",
  );

  const availableRaw = [
    "contact.aadhaar",
    "contact.personalEmail",
    "contact.officialEmail",
    "contact.mobileSecondary",
    "contact.address",
    "opportunity.transactionType",
    "company.companyName",
    "company.pan",
    "company.gst",
  ];
  check(
    "nine_raw_available",
    availableRaw.every((id) => {
      const entry = byId.get(id);
      return (
        entry?.fcmStatus === "Not registered" &&
        entry.registrationEligibility === "Available for registration" &&
        entry.fcmFieldId == null &&
        entry.boundary === "outside_v1_5_raw"
      );
    }),
  );

  const foirRows = entries.filter((entry) => entry.identity === "derived:foirPercent");
  const foir = foirRows[0];
  check(
    "foir_once_available_not_registered",
    foirRows.length === 1 &&
      foir?.classification === "Derived" &&
      foir.fcmStatus === "Not registered" &&
      foir.registrationEligibility === "Available for registration" &&
      foir.derivedCalculator?.calculatorId === "calculateSalariedFoir" &&
      foir.boundary === "historical_155",
  );

  const registeredDerived = [
    ["derived:proposedEmiRupees", "calculateReducingBalanceEmi"],
    ["derived:effectiveTenureMonths", "calculateEffectiveTenureMonths"],
    ["derived:assessedOfferRupees", "calculateTentativeOffer"],
    ["derived:btSavingsRupees", "calculateIndicativeBtSaving"],
  ] as const;
  check(
    "four_derived_registered",
    registeredDerived.every(([id, calculatorId]) => {
      const entry = byId.get(id);
      return (
        entry?.classification === "Derived" &&
        entry.sourceClass === "Derived calculator" &&
        entry.fcmStatus === "Registered in FCM" &&
        entry.derivedCalculator?.calculatorId === calculatorId
      );
    }),
  );

  const deferred = ["derived:ltvPercent", "derived:ageYears", "derived:ageAtMaturityYears", "derived:applicableRoiPercent"];
  check(
    "four_deferred_derived_not_certified",
    deferred.every((id) => {
      const entry = byId.get(id);
      return (
        entry?.classification === "Derived" &&
        entry.fcmStatus === "Not registered" &&
        entry.ownershipStatus === "Requires ownership review" &&
        entry.registrationEligibility === "Requires ownership review" &&
        entry.derivedCalculator?.calculatorId == null
      );
    }),
  );

  const programme = entries.filter((entry) => entry.identity.startsWith("ppo:"));
  check(
    "programme_excluded",
    programme.length === 38 &&
      programme.every(
        (entry) =>
          entry.classification === "Policy / programme constraint" &&
          entry.registrationEligibility === "Excluded" &&
          entry.sourceClass === "Policy / programme constraint" &&
          entry.fcmStatus === "Not registered" &&
          entry.programmeExclusionReason != null,
      ),
  );
  check(
    "programme_absent_from_allowlist",
    DRAFT_SOURCE_ALLOWLIST.every((entry) => !entry.fieldId.startsWith("ppo:")),
  );

  const distinctPairs = [
    ["opportunity.employmentTypeCode", "idc:employmentTypeCode"],
    ["opportunity.cityLabel", "idc:city"],
    ["opportunity.requestedAmount", "idc:requestedAmountLabel"],
    ["contact.pan", "company.pan"],
    ["idc:companyName", "company.companyName"],
    ["idc:transactionType", "opportunity.transactionType"],
    ["idc:gstin", "company.gst"],
    ["assessment:borrower.dateOfBirth", "contact.dateOfBirth"],
    ["assessment:loanRequirement.requestedAmount", "opportunity.requestedAmount"],
  ] as const;
  check(
    "ambiguous_pairs_remain_distinct",
    distinctPairs.every(([leftId, rightId]) => {
      const left = byId.get(leftId);
      const right = byId.get(rightId);
      return Boolean(left && right && left.identity !== right.identity && left.source !== right.source);
    }),
  );
  check(
    "physical_cousins_not_collapsed",
    entries.every(
      (entry) =>
        !entry.source.includes("EcmContact.employmentType") &&
        !entry.source.includes("EcmContact.city") &&
        entry.source !== "EcmContact.state" &&
        !entry.source.includes("EnterpriseDeal.requestedAmount"),
    ),
  );
  check(
    "search_is_literal_substring",
    fieldInventoryMatchesSearch(
      { identity: "opportunity.cityLabel", businessLabel: "Opportunity city", source: "EnterpriseOpportunity.cityLabel" },
      "cityLabel",
    ) &&
      !fieldInventoryMatchesSearch(
        { identity: "idc:city", businessLabel: "City", source: "enterprise-initial-data-collection:city" },
        "EcmContact.city",
      ),
  );

  const registered = entries.filter((entry) => entry.fcmStatus === "Registered in FCM");
  check("registered_count_is_13", registered.length === 13);
  check(
    "registered_requires_exact_field_id",
    registered.every((entry) => entry.fcmFieldId === entry.identity),
  );

  const catalogueSource = source("src/lib/field-control-master/field-inventory-catalogue.ts");
  const panelSource = source("src/components/catalyst-one/field-control-master/field-inventory-panel.tsx");
  const pageSource = source("src/app/(dashboard)/admin/field-control-master/inventory/page.tsx");
  const inventoryBundle = [catalogueSource, panelSource, pageSource].join("\n");
  check("inventory_does_not_read_ownership_review_flag", !catalogueSource.includes("ownershipReview"));
  for (const forbidden of ["prisma", "$executeRaw", "$queryRaw", "createCertifiedFieldControlDraft", "upsert(", "delete(", "update("]) {
    check(`inventory_has_no_${forbidden.replace(/[^a-z]/gi, "_")}`, !inventoryBundle.includes(forbidden));
  }
  check("inventory_panel_has_no_submit", !panelSource.includes('type="submit"'));
  check("inventory_page_is_read", pageSource.includes("listFieldInventoryEntries") && !pageSource.includes("POST"));

  check("ticker_hidden_on_governed", isFieldControlMasterAdminPath("/admin/field-control-master"));
  check("ticker_hidden_on_inventory", isFieldControlMasterAdminPath("/admin/field-control-master/inventory"));
  check("ticker_hidden_on_child", isFieldControlMasterAdminPath("/admin/field-control-master/inventory/detail"));
  check("ticker_remains_on_dashboard", !isFieldControlMasterAdminPath("/dashboard"));
  check("ticker_remains_on_contacts", !isFieldControlMasterAdminPath("/contacts"));
  check("ticker_remains_on_near_miss", !isFieldControlMasterAdminPath("/admin/field-control-master-other"));
  check("ticker_empty_path_keeps_bar", !isFieldControlMasterAdminPath(null));

  const topbar = source("src/components/layout/app-topbar.tsx");
  check("topbar_uses_route_family", topbar.includes("isFieldControlMasterAdminPath(pathname)"));
  check(
    "topbar_suppresses_only_the_bar",
    topbar.includes("suppressOperationalTicker ? null : <ChanakyaLiveIntelligenceBar") &&
      topbar.includes("<GlobalChanakyaButton") &&
      topbar.includes("<ActivityDialogueQuickAccess") &&
      topbar.includes('aria-label="Notifications"'),
  );

  const dialog = source("src/components/catalyst-one/field-control-master/create-field-draft-dialog.tsx");
  check("dialog_uses_94vw_92vh", dialog.includes("h-[92vh]") && dialog.includes("w-[94vw]") && dialog.includes("max-w-none"));
  check("dialog_three_column_and_responsive", dialog.includes("lg:grid-cols-3") && dialog.includes("grid-cols-1") && dialog.includes("md:grid-cols-2"));
  check("dialog_safety_sentence", dialog.includes("CREATE_FIELD_SAFETY_COPY") && CREATE_FIELD_SAFETY_COPY === "Creating a field definition does not change application behaviour.");
  check("dialog_design_new_disabled", dialog.includes('data-design-new-field="disabled"') && dialog.includes("disabled"));
  check("dialog_single_submit", dialog.split('type="submit"').length === 2);
  check("dialog_post_path", dialog.includes("DRAFT_CREATE_PATH"));
  for (const key of ["mode", "allowlistEntryId", "friendlyLabel", "description", "helpText", "validationSummary", "presentationSummary"]) {
    check(`dialog_body_has_${key}`, dialog.includes(key));
  }
  check("dialog_closed_allowlist_picker", dialog.includes("listDraftSourceAllowlistEntries"));

  const unchanged = [
    "src/components/ui/dialog.tsx",
    "src/components/enterprise/chanakya-live-intelligence/bar.tsx",
    "src/mission-control/shell/enterprise-header.tsx",
    "src/app/(dashboard)/admin/field-control-master/page.tsx",
    "src/lib/field-control-master/draft-source-allowlist.ts",
    "src/lib/field-control-master/production-governance-create.ts",
    "src/lib/field-control-master/draft-creation-presentation.ts",
    "src/app/api/admin/field-control-definitions/drafts/route.ts",
    "src/lib/field-control-master/production-governance-read.ts",
    "src/lib/field-control-master/production-governance-read-proof.ts",
    "src/app/api/admin/field-control-definitions/route.ts",
    "src/app/api/admin/field-control-definitions/[id]/route.ts",
    "src/lib/field-control-master/governance-presentation.ts",
    "prisma/migrations/20260926180000_field_control_master_foundation_v1/migration.sql",
    "src/lib/field-control-master/foundation-v1-2-seed.sql",
    "src/lib/field-control-master/foundation-v1-2-verification.sql",
    "src/lib/field-control-master/foundation-v1-3-derived-seed.sql",
    "src/lib/field-control-master/foundation-v1-3-derived-verification.sql",
  ];
  check("frozen_and_functional_files_unchanged", diffNames(unchanged) === "");
  const inventoryPanel = source("src/components/catalyst-one/field-control-master/field-inventory-panel.tsx");
  const inventoryCatalogue = source("src/lib/field-control-master/field-inventory-catalogue.ts");
  check("inventory_panel_remains_read_only", inventoryPanel.includes('data-field-inventory="read-only"') && !inventoryPanel.includes("submit-review") && !inventoryPanel.includes(">Approve<") && !inventoryPanel.includes("Return to Maker") && !inventoryPanel.includes('method: "POST"'));
  check("inventory_catalogue_is_not_lifecycle_authority", !inventoryCatalogue.includes("submit-review") && !inventoryCatalogue.includes("updateMany") && !inventoryCatalogue.includes("checkerUserId") && !inventoryCatalogue.includes("lifecycleStatus"));
  check("inventory_files_unchanged", diffNames([
    "src/components/catalyst-one/field-control-master/field-inventory-panel.tsx",
    "src/lib/field-control-master/field-inventory-catalogue.ts",
    "src/lib/field-control-master/field-inventory-presentation.ts",
  ]) === "");

  const failed = checks.filter(([, passed]) => !passed);
  console.log(`FIELD_INVENTORY_R2_PROOF PASS checks=${checks.length} failed=${failed.length}`);
}

main();
