/**
 * CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001 — targeted verification.
 * Deterministic mocks only for the conversation model. No production business-data mocks.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  redactContactValuesInText,
  textContainsCustomerContactPii,
  redactCustomerContactPiiForAiContext,
  assertNoCustomerContactPiiInAiContext,
} from "../src/lib/chanakya-enterprise-read-context/redact-pii.ts";
import {
  classifyChanakyaInappIntent,
  planChanakyaInappCompile,
} from "../src/lib/chanakya-inapp-conversation/intent.ts";
import { sessionBelongsToActor } from "../src/lib/chanakya-conversation-intelligence/follow-up.ts";
import { bindFollowUpEntity } from "../src/lib/chanakya-conversation-intelligence/follow-up.ts";
import { isChanakyaMutationRequest } from "../src/lib/chanakya-conversation-intelligence/mutation-guard.ts";
import {
  buildInterventionCards,
  collectAuthorisedAttentionRows,
} from "../src/lib/chanakya-conversation-intelligence/intervention-cards.ts";
import { buildChanakyaGroundingBrief } from "../src/lib/chanakya-conversation-intelligence/grounding-brief.ts";
import {
  configureChanakyaConversationModelPort,
  resetChanakyaConversationModelPortForTests,
} from "../src/lib/chanakya-conversation-intelligence/model-port.ts";
import { generateChanakyaConversationAnswer } from "../src/lib/chanakya-conversation-intelligence/generate-answer.ts";
import {
  actorMaySeeAttentionRow,
  scopeTransactionAttentionForActor,
} from "../src/lib/chanakya-conversation-intelligence/scope-actor.ts";
import { actorMayIncludeDocumentExcerpts } from "../src/lib/chanakya-conversation-intelligence/document-excerpt-gate.ts";
import {
  redactFacingIntelligenceText,
  containsTechnicalFallbackLeak,
} from "../src/lib/chanakya-conversation-intelligence/facing-redact.ts";
import { isChatGptOAuthRedirectUriAllowed } from "../src/lib/chatgpt-integration/oauth-redirect-uri.ts";
import {
  CHANAKYA_MUTATION_REFUSED_MESSAGE,
  CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE,
} from "../src/constants/chanakya-conversation-intelligence.ts";

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
  "src/lib/chanakya-conversation-intelligence/index.ts",
  "src/lib/chanakya-conversation-intelligence/generate-answer.ts",
  "src/lib/chanakya-conversation-intelligence/grounding-brief.ts",
  "src/lib/chanakya-conversation-intelligence/intervention-cards.ts",
  "src/lib/chanakya-conversation-intelligence/model-port.ts",
  "src/lib/chanakya-inapp-conversation/run-turn.ts",
  "src/app/api/chanakya/conversation/route.ts",
  "server/services/chatgpt-integration/compose-enterprise-read.ts",
  "server/services/chatgpt-integration/compact-enterprise-read.ts",
];
for (const rel of required) {
  if (fs.existsSync(path.join(root, rel))) ok(`exists ${rel}`);
  else fail(`missing ${rel}`);
}

{
  const turn = read("src/lib/chanakya-inapp-conversation/run-turn.ts");
  if (turn.includes("generateChanakyaConversationAnswer")) ok("run-turn uses shared generative layer");
  else fail("run-turn missing generateChanakyaConversationAnswer");
  if (turn.includes("composeChanakyaInappAnswer")) fail("run-turn still uses canned compose as facing answer");
  else ok("run-turn no longer faces canned compose-answer");
  if (turn.includes("compile_error:")) fail("run-turn still appends compile_error to facing path");
  else ok("run-turn does not append compile_error to facing answers");
  if (/prisma\.\w+\.(create|update|delete)/.test(turn)) fail("run-turn appears to mutate records");
  else ok("run-turn has no Prisma mutations");
}

{
  const panel = read(
    "src/components/catalyst-one/user-home-dashboard/chanakya-inapp-conversation-panel.tsx",
  );
  if (panel.includes("Provenance:")) fail("UI still prints provenance keys");
  else ok("UI does not print provenance keys");
  if (panel.includes("msg.evidence")) ok("UI renders user-friendly evidence links");
  else fail("UI missing evidence links");
}

{
  const route = read("src/app/api/chanakya/conversation/route.ts");
  if (route.includes("requireAccessToken")) ok("conversation POST requires access token");
  else fail("conversation route missing requireAccessToken");
  for (const method of ["GET", "PUT", "PATCH", "DELETE"]) {
    if (route.includes(`export async function ${method}`)) ok(`API handles ${method}`);
    else fail(`API missing ${method}`);
  }
  if (route.includes("CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE")) {
    ok("5xx uses temporary-unavailability copy");
  } else fail("route missing unavailability copy");
  if (route.includes("actorRole: auth.role")) ok("conversation passes actor role into compile");
  else fail("conversation route does not pass actorRole");
}

{
  const compose = read("server/services/chatgpt-integration/compose-enterprise-read.ts");
  if (compose.includes("actorRole: ctx.actor.role")) ok("GPT enterprise-read passes actor role");
  else fail("GPT compose missing actorRole");
  if (compose.includes("compileChanakyaEnterpriseReadContext")) {
    ok("GPT enterprise-read still uses canonical compile");
  } else fail("GPT compose no longer uses compile");
}

{
  const compact = read("server/services/chatgpt-integration/compact-enterprise-read.ts");
  if (compact.includes("buildInterventionCards")) ok("GPT compact reuses shared intervention cards");
  else fail("GPT compact missing shared intervention cards");
}

{
  const leaked = "Call rahul@rupeecatalyst.com or +919876543210 about DEAL-1";
  const redacted = redactContactValuesInText(leaked);
  if (!textContainsCustomerContactPii(redacted) && redacted.includes("[REDACTED]")) {
    ok("value-level email/mobile redaction");
  } else fail("value-level redaction failed");
  const nested = redactCustomerContactPiiForAiContext({
    note: "Email customer@example.com and 9876543210",
    stage: "Logged In",
  });
  try {
    assertNoCustomerContactPiiInAiContext(nested);
    ok("assertNoCustomerContactPii catches string values after redact");
  } catch {
    fail("redacted payload still fails PII assert");
  }
  const dirty = { note: "reach me at dirty@example.com" };
  let threw = false;
  try {
    assertNoCustomerContactPiiInAiContext(dirty);
  } catch {
    threw = true;
  }
  if (threw) ok("unredacted email in free text is blocked");
  else fail("unredacted email in free text was not blocked");
}

{
  const facing = redactFacingIntelligenceText(
    "See /api/chanakya/conversation Provenance: radar_join compile_error:FAIL NOT_AVAILABLE [stub] Acknowledged",
  );
  if (containsTechnicalFallbackLeak(facing)) fail("technical fallback still in facing text");
  else ok("facing redaction strips technical fallbacks");
}

{
  if (isChanakyaMutationRequest("Please assign this deal to Priya and send an email")) {
    ok("mutation request detected");
  } else fail("mutation request not detected");
  if (!isChanakyaMutationRequest("Which business loans need intervention?")) {
    ok("read question is not a mutation");
  } else fail("read question falsely flagged as mutation");
}

{
  const cards = buildInterventionCards({
    transactionAttention: {
      lists: {
        priorityList: [
          {
            customerName: "Aarav Sharma",
            companyName: "Sharma Traders",
            productLabel: "Business Loan",
            lender: "HDFC Bank",
            opportunityNumber: "OPP-2026-000060",
            dealNumber: "DEAL-2026-000082",
            dealId: "deal_082",
            opportunityId: "opp_060",
            stageLabel: "Logged In – WIP",
            idleDays: 11,
            daysInStage: 11,
            ownerLabel: "Priya Nair",
            pendingDocs: 2,
            openTasks: 1,
            latestActivityLabel: "Lender queried bank statements",
            why: ["Pending bank statements. SLA ageing 11 days."],
            primaryOwnerUserId: "user_priya",
            relationshipManagerUserId: "user_priya",
          },
        ],
      },
    },
    compiledAt: "2026-09-01T20:00:00.000Z",
    liveTrusted: true,
    productFilter: "business_loan",
  });
  if (cards.length === 1 && cards[0].dealRef === "DEAL-2026-000082") ok("intervention card from live-shaped lists");
  else fail("intervention card missing from lists.priorityList");
  if (cards[0]?.assignedRcEmployee === "Priya Nair" && cards[0]?.daysInStage === 11) {
    ok("intervention card includes RC employee and days in stage");
  } else fail("intervention card missing required operational fields");
  if (cards[0]?.href?.includes("/deals/")) ok("evidence href opens Deal workspace");
  else fail("evidence href is not a Deal workspace link");
}

{
  const bound = bindFollowUpEntity({
    message: "Why is the first one stuck?",
    requestEntity: {},
    sessionEntity: {},
    focusCards: [
      {
        customerName: "Aarav Sharma",
        companyName: "Sharma Traders",
        product: "Business Loan",
        lender: "HDFC Bank",
        opportunityRef: "OPP-2026-000060",
        dealRef: "DEAL-2026-000082",
        opportunityId: "opp_060",
        dealId: "deal_082",
        stage: "Logged In – WIP",
        daysInStage: 11,
        assignedRcEmployee: "Priya Nair",
        slaOrExpectedDate: "SLA ageing",
        pendingDocuments: 2,
        pendingTasks: 1,
        latestActivity: "Lender queried bank statements",
        reason: "Pending bank statements",
        recommendedNextAction: "Collect documents",
        lastUpdated: "2026-09-01T20:00:00.000Z",
        freshness: "live",
        href: "/deals/deal_082",
      },
    ],
  });
  if (bound.dealId === "deal_082") ok("multi-turn binds first intervention deal");
  else fail("follow-up did not bind first deal");

  const who = classifyChanakyaInappIntent("Who is handling it?");
  if (who === "who_handles") ok("who is handling it → who_handles");
  else fail(`who is handling it mapped to ${who}`);
  const compare = classifyChanakyaInappIntent("Compare it with similar cases.");
  if (compare === "compare_similar") ok("compare similar cases intent");
  else fail(`compare mapped to ${compare}`);
  const ask = classifyChanakyaInappIntent("What should I ask them to do?");
  if (ask === "what_next") ok("what should I ask them to do → what_next");
  else fail(`ask-them mapped to ${ask}`);
  if (classifyChanakyaInappIntent("Which business loans need intervention?") === "intervention_queue") {
    ok("intervention queue intent preserved");
  } else fail("intervention queue intent broken");
}

{
  if (
    sessionBelongsToActor({
      sessionActorUserId: "u1",
      sessionOrganizationId: "org1",
      actorUserId: "u1",
      organizationId: "org1",
    })
  ) {
    ok("session belongs to same actor+org");
  } else fail("same-actor session rejected");
  if (
    !sessionBelongsToActor({
      sessionActorUserId: "u1",
      sessionOrganizationId: "org1",
      actorUserId: "u2",
      organizationId: "org1",
    })
  ) {
    ok("cross-user session id reuse rejected");
  } else fail("cross-user session leakage possible");
  if (
    !sessionBelongsToActor({
      sessionActorUserId: "u1",
      sessionOrganizationId: "org1",
      actorUserId: "u1",
      organizationId: "org2",
    })
  ) {
    ok("cross-org session reuse rejected");
  } else fail("cross-org session leakage possible");
}

{
  const priyaRow = {
    dealId: "deal_082",
    primaryOwnerUserId: "user_priya",
    relationshipManagerUserId: "user_priya",
    ownerLabel: "Priya Nair",
    customerName: "Aarav Sharma",
  };
  const otherRow = {
    dealId: "deal_099",
    primaryOwnerUserId: "user_other",
    relationshipManagerUserId: "user_other",
    ownerLabel: "Other RM",
    customerName: "Hidden Co",
  };
  const adminSeesOther = actorMaySeeAttentionRow(
    { userId: "rahul", role: "SUPER_ADMIN" },
    otherRow,
  );
  const analystSeesOther = actorMaySeeAttentionRow(
    { userId: "user_priya", role: "ANALYST" },
    otherRow,
  );
  const analystSeesOwn = actorMaySeeAttentionRow(
    { userId: "user_priya", role: "ANALYST" },
    priyaRow,
  );
  if (adminSeesOther && analystSeesOwn && !analystSeesOther) {
    ok("hierarchy isolation: Super Admin org-wide, analyst scoped");
  } else fail("hierarchy isolation failed");

  const scoped = scopeTransactionAttentionForActor(
    { lists: { priorityList: [priyaRow, otherRow] } },
    { userId: "user_priya", role: "ANALYST" },
    ["user_priya"],
  );
  const kept = collectAuthorisedAttentionRows(scoped);
  if (kept.length === 1 && kept[0].dealId === "deal_082") ok("scoped compile lists drop unauthorised deals");
  else fail("scoped compile lists did not isolate hierarchy");
}

{
  if (actorMayIncludeDocumentExcerpts("VIEWER") && actorMayIncludeDocumentExcerpts("SUPER_ADMIN")) {
    ok("document excerpts allowed for VIEWER+");
  } else fail("document excerpt gate too strict");
  if (!actorMayIncludeDocumentExcerpts(null) && !actorMayIncludeDocumentExcerpts("not-a-role")) {
    ok("document excerpts denied without download permission");
  } else fail("document excerpt gate allowed unauthenticated extraction");
}

{
  const compile = {
    mode: "enterprise",
    organizationId: "org_1",
    compiledAt: "2026-09-01T20:00:00.000Z",
    correlationId: "corr",
    readOnly: true,
    opportunity360: null,
    deal360: null,
    domains: [],
    enterpriseSummary: { summary: "Desk needs attention on ageing logins." },
    transactionAttention: {
      isLiveTrusted: true,
      lists: {
        priorityList: [
          {
            customerName: "Aarav Sharma",
            productLabel: "Business Loan",
            lender: "HDFC Bank",
            opportunityNumber: "OPP-2026-000060",
            dealNumber: "DEAL-2026-000082",
            dealId: "deal_082",
            stageLabel: "Logged In – WIP",
            daysInStage: 11,
            ownerLabel: "Priya Nair",
            pendingDocs: 2,
            openTasks: 1,
            latestActivityLabel: "Lender queried bank statements",
            why: ["Pending bank statements."],
          },
        ],
      },
    },
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
  };
  const brief = buildChanakyaGroundingBrief({
    intent: "intervention_queue",
    entity: {},
    compile,
  });
  if (brief.liveTrusted && brief.interventionCards.length === 1) ok("grounding brief is live-trusted");
  else fail("grounding brief not live-trusted or missing cards");
  const blob = JSON.stringify(brief);
  if (textContainsCustomerContactPii(blob)) fail("grounding brief contains contact PII");
  else ok("grounding brief has no emails/mobiles");
  if (/provenance|\/api\/|NOT_AVAILABLE/.test(blob)) fail("grounding brief leaked technical keys");
  else ok("grounding brief has no provenance/endpoints");

  configureChanakyaConversationModelPort({
    async generate({ userPrompt }) {
      const jsonStart = userPrompt.indexOf("{");
      const parsed = JSON.parse(userPrompt.slice(jsonStart));
      const card = parsed.interventionCards[0];
      return `${card.customerName} at ${card.companyName || "the company"} with ${card.lender} is in ${card.stage} for ${card.daysInStage} days. ${card.assignedRcEmployee} should ${card.recommendedNextAction}`;
    },
  });
  const generated = await generateChanakyaConversationAnswer({
    question: "Which business loans need intervention?",
    brief,
    history: [],
    mutationRefused: false,
    entityRequiredMissing: false,
    dataUnavailable: false,
  });
  if (generated.modelStatus === "generated" && generated.text.includes("Aarav Sharma")) {
    ok("generative answer uses authorised grounding, not canned fallback");
  } else fail("generative answer did not use grounding");
  if (containsTechnicalFallbackLeak(generated.text)) fail("generated answer contains technical fallback");
  else ok("generated answer has no technical fallback");
  if (generated.evidence[0]?.dealRef === "DEAL-2026-000082") ok("source traceability on generated answer");
  else fail("generated answer missing evidence links");

  const unavailable = await generateChanakyaConversationAnswer({
    question: "Which business loans need intervention?",
    brief,
    history: [],
    mutationRefused: false,
    entityRequiredMissing: false,
    dataUnavailable: true,
  });
  if (
    unavailable.text === CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE &&
    unavailable.modelStatus === "unavailable"
  ) {
    ok("data failure returns plain unavailability");
  } else fail("data failure did not return unavailability");

  configureChanakyaConversationModelPort({
    async generate() {
      return null;
    },
  });
  const modelDown = await generateChanakyaConversationAnswer({
    question: "Which business loans need intervention?",
    brief,
    history: [],
    mutationRefused: false,
    entityRequiredMissing: false,
    dataUnavailable: false,
  });
  if (modelDown.text === CHANAKYA_TEMPORARY_UNAVAILABLE_MESSAGE) ok("model failure returns plain unavailability");
  else fail("model failure fabricated an answer");

  const refused = await generateChanakyaConversationAnswer({
    question: "Assign this deal to Priya",
    brief,
    history: [],
    mutationRefused: true,
    entityRequiredMissing: false,
    dataUnavailable: false,
  });
  if (refused.text === CHANAKYA_MUTATION_REFUSED_MESSAGE && refused.modelStatus === "refused") {
    ok("strict read-only refusal");
  } else fail("mutation was not refused");
  resetChanakyaConversationModelPortForTests();
}

{
  const emptyBrief = buildChanakyaGroundingBrief({
    intent: "intervention_queue",
    entity: {},
    compile: {
      mode: "enterprise",
      organizationId: "org_1",
      compiledAt: "2026-09-01T20:00:00.000Z",
      correlationId: "corr",
      readOnly: true,
      opportunity360: null,
      deal360: null,
      domains: [],
      enterpriseSummary: null,
      transactionAttention: { isLiveTrusted: true, lists: { priorityList: [] } },
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
  });
  if (emptyBrief.emptyCriteria && emptyBrief.emptyCriteria.length > 0) {
    ok("empty intervention states criteria and freshness");
  } else fail("empty intervention missing criteria");
}

{
  const allowed = isChatGptOAuthRedirectUriAllowed(
    "https://chat.openai.com/aip/g-abc123XYZ/oauth/callback",
    [],
  );
  const allowedChatgpt = isChatGptOAuthRedirectUriAllowed(
    "https://chatgpt.com/aip/g-abc123XYZ/oauth/callback",
    [],
  );
  const denied = isChatGptOAuthRedirectUriAllowed("https://evil.example/aip/oauth/callback", []);
  if (allowed && allowedChatgpt && !denied) ok("OAuth builtin GPT callback patterns remain strict");
  else fail("OAuth callback allowlist regression");
}

{
  const compile = read("src/lib/chanakya-enterprise-read-context/compile.ts");
  if (compile.includes("actorMayIncludeDocumentExcerpts") && compile.includes("scopeTransactionAttentionForActor")) {
    ok("compile applies document permission and hierarchy scope");
  } else fail("compile missing document/hierarchy gates");
}

console.log("");
if (failed > 0) {
  console.error(`CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001 VERIFY FAILED (${failed})`);
  process.exit(1);
}
console.log("CO-C1-CHANAKYA-REALTIME-INTELLIGENCE-001 VERIFY PASSED");
process.exit(0);
