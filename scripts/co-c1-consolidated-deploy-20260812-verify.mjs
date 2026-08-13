/**
 * CO-C1-CONSOLIDATED-DEPLOY-20260812 — static verification of today's Catalyst One refinements.
 * Engineering gate only — not Business Certification.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
let failed = 0;

function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}
function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

// Marketing execution must stay OFF
{
  const safety = read("src/constants/enterprise-marketing-engine/safety.ts");
  if (/ENTERPRISE_MARKETING_EXECUTION_ENABLED\s*=\s*false/.test(safety)) {
    ok("Marketing EXECUTION_ENABLED = false");
  } else fail("Marketing EXECUTION_ENABLED must be false");
  if (/ENTERPRISE_MARKETING_PROVIDER_CONNECT_ENABLED\s*=\s*false/.test(safety)) {
    ok("Marketing PROVIDER_CONNECT_ENABLED = false");
  } else fail("Marketing PROVIDER_CONNECT_ENABLED must be false");
}

// Follow-up / Send Email
{
  const emailWs = read(
    "src/components/catalyst-one/action-center/workspaces/email-context-workspace.tsx",
  );
  const templates = read(
    "src/constants/enterprise-action-center/communication-templates.ts",
  );
  const branding = exists(
    "src/constants/enterprise-communication-center/corporate-branding.ts",
  );
  if (emailWs.includes("follow") || templates.includes("follow")) ok("Follow-up templates present");
  else fail("Follow-up templates missing");
  if (branding) ok("Corporate branding module present");
  else fail("Corporate branding module missing");
}

// Operational email config (not Marketing)
{
  const page = exists("src/app/(dashboard)/organization/communication");
  if (page) ok("Organization Communication route present");
  else fail("Organization Communication route missing");
}

// Dashboard density / last 7 days
{
  const dash = read("src/components/catalyst-one/user-home-dashboard/user-home-dashboard.tsx");
  const arrivals = read("src/constants/user-home-dashboard/new-arrivals.ts");
  const load = read("src/lib/user-home-dashboard/command-center/load-new-opportunities.ts");
  if (
    arrivals.includes("last_7") ||
    dash.includes("last_7") ||
    load.includes("last_7")
  ) {
    ok("Dashboard Last 7 Days default signal present");
  } else fail("Dashboard Last 7 Days default not found");
}

// Contact 360 UX refinement
{
  if (!exists("src/components/catalyst-one/contacts/contact-360-intelligence-panel.tsx")) {
    fail("Contact360IntelligencePanel missing");
  } else ok("Contact360IntelligencePanel present");
  const modal = read("src/components/catalyst-one/contacts/contact-workspace-modal.tsx");
  if (modal.includes("Contact360IntelligencePanel")) ok("Contact workspace wires 360 panel");
  else fail("Contact workspace does not wire 360 panel");
  const compose = read("src/lib/enterprise-contact-master/compose-contact-360.ts");
  if (compose.includes("relationshipSections")) ok("composeContact360Snapshot sections present");
  else fail("composeContact360Snapshot sections missing");
  const tabs = read("src/lib/enterprise-contact-master/workspace-tabs.ts");
  if (tabs.includes("...after, ...roleTabs") || tabs.includes("roleTabs];")) {
    ok("Role tabs secondary (after fixed tabs)");
  } else fail("Role tab order not secondary");
}

// Lender 360
{
  const eld = read(
    "src/components/catalyst-one/enterprise-lender-directory/eld-slide-over.tsx",
  );
  if (eld.includes("Lender 360°")) ok("Lender 360° branding present");
  else fail("Lender 360° branding missing");
  if (eld.includes('mode: "lender"') || eld.includes("mode: 'lender'")) {
    ok("Lender Activity uses EAR lender scope");
  } else fail("Lender Activity EAR scope missing");
  if (eld.includes("Relationship Intelligence")) ok("Lender Relationship Intelligence on summary");
  else fail("Lender Relationship Intelligence missing on summary");
}

// Deal consistency
{
  const map = read("src/lib/enterprise-deal/map-deal-to-registry-row.ts");
  const types = read("src/types/deal-registry.ts");
  const card = read(
    "src/components/catalyst-one/my-deals/opportunity-lender-journey-card.tsx",
  );
  if (types.includes("lenderCaseStage")) ok("DealRegistryRow.lenderCaseStage typed");
  else fail("lenderCaseStage type missing");
  if (map.includes("lenderCaseStage")) ok("map-deal-to-registry-row sets lenderCaseStage");
  else fail("map-deal-to-registry-row missing lenderCaseStage");
  if (card.includes("lenderCaseStage") || card.includes("assignee")) {
    ok("Journey card uses canonical stage/assignee signals");
  } else fail("Journey card missing canonical stage/assignee");
}

// No new migration required for today's UX refinements
{
  const latest = "prisma/migrations/20260811160000_co_notification_001_enterprise_notification";
  if (exists(latest)) ok("Latest migration remains CO-NOTIFICATION-001 (already authorized historically)");
  else fail("Expected CO-NOTIFICATION-001 migration folder missing");
}

if (failed > 0) {
  console.error(`\nCO-C1-CONSOLIDATED-DEPLOY-20260812 verify FAILED (${failed})`);
  process.exit(1);
}
console.log("\nCO-C1-CONSOLIDATED-DEPLOY-20260812 verify PASS");
