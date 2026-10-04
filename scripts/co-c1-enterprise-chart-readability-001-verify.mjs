/**
 * CO-C1-ENTERPRISE-CHART-READABILITY-001 — targeted verification.
 * No production data, no PII, no deploy.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { bandFromRecency } from "../src/lib/relationship-heat-map/score-framework.ts";
import {
  isMeaningfulRelationshipInteraction,
  classifyMeaningfulInteractionChannel,
} from "../src/lib/relationship-heat-map/meaningful-interaction.ts";
import { countCanonicalGraphBooks } from "../src/lib/enterprise-contact-master/contact-360-relationship-graph.ts";
import {
  formatChartPercent,
  formatChartValue,
  isChartIndexLabel,
  resolveChartCategoryLabel,
} from "../src/lib/enterprise-chart-readability/format.ts";
import { formatINRCompact, formatCount } from "../src/lib/format-currency.ts";
import { ENTERPRISE_CHART_INVENTORY } from "../src/constants/enterprise-chart-inventory.ts";
import { RELATIONSHIP_HEAT_MAP_HOW_CALCULATED } from "../src/constants/relationship-heat-map/index.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

let failed = 0;
function ok(msg) {
  console.log(`PASS  ${msg}`);
}
function fail(msg) {
  failed += 1;
  console.error(`FAIL  ${msg}`);
}

const required = [
  "src/types/enterprise-chart-readability.ts",
  "src/constants/enterprise-chart-readability.ts",
  "src/constants/enterprise-chart-inventory.ts",
  "src/lib/enterprise-chart-readability/format.ts",
  "src/lib/enterprise-chart-readability/meta.ts",
  "src/components/enterprise/charts/enterprise-chart-frame.tsx",
  "src/components/enterprise/charts/enterprise-chart-tooltip.tsx",
  "src/components/enterprise/charts/enterprise-chart-legend.tsx",
  "src/components/enterprise/charts/enterprise-doughnut-chart.tsx",
  "src/lib/relationship-heat-map/meaningful-interaction.ts",
];
for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) ok(`exists ${rel}`);
  else fail(`missing ${rel}`);
}

{
  const cases = [
    [0, "very_active"],
    [7, "very_active"],
    [8, "active"],
    [30, "active"],
    [31, "moderate"],
    [60, "moderate"],
    [61, "needs_attention"],
    [90, "needs_attention"],
    [91, "dormant"],
    [Number.POSITIVE_INFINITY, "dormant"],
  ];
  for (const [days, expected] of cases) {
    const got = bandFromRecency(days);
    if (got === expected) ok(`bandFromRecency(${days}) = ${expected}`);
    else fail(`bandFromRecency(${days}) expected ${expected}, got ${got}`);
  }
}

{
  const highScoreStillDormant = bandFromRecency(112);
  if (highScoreStillDormant === "dormant") {
    ok("activity band stays Dormant after 90 days regardless of numeric score");
  } else {
    fail("high-score contact >90 days must still be Dormant");
  }
}

{
  const call = {
    id: "e1",
    organizationId: "org",
    eventKind: "communications",
    sourceSystem: "manual",
    sourceEventId: "x",
    title: "Completed call with customer",
    summary: null,
    payload: null,
    opportunityId: null,
    dealId: null,
    contactId: "c1",
    taskId: null,
    documentId: null,
    actorUserId: null,
    actorName: null,
    occurredAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
  };
  const view = { ...call, id: "e2", eventKind: "notes", title: "Viewed profile" };
  const sync = { ...call, id: "e3", eventKind: "workflow", title: "Contact synchronisation" };
  const stage = { ...call, id: "e4", eventKind: "stage_change", title: "Moved to Login" };
  const draft = { ...call, id: "e5", title: "Draft email unsent" };
  const taskCreate = { ...call, id: "e6", eventKind: "tasks", title: "Task created" };
  const taskDone = { ...call, id: "e7", eventKind: "tasks", title: "Follow-up completed" };

  if (isMeaningfulRelationshipInteraction(call)) ok("completed call counts");
  else fail("completed call should count");
  if (!isMeaningfulRelationshipInteraction(view)) ok("profile view excluded");
  else fail("profile view must not reset clock");
  if (!isMeaningfulRelationshipInteraction(sync)) ok("sync excluded");
  else fail("sync must not reset clock");
  if (!isMeaningfulRelationshipInteraction(stage)) ok("stage movement excluded");
  else fail("stage movement must not reset clock");
  if (!isMeaningfulRelationshipInteraction(draft)) ok("draft/unsent excluded");
  else fail("draft/unsent must not reset clock");
  if (!isMeaningfulRelationshipInteraction(taskCreate)) ok("task creation excluded");
  else fail("task creation must not reset clock");
  if (isMeaningfulRelationshipInteraction(taskDone)) ok("completed follow-up counts");
  else fail("completed follow-up should count");
  if (classifyMeaningfulInteractionChannel(call) === "Call") ok("channel Call");
  else fail("channel should be Call");
}

{
  if (formatINRCompact(1_50_00_000) === "₹1.5 Cr") ok("INR compact Cr");
  else fail(`INR Cr got ${formatINRCompact(1_50_00_000)}`);
  if (formatINRCompact(2_50_000) === "₹2.5 L") ok("INR compact L");
  else fail(`INR L got ${formatINRCompact(2_50_000)}`);
  if (formatINRCompact(12_000) === "₹12.0 K") ok("INR compact K");
  else fail(`INR K got ${formatINRCompact(12_000)}`);
  if (formatCount(1234567) === "12,34,567") ok("en-IN count");
  else fail(`count got ${formatCount(1234567)}`);
  if (formatChartValue(1500000, "inr") === "₹15.0 L") ok("chart INR formatter");
  else fail(`chart INR got ${formatChartValue(1500000, "inr")}`);
  if (formatChartPercent(1, 4) === "25%") ok("percent formatter");
  else fail(`percent got ${formatChartPercent(1, 4)}`);
}

{
  if (isChartIndexLabel("0") && isChartIndexLabel("1") && isChartIndexLabel("value")) {
    ok("index-style tooltip labels rejected");
  } else fail("index-style labels should be rejected");
  if (resolveChartCategoryLabel("0", "Category") === "Category") ok("index 0 falls back to Category");
  else fail("index 0 should not be used as category");
  if (resolveChartCategoryLabel("Home Loan", "Category") === "Home Loan") ok("named category preserved");
  else fail("named category should be preserved");
}

{
  if (ENTERPRISE_CHART_INVENTORY.length >= 15) ok(`inventory has ${ENTERPRISE_CHART_INVENTORY.length} surfaces`);
  else fail("inventory too small");
  for (const item of ENTERPRISE_CHART_INVENTORY) {
    if (!item.title || !item.path || !item.kind || !item.dataSource) {
      fail(`inventory row incomplete: ${item.id}`);
    }
  }
}

{
  const doughnut = read("src/components/enterprise/charts/enterprise-doughnut-chart.tsx");
  if (doughnut.includes("EnterpriseChartLegend") && doughnut.includes("formatChartPercent")) {
    ok("doughnut has legend and percentages");
  } else fail("doughnut missing legend or percentages");
  const legend = read("src/components/enterprise/charts/enterprise-chart-legend.tsx");
  if (legend.includes("formatChartValue") && legend.includes("md:max-w")) {
    ok("legend shows value and stacks on small screens");
  } else fail("legend missing value or responsive layout");
  const frame = read("src/components/enterprise/charts/enterprise-chart-frame.tsx");
  if (
    frame.includes("measurementDefinition") &&
    frame.includes("Enlarge") &&
    frame.includes("Loading chart") &&
    frame.includes("ENTERPRISE_CHART_EMPTY_MESSAGE")
  ) {
    ok("frame has definition, enlarge, loading and empty");
  } else fail("frame missing chrome");
  const heat = read("src/mission-control/relationship-heat-map/RelationshipHeatMap.tsx");
  if (heat.includes("How this is calculated") && heat.includes("classificationReason") && heat.includes("Open Contact 360")) {
    ok("heat map has calculation copy, drawer fields, Contact 360 link");
  } else fail("heat map missing drawer or How this is calculated");
  if (RELATIONSHIP_HEAT_MAP_HOW_CALCULATED.includes("Colour is the activity band")) {
    ok("how-calculated copy present");
  } else fail("how-calculated copy missing");
  const build = read("src/lib/relationship-heat-map/build-entities.ts");
  if (build.includes("contact.modifiedOn") || build.includes("lastActiveOn ||")) {
    fail("heat map still uses modifiedOn as activity clock");
  } else ok("heat map no longer uses modifiedOn as activity clock");
  if (build.includes("latestMeaningfulInteraction")) ok("heat map uses EAR meaningful interactions");
  else fail("heat map missing EAR meaningful interaction resolve");
  if (build.includes("countCanonicalGraphBooks") && build.includes("loadAuthorisedRelationshipBooks")) {
    ok("heat map loads authorised Opportunity and Deal books via canonical graph");
  } else fail("heat map missing canonical graph Deal scan");
  if (build.includes("listEoleOpportunitiesByCustomer") || build.includes("deals: d.opps")) {
    fail("heat map still uses EOLE-only or fabricated demo Deal counts");
  } else ok("heat map does not fabricate Deal counts from Opportunity counts");
  if (/searchDeals\([\s\S]{0,200}q:\s*contact\.name/.test(build) || build.includes("includes(contact.name")) {
    fail("heat map must not search Deals by contact name");
  } else ok("heat map Deal inventory is not name-searched");
  if (heat.includes("Not scanned on this map")) {
    fail("heat map drawer still hides Deal count");
  } else ok("heat map drawer shows Opportunity and Deal counts separately");
  if (heat.includes("heat-map-opportunity-count") && heat.includes("heat-map-deal-count")) {
    ok("heat map drawer exposes separate Opportunity and Deal fields");
  } else fail("heat map drawer missing separate count fields");
  const ei = read("src/mission-control/enterprise-intelligence/EnterpriseIntelligencePlatform.tsx");
  if (ei.includes("EnterpriseChartLegend") && ei.includes("data-enterprise-bar")) {
    ok("EI bar charts identify every colour with a permanent legend");
  } else fail("EI bar charts missing colour legend");
}

{
  const books = countCanonicalGraphBooks(
    "ct-director",
    ["co-1"],
    [
      {
        id: "opp-co",
        primaryContactId: null,
        companyId: "co-1",
        lendingExtension: {},
      },
    ],
    [
      {
        id: "deal-1",
        opportunityId: "opp-co",
        primaryContactId: null,
        companyId: "co-1",
        isDeleted: false,
      },
    ],
  );
  if (books.opportunityCount === 1 && books.dealCount === 1) {
    ok("canonical graph counts company Opportunity and Deal without name/mobile/email");
  } else {
    fail(`canonical graph counts expected 1/1 got ${books.opportunityCount}/${books.dealCount}`);
  }
  const nameWouldNotJoin = countCanonicalGraphBooks(
    "ct-director",
    [],
    [
      {
        id: "opp-other",
        primaryContactId: "someone-else",
        companyId: null,
        lendingExtension: {},
      },
    ],
    [
      {
        id: "deal-other",
        opportunityId: "opp-other",
        primaryContactId: "someone-else",
        companyId: null,
        isDeleted: false,
      },
    ],
  );
  if (nameWouldNotJoin.opportunityCount === 0 && nameWouldNotJoin.dealCount === 0) {
    ok("unrelated authorised records are not attributed by absence of canonical IDs");
  } else fail("must not count unrelated books for a contact");
}

if (failed > 0) {
  console.error(`\nRESULT  FAIL  ${failed} check(s)`);
  process.exit(1);
}
console.log("\nRESULT  PASS");
