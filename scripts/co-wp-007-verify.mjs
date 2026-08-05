/**
 * CO-WP-007 — Wealth Partner Legal & Compliance Docket verify (static).
 * No migrate / no deploy / no live-data mutation.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");
const exists = (rel) => fs.existsSync(path.join(root, rel));

for (const rel of [
  "src/types/enterprise-wealth-partner-legal-docket.ts",
  "src/constants/enterprise-wealth-partner-legal-docket/index.ts",
  "src/lib/enterprise-wealth-partner-legal-docket/index.ts",
  "src/lib/enterprise-wealth-partner-legal-docket/generate.ts",
  "src/lib/enterprise-wealth-partner-legal-docket/templates.ts",
  "src/lib/enterprise-wealth-partner-legal-docket/compose.ts",
  "src/lib/enterprise-wealth-partner-legal-docket/registry-bridge.ts",
  "src/components/catalyst-one/wealth-partner-registry/wealth-partner-legal-compliance-panel.tsx",
  "src/app/api/wealth-partner-registry/partners/[partnerId]/legal-docket/route.ts",
  "docs/co-wp-007/CO-WP-007-LEGAL-COMPLIANCE-DOCKET-REPORT.md",
  ".cursor/rules/enterprise-wealth-partner.mdc",
]) {
  assert.ok(exists(rel), `missing ${rel}`);
}

const policy = read("src/constants/enterprise-wealth-partner-legal-docket/index.ts");
assert.match(policy, /agreementValidityYears:\s*5/);
assert.match(policy, /renewalReminderDays:\s*\[180,\s*90,\s*30\]/);
assert.match(policy, /cover_sheet/);
assert.match(policy, /engagement_agreement/);
assert.match(policy, /commercial_schedule/);
assert.match(policy, /digital_acceptance_certificate/);
assert.ok(!/agreementValidityYears:\s*5\s*,\s*\/\/\s*hardcoded/.test(policy));

const templates = read("src/lib/enterprise-wealth-partner-legal-docket/templates.ts");
assert.match(templates, /\{\{partnerCode\}\}/);
assert.match(templates, /\{\{referralSharePercent\}\}/);
assert.match(templates, /\{\{companyGstin\}\}/);
assert.match(templates, /Commercial Schedule/);

const generate = read("src/lib/enterprise-wealth-partner-legal-docket/generate.ts");
assert.match(generate, /generateWealthPartnerLegalDocket/);
assert.match(generate, /buildRenewalReminders/);
assert.match(generate, /status:\s*"archived"/);

const compose = read("src/lib/enterprise-wealth-partner-legal-docket/compose.ts");
assert.match(compose, /resolveWealthPartnerOpportunitySelectability/);
assert.match(compose, /not_selectable/);
assert.match(compose, /selectable_with_warning/);
assert.match(compose, /Agreement Expired/);

const service = read(
  "server/services/wealth-partner-registry/wealth-partner-registry.service.ts",
);
assert.match(service, /runLegalDocketAction/);
assert.match(service, /legalCompliance/);
assert.match(service, /link_registry/);
assert.match(service, /complianceJson/);

const route = read(
  "src/app/api/wealth-partner-registry/partners/[partnerId]/legal-docket/route.ts",
);
assert.match(route, /generate_docket/);
assert.match(route, /renew_reactivate/);

const ui = read(
  "src/components/catalyst-one/wealth-partner-registry/wealth-partner-legal-compliance-panel.tsx",
);
assert.match(ui, /Generate Legal Docket/);
assert.match(ui, /Version History/);
assert.match(ui, /Compliance Timeline/);
assert.match(ui, /Renewal Reminders/);
assert.match(ui, /View/);
assert.match(ui, /Download/);

const workspace = read(
  "src/components/catalyst-one/wealth-partner-registry/wealth-partner-workspace.tsx",
);
assert.match(workspace, /WealthPartnerLegalCompliancePanel/);
assert.ok(!/function ComplianceTab/.test(workspace));

const tabs = read("src/constants/enterprise-wealth-partner-registry/index.ts");
assert.match(tabs, /Legal & Compliance/);

const lookup = read(
  "src/components/catalyst-one/lead-information/business-source-contact-lookup.tsx",
);
assert.match(lookup, /resolveWealthPartnerOpportunitySelectability/);
assert.match(lookup, /Renewal Due/);

const rule = read(".cursor/rules/enterprise-wealth-partner.mdc");
assert.match(rule, /CO-WP-007/);
assert.match(rule, /WEALTH_PARTNER_LEGAL_ORG_POLICY/);

// No migration artifacts introduced by this sprint
assert.ok(!exists("prisma/migrations/20260729120000_co_wp_007_legal_docket"));

console.log("CO-WP-007 Wealth Partner Legal & Compliance Docket verify: PASS");
console.log("NOTE: No migrate / no deploy / no live-data mutation.");
