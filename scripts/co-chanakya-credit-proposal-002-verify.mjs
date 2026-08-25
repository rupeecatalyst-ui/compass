/**
 * CO-CHANAKYA-CREDIT-PROPOSAL-002 — contract / wiring verify (engineering gate).
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
  console.log(`FAIL  ${msg}`);
}
function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

const types = read("src/types/chanakya-credit-proposal.ts");
const constants = read("src/constants/chanakya-credit-proposal/index.ts");
const gather = read("src/lib/chanakya-credit-proposal/gather-context.ts");
const compose = read("src/lib/chanakya-credit-proposal/compose-proposal.ts");
const stream = read("src/lib/chanakya-credit-proposal/stream-orchestrator.ts");
const route = read("src/app/api/chanakya/credit-proposal/stream/route.ts");
const panel = read(
  "src/components/catalyst-one/enterprise-credit-workspace/ecw-proposal-generation-panel.tsx",
);
const left = read(
  "src/components/catalyst-one/enterprise-credit-workspace/ecw-left-panel.tsx",
);
const workspace = read(
  "src/components/catalyst-one/enterprise-credit-workspace/enterprise-credit-workspace.tsx",
);

if (types.includes('"transaction"') && types.includes('"edie_facts"') && types.includes('"external_research"')) {
  ok("Evidence source contracts include S1–S6");
} else fail("Evidence source contracts incomplete");

if (
  constants.includes("Transaction information reviewed") &&
  constants.includes("Writing proposal") &&
  constants.includes("autoSendForbidden: true")
) {
  ok("Stage labels + read-only boundary constants present");
} else fail("Stage/boundary constants missing");

if (gather.includes("buildChanakyaDocumentIntelligencePack")) {
  ok("Gather uses authorized document intelligence pack");
} else fail("Gather document access contract failed");

if (
  !compose.includes("FOIR =") &&
  !compose.includes("DSCR =") &&
  compose.includes("autoSendForbidden: true") &&
  compose.includes("CHANAKYA_CREDIT_PROPOSAL_NO_EXTRACTION_NOTICE")
) {
  ok("Compose avoids fabricated ratio equations and marks auto-send forbidden");
} else fail("Compose safety contract failed");

if (
  stream.includes("type: \"stage\"") &&
  stream.includes("type: \"delta\"") &&
  !stream.includes("sleep(20000)") &&
  !stream.includes("chain of thought")
) {
  ok("Stream emits stage+delta without artificial 20s delay / CoT");
} else fail("Stream orchestrator contract failed");

if (
  route.includes("text/event-stream") &&
  route.includes("requireAccessToken") &&
  route.includes("enterpriseOpportunityApiGuard") &&
  !route.includes("send_email") &&
  !route.includes("CHATGPT_OAUTH")
) {
  ok("SSE route is authenticated Opportunity-gated and OAuth-untouched");
} else fail("SSE route contract failed");

if (left.includes("onMakeProposal") && left.includes("getProposalButtonLabel()")) {
  ok("MAKE PROPOSAL button wired via frozen label helper");
} else fail("MAKE PROPOSAL button wiring missing");

if (
  workspace.includes("EcwProposalGenerationPanel") &&
  workspace.includes("onMakeProposal")
) {
  ok("Credit Workbench mounts proposal generation panel");
} else fail("Workspace panel wiring missing");

if (panel.includes("authenticatedJsonFetch") && panel.includes("consumeSse")) {
  ok("Client consumes SSE progressively");
} else fail("Client SSE consumer missing");

// Ensure ChatGPT OAuth authorize route was not modified in this sprint scope check
const oauth = read("src/app/api/integrations/chatgpt/v1/oauth/authorize/route.ts");
if (oauth.includes("buildChatGptOAuthConsentRedirectUrl")) {
  ok("ChatGPT OAuth authorize route remains present (untouched expectation)");
} else fail("Unexpected OAuth authorize change surface");

console.log(
  failed === 0
    ? "\nCO-CHANAKYA-CREDIT-PROPOSAL-002: PASS"
    : `\nCO-CHANAKYA-CREDIT-PROPOSAL-002: FAIL (${failed})`,
);
process.exit(failed === 0 ? 0 : 1);
