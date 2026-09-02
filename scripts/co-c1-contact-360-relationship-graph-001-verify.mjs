/**
 * CO-C1-CONTACT-360-RELATIONSHIP-GRAPH-001 — targeted verification.
 * Canonical ID graph, no PII, no production mutation, no deploy.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  archivedContactHasActiveTransaction,
  dedupeActivityEvents,
  deriveContact360BusinessValue,
  isActiveDeal,
  namesLikelySamePerson,
  opportunityLinkedByCanonicalIds,
} from "../src/lib/enterprise-contact-master/contact-360-relationship-graph.ts";

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

function mustContain(rel, needle, label = needle) {
  if (read(rel).includes(needle)) ok(`${rel} contains ${label}`);
  else fail(`${rel} missing ${label}`);
}
function mustNotContain(rel, needle, label = needle) {
  if (!read(rel).includes(needle)) ok(`${rel} omits ${label}`);
  else fail(`${rel} must not contain ${label}`);
}

const required = [
  "src/lib/enterprise-contact-master/contact-360-relationship-graph.ts",
  "src/lib/enterprise-contact-master/compose-contact-360.ts",
  "scripts/co-c1-contact-360-relationship-graph-001-reconcile.mjs",
];
for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) ok(`exists ${rel}`);
  else fail(`missing ${rel}`);
}

const compose = "src/lib/enterprise-contact-master/compose-contact-360.ts";
const graph = "src/lib/enterprise-contact-master/contact-360-relationship-graph.ts";
const client = "src/lib/enterprise-opportunity/opportunity-api-client.ts";
const deals = "src/lib/enterprise-deal/deal-api-client.ts";
const panel = "src/components/catalyst-one/contacts/contact-360-intelligence-panel.tsx";
const modal = "src/components/catalyst-one/contacts/contact-workspace-modal.tsx";
const timeline = "src/lib/enterprise-activity-registry/transaction-timeline.ts";

mustContain(graph, "opportunityLinkedByCanonicalIds", "canonical opportunity join");
mustContain(graph, "listDealsByOpportunity", "deal join by opportunity id");
mustNotContain(graph, "q: contact.name", "name search in graph");
mustNotContain(graph, "mobilePrimary", "mobile join in graph");
mustNotContain(graph, "personalEmail", "email join in graph");
mustContain(client, "companyId?: string", "opportunity search companyId");
mustContain(client, 'params.set("companyId"', "companyId query param");
mustContain(deals, "primaryContactId?: string", "deal search by contact id");
mustNotContain(compose, "q: contact.name", "compose name deal search");
mustNotContain(compose, "includes(contact.name", "compose name includes filter");
mustContain(compose, "resolveContact360Graph", "compose uses graph resolver");
mustContain(compose, "unifiedTimeline", "unified timeline");
mustContain(compose, "archivedReadOnly", "archived read-only flag");
mustContain(compose, "activeTransactionWarning", "archived active-transaction warning");
mustContain(panel, "onSelectMeasure", "clickable snapshot");
mustContain(panel, "Unified Activity Timeline", "unified timeline UI");
mustContain(modal, 'mode: "contact_graph"', "timeline graph scope");
mustContain(modal, "contactArchived", "archived contact lock");
mustContain(timeline, 'mode: "contact_graph"', "EAR contact_graph scope");
mustContain(
  "src/lib/enterprise-company-master/company-registry.ts",
  "includeInactive",
  "historical company links",
);

{
  const companyIds = new Set(["co-1"]);
  const companyOpp = {
    id: "opp-1",
    primaryContactId: null,
    companyId: "co-1",
    lendingExtension: { participants: [] },
  };
  if (opportunityLinkedByCanonicalIds(companyOpp, "ct-director", companyIds)) {
    ok("company-mapped opportunity joins when primaryContactId is null");
  } else {
    fail("company-mapped opportunity must join by companyId");
  }

  const nameOnly = {
    id: "opp-2",
    primaryContactId: "other",
    companyId: null,
    lendingExtension: { participants: [{ id: "p1", entityId: "ct-director", name: "X", role: "guarantor", status: "active" }] },
  };
  if (opportunityLinkedByCanonicalIds(nameOnly, "ct-director", new Set())) {
    ok("participant entityId joins guarantor/co-applicant without name match");
  } else {
    fail("participant entityId must join");
  }

  const unrelated = {
    id: "opp-3",
    primaryContactId: "someone-else",
    companyId: "other-co",
    lendingExtension: {},
  };
  if (!opportunityLinkedByCanonicalIds(unrelated, "ct-director", companyIds)) {
    ok("unrelated company opportunity is excluded");
  } else {
    fail("must not join unrelated company opportunities");
  }
}

{
  const value = deriveContact360BusinessValue(
    [
      { id: "opp-a", requestedAmount: 1_000_000 },
      { id: "opp-b", requestedAmount: 2_000_000 },
    ],
    [{ opportunityId: "opp-a", requestedAmount: 1_500_000, approvedAmount: null, fulfilledAmount: null }],
  );
  if (value === 3_500_000) ok("business value uses deals plus orphan opportunity amount");
  else fail(`business value expected 3500000 got ${value}`);
}

{
  const warn = archivedContactHasActiveTransaction(
    "archived",
    [{ lifecycleStatus: "active" }],
    [],
  );
  const silent = archivedContactHasActiveTransaction(
    "archived",
    [{ lifecycleStatus: "won" }],
    [{ grossStage: "disbursed", archived: false, lifecycleStatus: "won" }],
  );
  if (warn) ok("archived + active opportunity raises data-quality warning");
  else fail("archived active transaction warning missing");
  if (!silent) ok("archived historical/disbursed-only does not warn as active");
  else fail("disbursed-only should not count as active transaction warning");
}

{
  const active = isActiveDeal({ grossStage: "login", archived: false, lifecycleStatus: "active" });
  const lost = isActiveDeal({ grossStage: "lost", archived: false, lifecycleStatus: "lost" });
  if (active && !lost) ok("active deal classification");
  else fail("active deal classification failed");
}

{
  const events = [
    { id: "a", sourceSystem: "ear", sourceEventId: "s1", occurredAt: "2026-09-02T10:00:00.000Z", eventKind: "dialogue", title: "Call" },
    { id: "b", sourceSystem: "ear", sourceEventId: "s1", occurredAt: "2026-09-02T10:00:00.000Z", eventKind: "dialogue", title: "Call" },
    { id: "c", sourceSystem: "ear", sourceEventId: "s2", occurredAt: "2026-09-02T11:00:00.000Z", eventKind: "tasks", title: "Follow up" },
  ];
  const deduped = dedupeActivityEvents(events);
  if (deduped.length === 2) ok("timeline dedupes sourceEventId across joined sources");
  else fail(`timeline dedupe expected 2 got ${deduped.length}`);
}

{
  if (namesLikelySamePerson("Nandkumar Jha", "Nand Kumar Jha")) {
    ok("display-name spelling variation recognised for lookup only");
  } else {
    fail("name variation helper failed");
  }
}

function walkFiles(dir, acc = []) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === "node_modules" || entry.name === ".git" || entry.name === ".next") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walkFiles(full, acc);
    else if (/\.(ts|tsx|js|mjs|json|md)$/i.test(entry.name)) acc.push(full);
  }
  return acc;
}

const named = "nandkumar jha";
let namedHits = 0;
const piiHits = [];
const scanRoots = [
  path.join(root, "src"),
  path.join(root, "scripts"),
];
for (const dir of scanRoots) {
  if (!fs.existsSync(dir)) continue;
  for (const file of walkFiles(dir)) {
    let text = "";
    try {
      text = fs.readFileSync(file, "utf8");
    } catch {
      continue;
    }
    if (text.toLowerCase().includes(named)) {
      const rel = path.relative(root, file).replace(/\\/g, "/");
      if (rel.includes("co-c1-contact-360-relationship-graph-001")) continue;
      namedHits += 1;
      if (/(mobile|phone|email).{0,40}nandkumar/i.test(text) || /nandkumar.{0,40}(@|mobile|email)/i.test(text)) {
        piiHits.push(rel);
      }
    }
  }
}

if (piiHits.length === 0) ok("named verification case is not stored with mobile/email in scanned sources");
else fail(`PII adjacent to named case in ${piiHits.join(", ")}`);

console.log(
  `INFO  Named verification case local source hits=${namedHits} (lookup by display name only; IDs required for graph)`,
);
console.log(
  "INFO  Live Contact 360 BAT for the named case requires an authorised session. Overnight did not match by mobile/email and did not query production.",
);
if (namedHits === 0) {
  console.log(
    "BLOCKED named-case live graph: contact record not present in local source/fixtures. Morning: open Contact 360 by canonical Contact ID after login; do not search by mobile/email.",
  );
}

if (failed > 0) {
  console.error(`\nFAILED ${failed} check(s)`);
  process.exit(1);
}
console.log("\nPASS  CO-C1-CONTACT-360-RELATIONSHIP-GRAPH-001");
