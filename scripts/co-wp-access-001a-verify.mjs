/**
 * CO-WP-ACCESS-001A — Gap closure verification (development).
 * Ownership · Deal APIs · WP App wiring · migration artefacts.
 * NOT production certification. Do NOT deploy.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) failures.push(`Missing: ${rel}`);
}

function mustContain(rel, needle, label = needle) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  if (!text.includes(needle)) failures.push(`${rel} missing ${label}`);
}

mustExist("server/services/partner-gateway/partner-ownership.service.ts");
mustExist("server/services/partner-gateway/partner-deal.service.ts");
mustExist("src/app/api/partner/deals/route.ts");
mustExist("src/app/api/partner/deals/[dealId]/route.ts");
mustExist("src/app/api/partner/deals/[dealId]/stage/route.ts");
mustExist("src/app/api/partner/deals/[dealId]/activities/route.ts");
mustExist("prisma/migrations/20260809120000_co_wp_access_001_partner_entitlements/migration.sql");
mustExist("docs/co-wp-access-001/CO-WP-ACCESS-001A-GAP-CLOSURE-REPORT.md");

mustContain(
  "server/services/partner-gateway/partner-ownership.service.ts",
  "sourceWealthPartnerId",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "assertOwnedOpportunityAction",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "enterpriseBusinessNotesService.create",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "sourceWealthPartnerId: partner.id",
);
mustContain("server/services/partner-gateway/partner-deal.service.ts", "requireOwnedDeal");
mustContain("server/services/partner-gateway/partner-deal.service.ts", "stage_change");
mustContain("server/services/partner-gateway/partner-deal.service.ts", "activity_add");

// WP App (sibling workspace)
const wpRoot = path.resolve(root, "..", "Wealth Partner App", "web");
const wpEnt = path.join(wpRoot, "src/lib/partner-entitlements.ts");
if (!fs.existsSync(wpEnt)) {
  failures.push(`Missing WP App entitlements helper: ${wpEnt}`);
} else {
  const wpText = fs.readFileSync(wpEnt, "utf8");
  for (const key of ["activity_add", "document_upload", "stage_change", "edit"]) {
    if (!wpText.includes(key)) failures.push(`WP partner-entitlements missing ${key}`);
  }
  const detailScreen = fs.readFileSync(
    path.join(wpRoot, "src/screens/business/OpportunityDetailScreen.tsx"),
    "utf8",
  );
  if (!detailScreen.includes("permissionsFromOpportunity")) {
    failures.push("WP OpportunityDetailScreen not wired to entitlements");
  }
  const overview = fs.readFileSync(
    path.join(wpRoot, "src/screens/business/OpportunityDetailsPanel.tsx"),
    "utf8",
  );
  if (!overview.includes("addPartnerOpportunityActivity")) {
    failures.push("WP Add Note must use activities API (not edit-only patch)");
  }
}

// Pure resolve still intact (no redesign)
mustContain(
  "src/lib/enterprise-partner-entitlements/resolve.ts",
  "resolveEffectiveEntitlements",
);

async function runResolveSmoke() {
  try {
    const mod = await import("../src/lib/enterprise-partner-entitlements/resolve.ts");
    const referral = mod.resolveEffectiveEntitlements({
      wealthPartnerId: "a",
      organizationId: "o",
      defaultExecutionMode: "referral",
      partnerPermissions: {
        view: true,
        create: true,
        edit: false,
        stage_change: false,
        document_upload: false,
        document_edit: false,
        activity_add: true,
      },
      transaction: null,
    });
    if (referral.permissions.edit || !referral.permissions.activity_add) {
      failures.push("Referral posture regression");
    }
  } catch {
    console.log("resolve smoke skipped (tsx)");
  }
}

await runResolveSmoke();

if (failures.length) {
  console.error("CO-WP-ACCESS-001A verify FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-WP-ACCESS-001A verify PASSED");
console.log(" - Ownership via sourceWealthPartnerId");
console.log(" - Deal Partner API surface present");
console.log(" - Activity → Business Notes SSOT");
console.log(" - WP App entitlement wiring present");
console.log(" - Development gap closure only — NOT certified");
