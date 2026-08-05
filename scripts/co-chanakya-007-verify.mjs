/**
 * CO-CHANAKYA-007 — Live Enterprise Intelligence Only (static verify).
 * Production Data Protection: asserts read-path gates; no mutation scripts.
 */
import assert from "node:assert/strict";
import { readFileSync, existsSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustExist(rel) {
  assert.ok(existsSync(join(root, rel)), `Missing: ${rel}`);
}

mustExist("src/lib/chanakya-live-intelligence/live-ssot.ts");
mustExist("docs/co-chanakya-007/CO-CHANAKYA-007-LIVE-INTELLIGENCE-READINESS-REPORT.md");
mustExist(".cursor/rules/enterprise-chanakya-live-intelligence.mdc");

const liveSsot = read("src/lib/chanakya-live-intelligence/live-ssot.ts");
assert.match(liveSsot, /CO-CHANAKYA-007/);
assert.match(liveSsot, /resolveLiveDealPortfolio/);
assert.match(liveSsot, /filterLiveActiveLoanFiles/);
assert.match(liveSsot, /isEnterpriseDealRegistryOperational/);
assert.match(liveSsot, /local_fallback/);
assert.match(liveSsot, /looksLikeDemoOrFixtureLoanFile/);
assert.ok(
  !/deleteMany|truncate|UPDATE.*SET|prisma\.\w+\.delete/i.test(liveSsot),
  "live-ssot must not mutate / delete production data",
);

const buildMessages = read("src/lib/chanakya-live-intelligence/build-messages.ts");
assert.match(buildMessages, /CO-CHANAKYA-007/);
assert.match(buildMessages, /resolveLiveDealPortfolio/);
assert.match(buildMessages, /No relevant live enterprise information/);
assert.match(buildMessages, /getLiveOpportunitiesSync/);
assert.match(buildMessages, /getAllDocumentRegistryRecords/);
assert.ok(
  !/MOCK_PRIORITY|mock-data|generateLoanFiles/i.test(buildMessages),
  "Live messages must not import mock / demo generators",
);

const bar = read("src/components/enterprise/chanakya-live-intelligence/bar.tsx");
assert.match(bar, /hydrateRadarDealFiles/);
assert.match(bar, /hydrateLiveOpportunities/);
assert.match(bar, /subscribeRadarDealSource/);
assert.ok(
  !/subscribeLoanFilesUpdated/.test(bar),
  "Bar must subscribe to Deal DAL / Radar source, not raw LoanFile local sync alone",
);

const radarSource = read("src/lib/chanakya-radar/radar-deal-source.ts");
assert.match(radarSource, /filterLiveActiveLoanFiles/);
assert.match(radarSource, /listActiveRadarDealFiles/);

const briefing = read("src/lib/chanakya-briefing-dashboard/derive-briefing.ts");
assert.match(briefing, /CO-CHANAKYA-007/);
assert.match(briefing, /composeBusinessIntelligenceSnapshot/);
assert.ok(
  !/MOCK_PRIORITY_ITEMS|MOCK_RECOMMENDATIONS|MOCK_RISKS|modules\/intelligence\/services\/mock-data/.test(
    briefing,
  ),
  "Briefing must not consume mock intelligence data",
);
assert.ok(
  !/dashboardTasks|executiveKpis|focusTiles|pendingApprovals/.test(briefing),
  "Briefing must not consume hardcoded dashboard demo KPIs",
);

const service = read("src/modules/intelligence/services/chanakya.service.ts");
assert.match(service, /ChanakyaLiveIntelligenceService/);
assert.match(service, /isDemoSeedEnabled/);
assert.match(service, /loadEbiDataContext/);

const ebiSnapshot = read("src/lib/enterprise-business-intelligence/snapshot.ts");
assert.match(ebiSnapshot, /resolveLiveDealPortfolio/);
assert.match(ebiSnapshot, /isLiveTrusted/);

const resolveWs = read("src/lib/chanakya-live-intelligence/resolve-workspace.ts");
assert.match(resolveWs, /MY_DEALS/);
assert.match(resolveWs, /return "my_deals"/);
assert.match(resolveWs, /MY_OPPORTUNITIES/);

console.log("CO-CHANAKYA-007 Live Enterprise Intelligence: PASS");
console.log(
  JSON.stringify(
    {
      liveSsot: true,
      hydrateBar: true,
      noMockBriefing: true,
      liveService: true,
      ebiTrustGate: true,
      productionDataProtection: "read-path-only",
    },
    null,
    2,
  ),
);
