/**
 * CO-WP-REC-002 — Lender recommendation SSOT + Partner Deal selection (structural).
 * No production data, no deploy, no migrations.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wpRoot = path.join(path.dirname(root), "Wealth Partner App", "web");

function read(rel, base = root) {
  const p = path.join(base, rel);
  assert.ok(fs.existsSync(p), `Missing ${rel}`);
  return fs.readFileSync(p, "utf8");
}

function mustNot(hay, needle, label) {
  assert.ok(!hay.includes(needle), `${label}: forbidden "${needle}"`);
}

const master = read("server/services/partner-gateway/partner-lender-master.service.ts");
assert.match(master, /getPartnerVisibleLenderById/);
assert.match(master, /lenderRegistryService/);
assert.match(master, /NEVER call relative employee lender-registry/);
mustNot(master, "authenticatedJsonFetch", "master HTTP");
mustNot(master, "fetch(", "master fetch");

const recSvc = read("server/services/partner-gateway/partner-opportunity-recommendations.service.ts");
assert.match(recSvc, /listPublishedOptionsForPartner/);
assert.match(recSvc, /approxCibilScore/);
assert.match(recSvc, /lendingExtension/);
mustNot(recSvc, "recommendPublishedLendersFromRegistryAsync", "rec HTTP ranker");

const project = read("src/lib/enterprise-partner-recommendations/project.ts");
assert.match(project, /lenderId/);
assert.match(project, /displayName/);
assert.match(project, /approxCibilScore/);
assert.match(project, /documentReadiness/);
mustNot(project, "confidencePct", "partner DTO must not expose confidence");
mustNot(project, "score:", "partner DTO must not map numeric score");

const recTypes = read("src/types/enterprise-partner-recommendations.ts");
mustNot(recTypes, "confidencePct", "types confidence");
mustNot(recTypes, "score:", "types score");
assert.match(recTypes, /lenderId: string/);
assert.match(recTypes, /displayName: string/);

const lendersSvc = read("server/services/partner-gateway/partner-opportunity-lenders.service.ts");
assert.match(lendersSvc, /enterpriseDealService.createDeal/);
assert.match(lendersSvc, /grossStage: "identified"/);
assert.match(lendersSvc, /partnerLenderSelection/);
assert.match(lendersSvc, /sourceRaw !== "saarthi"/);
assert.match(lendersSvc, /sourceRaw !== "manual"/);
assert.match(lendersSvc, /getPartnerVisibleLenderById/);
mustNot(lendersSvc, "WealthPartnerLender", "parallel WP lender table");

const route = read("src/app/api/partner/opportunities/[opportunityId]/lenders/route.ts");
assert.match(route, /requirePartnerAccessToken/);
assert.match(route, /partnerOpportunityLendersService/);
mustNot(route, "/api/lender-registry", "route employee API");
mustNot(route, "/api/enterprise-deals", "route employee deal API");

const biz = read("server/services/partner-gateway/partner-business.service.ts");
mustNot(biz, "-lender-assigned", "fabricated lender id");
assert.match(biz, /listProjectedLendersForOpportunity/);

const recRoute = read("src/app/api/partner/opportunities/[opportunityId]/recommendations/route.ts");
assert.match(recRoute, /limit/);

if (fs.existsSync(wpRoot)) {
  const screen = read("src/screens/business/LenderRecommendationScreen.tsx", wpRoot);
  assert.match(screen, /PartnerLenderSelect/);
  assert.match(screen, /partnerSelectOpportunityLender/);
  assert.match(screen, /Recommended by Saarthi/);
  assert.match(screen, /Manual recommendation/);
  mustNot(screen, "Axis Bank", "WP hardcoded Axis");
  mustNot(screen, "Bank of America", "WP hardcoded BOA");
  mustNot(screen, "Bank of India", "WP hardcoded BOI");
  mustNot(screen, "Barclays", "WP hardcoded Barclays");
  mustNot(screen, "Confidence", "WP invented confidence UI");
  mustNot(screen, "Score 81", "WP invented score UI");
  mustNot(screen, "/api/lender-registry", "WP employee lender API");

  const api = read("src/lib/enterprise-api.ts", wpRoot);
  assert.match(api, /\/api\/partner\/opportunities\/\$\{encodeURIComponent\(opportunityId\)\}\/lenders/);
  mustNot(api, "/api/lender-registry", "WP api lender-registry");
  mustNot(api, "/api/enterprise-deals", "WP api employee deals");

  const select = read("src/components/business/PartnerLenderSelect.tsx", wpRoot);
  assert.match(select, /partnerSearchLenders/);
  assert.match(select, /hit\.id/);

  const cibil = read("src/lib/opportunity-creation-cards.ts", wpRoot);
  assert.match(cibil, /approxCibilScore/);

  const docs = read("src/screens/business/OpportunityDocumentWorkspace.tsx", wpRoot);
  assert.match(docs, /Continue to Lender Recommendation/);

  const app = read("src/App.tsx", wpRoot);
  assert.match(app, /path="recommendations"/);

  console.log("WP Connect surface: PASS");
}

console.log("CO-WP-REC-002 verify: PASS");
