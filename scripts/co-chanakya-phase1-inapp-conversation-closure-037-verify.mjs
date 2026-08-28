/**
 * CO-CHANAKYA-PHASE1-INAPP-CONVERSATION-CLOSURE-037 — targeted verification.
 * Usage: node --import tsx scripts/co-chanakya-phase1-inapp-conversation-closure-037-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  classifyChanakyaInappIntent,
  planChanakyaInappCompile,
} from "../src/lib/chanakya-inapp-conversation/intent.ts";
import { composeChanakyaInappAnswer } from "../src/lib/chanakya-inapp-conversation/compose-answer.ts";

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

// --- Files exist ---
const required = [
  "src/types/chanakya-inapp-conversation.ts",
  "src/constants/chanakya-inapp-conversation/index.ts",
  "src/lib/chanakya-inapp-conversation/intent.ts",
  "src/lib/chanakya-inapp-conversation/compose-answer.ts",
  "src/lib/chanakya-inapp-conversation/session.ts",
  "src/lib/chanakya-inapp-conversation/run-turn.ts",
  "src/lib/chanakya-inapp-conversation/client.ts",
  "src/lib/chanakya-inapp-conversation/index.ts",
  "src/app/api/chanakya/conversation/route.ts",
  "src/components/catalyst-one/user-home-dashboard/chanakya-inapp-conversation-panel.tsx",
];
for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) ok(`exists ${rel}`);
  else fail(`missing ${rel}`);
}

// --- UI no longer Guide-only stub ---
{
  const mode = read(
    "src/components/catalyst-one/user-home-dashboard/chanakya-intelligence-mode.tsx",
  );
  if (mode.includes("ChanakyaInappConversationPanel")) {
    ok("Intelligence mode mounts in-app conversation panel");
  } else fail("Intelligence mode missing ChanakyaInappConversationPanel");
  if (mode.includes("openAssistant") && mode.includes("Ask CHANAKYA anything")) {
    fail("Ask surface still opens Guide instead of conversation");
  } else ok("Ask surface is not Guide-only stub");

  const panel = read(
    "src/components/catalyst-one/user-home-dashboard/chanakya-inapp-conversation-panel.tsx",
  );
  if (panel.includes("postChanakyaInappConversationTurn")) {
    ok("Panel posts to conversation client");
  } else fail("Panel missing conversation client call");
  if (panel.includes("prompt.label") || panel.includes("sendMessage(prompt.label)")) {
    ok("Suggested chips submit prompt labels");
  } else fail("Suggested chips do not submit labels");
}

// --- API read-only boundaries ---
{
  const route = read("src/app/api/chanakya/conversation/route.ts");
  if (route.includes("runChanakyaInappConversationTurn")) {
    ok("API route uses runChanakyaInappConversationTurn");
  } else fail("API route missing turn runner");
  for (const method of ["PUT", "PATCH", "DELETE", "GET"]) {
    if (route.includes(`export async function ${method}`)) ok(`API rejects/handles ${method}`);
    else fail(`API missing ${method} handler`);
  }
  if (/updateOpportunity|createDeal|softDelete|prisma\.\w+\.(create|update|delete)/.test(route)) {
    fail("API route appears to mutate business records");
  } else ok("API route has no obvious business mutation calls");
}

// --- Intent routing ---
{
  const cases = [
    ["What should I focus on first?", "focus_first"],
    ["Which business loans need my intervention?", "intervention_queue"],
    ["Show me transactions delayed beyond SLA.", "sla_delayed"],
    ["Why is this case stuck?", "why_stuck"],
    ["What changed since yesterday?", "what_changed"],
    ["Analyse the financials of this transaction.", "analyse_financials"],
    ["Which lenders are relevant for this opportunity?", "lenders_relevant"],
    ["What should I do next?", "what_next"],
  ];
  for (const [q, intent] of cases) {
    const got = classifyChanakyaInappIntent(q);
    if (got === intent) ok(`intent: ${intent}`);
    else fail(`intent for "${q}" expected ${intent} got ${got}`);
  }

  const follow = classifyChanakyaInappIntent("What should I do next?", "why_stuck");
  if (follow === "what_next") ok("multi-turn follow-up maps to what_next");
  else fail(`follow-up intent expected what_next got ${follow}`);

  const stuckPlan = planChanakyaInappCompile("why_stuck");
  if (stuckPlan.requireEntity && stuckPlan.mode === "transaction") {
    ok("why_stuck requires entity + transaction mode");
  } else fail("why_stuck compile plan incorrect");

  const deskPlan = planChanakyaInappCompile("focus_first");
  if (!deskPlan.requireEntity && deskPlan.mode === "enterprise") {
    ok("focus_first uses enterprise desk compile");
  } else fail("focus_first compile plan incorrect");
}

// --- Compose safeguards ---
{
  const missing = composeChanakyaInappAnswer({
    intent: "why_stuck",
    question: "Why is this case stuck?",
    entity: {},
    compile: null,
    entityRequiredMissing: true,
  });
  if (/need .*Opportunity|NOT invent/i.test(missing.text)) {
    ok("Entity-required gate does not fabricate stuck reasons");
  } else fail("Entity-required gate text unexpected");
  if (missing.availabilityNotes.some((n) => /NOT_AVAILABLE/i.test(n))) {
    ok("Entity gate marks CASE_CONTEXT NOT_AVAILABLE");
  } else fail("Entity gate missing NOT_AVAILABLE note");

  const ratio = composeChanakyaInappAnswer({
    intent: "analyse_financials",
    question: "What is the FOIR for this case?",
    entity: { opportunityId: "opp_1" },
    compile: {
      mode: "opportunity",
      organizationId: "org_1",
      compiledAt: new Date().toISOString(),
      correlationId: "corr",
      readOnly: true,
      opportunity360: null,
      deal360: null,
      domains: [],
      enterpriseSummary: null,
      transactionAttention: null,
      changeIntelligence: null,
      productLenderIntelligence: null,
      creditIntelligence: null,
      transactionExecutiveSnapshot: null,
      privacy: {
        customerMobile: "REDACTED_OR_OMITTED",
        customerEmail: "REDACTED_OR_OMITTED",
        documentBinaries: "SERVER_CONTROLLED_NOT_RETURNED",
      },
      limitations: ["OCR_REQUIRED for sparse PDFs"],
    },
    entityRequiredMissing: false,
  });
  if (/FOIR is deferred to Phase 2/i.test(ratio.text)) {
    ok("FOIR deferred to Phase 2 in answer");
  } else fail("FOIR Phase-2 guard missing");
  if (!/FOIR\s*=\s*\d/i.test(ratio.text)) ok("No fabricated FOIR numeric");
  else fail("Fabricated FOIR numeric detected");

  const noCredit = composeChanakyaInappAnswer({
    intent: "analyse_financials",
    question: "Analyse the financials of this transaction.",
    entity: { opportunityId: "opp_1" },
    compile: {
      mode: "opportunity",
      organizationId: "org_1",
      compiledAt: new Date().toISOString(),
      correlationId: "corr",
      readOnly: true,
      opportunity360: null,
      deal360: null,
      domains: [],
      enterpriseSummary: null,
      transactionAttention: null,
      changeIntelligence: null,
      productLenderIntelligence: null,
      creditIntelligence: null,
      transactionExecutiveSnapshot: null,
      privacy: {
        customerMobile: "REDACTED_OR_OMITTED",
        customerEmail: "REDACTED_OR_OMITTED",
        documentBinaries: "SERVER_CONTROLLED_NOT_RETURNED",
      },
      limitations: [],
    },
    entityRequiredMissing: false,
  });
  if (/NOT_AVAILABLE/i.test(noCredit.text)) ok("Missing credit intel stays NOT_AVAILABLE");
  else fail("Missing credit intel did not stay NOT_AVAILABLE");
  if (/fabricat/i.test(noCredit.text)) ok("Explicit no-fabrication language present");
  else fail("No-fabrication language missing for empty credit intel");
}

// --- Phase-2 ratio constants present ---
{
  const constants = read("src/constants/chanakya-inapp-conversation/index.ts");
  for (const term of ["FOIR", "DSCR", "LTV", "DBR"]) {
    if (constants.includes(`"${term}"`) || constants.includes(`'${term}'`)) {
      ok(`Phase-2 term listed: ${term}`);
    } else fail(`Phase-2 term missing: ${term}`);
  }
}

console.log("");
if (failed > 0) {
  console.error(`CO-CHANAKYA-037 VERIFY FAILED (${failed})`);
  process.exit(1);
}
console.log("CO-CHANAKYA-037 VERIFY PASSED");
process.exit(0);
