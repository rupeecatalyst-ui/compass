/**
 * CO-WP-INT-001 — Opportunity & Deal operational integration (development verify).
 * Static + contract checks. Does NOT deploy. Does NOT mint live Deals.
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

function mustNotContain(rel, needle, label = needle) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  if (text.includes(needle)) failures.push(`${rel} must not contain ${label}`);
}

// --- Catalyst One Gateway: Opportunity Registry SSOT ---
mustExist("server/services/partner-gateway/partner-business.service.ts");
mustExist("server/services/partner-gateway/partner-deal.service.ts");
mustExist("server/services/partner-gateway/partner-ownership.service.ts");
mustExist("docs/co-wp-int-001/CO-WP-INT-001-INTEGRATION-REPORT.md");

mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "enterpriseOpportunityRepository.createOpportunity",
  "create → Opportunity Registry",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "sourceWealthPartnerId: partner.id",
  "sourceWealthPartnerId on create",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "primaryContactId: contact.id",
  "ECM contact on create",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "CO-WP-INT-001 — My Business Pipeline from owned Opportunity Registry",
  "pipeline from Registry ownership",
);
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "enterpriseOpportunityRepository.updateOpportunity",
  "patch/submit Registry update",
);
mustContain(
  "server/services/partner-gateway/partner-ownership.service.ts",
  "sourceWealthPartnerId",
  "ownership via sourceWealthPartnerId",
);

// Snapshot merge on patch (do not wipe partnerCreated)
mustContain(
  "server/services/partner-gateway/partner-business.service.ts",
  "...prevSnap",
  "snapshot merge on patch",
);

// Deal: no partner create path; list/get/patch/stage/activity via Registry
mustContain(
  "server/services/partner-gateway/partner-deal.service.ts",
  "requireOwnedDeal",
  "deal ownership",
);
mustContain(
  "server/services/partner-gateway/partner-deal.service.ts",
  "enterpriseDealService.transitionDeal",
  "canonical Deal stage transition",
);
mustContain(
  "server/services/partner-gateway/partner-deal.service.ts",
  "enterpriseBusinessNotesService.create",
  "deal activity audit SSOT",
);
mustNotContain(
  "server/services/partner-gateway/partner-deal.service.ts",
  "createDeal(",
  "partner Deal create (premature mint)",
);

mustExist("src/app/api/partner/deals/route.ts");
mustExist("src/app/api/partner/deals/[dealId]/route.ts");
mustExist("src/app/api/partner/deals/[dealId]/stage/route.ts");
mustExist("src/app/api/partner/deals/[dealId]/activities/route.ts");

// Canonical stage vocabulary remains C1 lender pipeline
mustContain(
  "server/services/enterprise-deal/deal-stage-rules.ts",
  "LENDER_CASE_STAGES",
  "canonical stage model",
);

// --- Wealth Partner App ---
const wpRoot = path.resolve(root, "..", "Wealth Partner App", "web");
if (!fs.existsSync(wpRoot)) {
  failures.push(`Missing WP App workspace: ${wpRoot}`);
} else {
  const mustWp = (rel, needle, label) => {
    const full = path.join(wpRoot, rel);
    if (!fs.existsSync(full)) {
      failures.push(`Missing WP: ${rel}`);
      return;
    }
    if (needle) {
      const text = fs.readFileSync(full, "utf8");
      if (!text.includes(needle)) failures.push(`WP ${rel} missing ${label || needle}`);
    }
  };

  mustWp("src/lib/enterprise-api.ts", "partnerGetDeal", "partnerGetDeal");
  mustWp("src/lib/enterprise-api.ts", "partnerPatchDeal", "partnerPatchDeal");
  mustWp("src/lib/enterprise-api.ts", "partnerChangeDealStage", "partnerChangeDealStage");
  mustWp("src/lib/enterprise-api.ts", "partnerAddDealActivity", "partnerAddDealActivity");
  mustWp("src/lib/enterprise-api.ts", "async function partnerPatch", "partnerPatch helper");
  mustWp("src/screens/deals/DealDetailScreen.tsx", null);
  mustWp(
    "src/screens/deals/DealDetailScreen.tsx",
    "await load()",
    "reload from Gateway after mutation",
  );
  mustWp(
    "src/screens/deals/DealDetailScreen.tsx",
    "CANONICAL_DEAL_STAGES",
    "canonical stage list",
  );
  mustWp(
    "src/screens/deals/DealDetailScreen.tsx",
    "Partners do not mint Deals",
    "no premature Deal create policy copy",
  );
  mustWp("src/App.tsx", 'path="deals/:dealId"', "deal detail route");
  mustWp(
    "src/screens/deals/DealsRegistryScreen.tsx",
    "/app/deals/",
    "registry links to deal detail",
  );
  mustWp(
    "src/screens/business/OpportunityDetailScreen.tsx",
    "await reload()",
    "opportunity reload after save",
  );
  mustWp("src/lib/partner-entitlements.ts", "permissionsFromDeal", "deal entitlement presentation");
}

if (failures.length) {
  console.error("CO-WP-INT-001 VERIFY FAIL");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-WP-INT-001 VERIFY PASS");
console.log(
  JSON.stringify(
    {
      opportunity: "create/view/edit → Opportunity Registry + sourceWealthPartnerId",
      deal: "list/get/patch/stage/activity via owned Deals; no partner create",
      stages: "LenderCaseStage (C1 canonical)",
      refresh: "WP reloads from Gateway after mutations",
      deploy: "not performed",
    },
    null,
    2,
  ),
);
