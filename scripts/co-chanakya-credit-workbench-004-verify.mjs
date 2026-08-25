/**
 * CO-CHANAKYA-CREDIT-WORKBENCH-004 — evidence-first / RM note / separation verify.
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
const readiness = read("src/lib/chanakya-credit-proposal/derive-evidence-readiness.ts");
const internal = read("src/lib/chanakya-credit-proposal/internal-recommendations.ts");
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

if (types.includes('"rm_note"') && types.includes("ChanakyaProposalEvidenceReadiness")) {
  ok("Evidence-first readiness + rm_note source contracts present");
} else fail("Evidence-first / rm_note contracts missing");

if (
  types.includes("ChanakyaCreditProposalInternalIntelligence") &&
  types.includes('type: "intelligence"')
) {
  ok("Internal intelligence stream event contract present");
} else fail("Internal intelligence contract missing");

if (
  constants.includes("proposalReadinessDoesNotBlock: true") &&
  constants.includes("internalRecommendationsNeverAutoSend: true")
) {
  ok("Boundary flags: readiness non-blocking + internal never auto-send");
} else fail("Boundary flags missing");

if (
  readiness.includes("scoreOutOf100: null") &&
  readiness.includes("blocksProposal: false")
) {
  ok("Evidence readiness uses qualitative levels (no fabricated score)");
} else fail("Evidence readiness score policy failed");

if (
  internal.includes("GST Returns") &&
  internal.includes("Bank Statements") &&
  gather.includes("intelligence") &&
  compose.includes("As represented by the RM")
) {
  ok("Internal recommendations + RM note attribution wired");
} else fail("Internal recommendations / RM attribution missing");

if (
  !stream.includes("buildProposalReadinessReview") &&
  !stream.includes("PROPOSAL_NOT_READY") &&
  stream.includes('type: "intelligence"')
) {
  ok("Stream no longer form-gates; emits intelligence event");
} else fail("Stream still form-gates or missing intelligence");

if (
  compose.includes("looksLikeUploadAsk") &&
  !compose.includes("Please provide GST") &&
  compose.includes("autoSendForbidden: true")
) {
  ok("Lender draft excludes upload CTAs and keeps auto-send forbidden");
} else fail("Lender draft separation contract failed");

if (
  left.includes("RM / Credit Officer Note") &&
  left.includes("Dictate") &&
  left.includes("canMakeProposal") &&
  !left.includes("readiness.ready")
) {
  ok("Left panel: RM note + non-blocking MAKE PROPOSAL");
} else fail("Left panel RM note / gate wiring failed");

if (
  workspace.includes("rmNote") &&
  workspace.includes("evidenceReadiness") &&
  workspace.includes("deriveChanakyaProposalEvidenceReadiness") &&
  !workspace.includes("Complete Proposal Readiness before MAKE PROPOSAL")
) {
  ok("Workspace uses evidence-first readiness and RM note");
} else fail("Workspace evidence-first wiring failed");

if (
  panel.includes("event.type === \"intelligence\"") &&
  panel.includes("Lender-facing credit proposal") &&
  panel.includes("rmNote")
) {
  ok("Generation panel separates internal vs lender surfaces");
} else fail("Generation panel separation failed");

if (
  route.includes("rmNote: body.rmNote") &&
  route.includes("requireAccessToken") &&
  !route.includes("CHATGPT_OAUTH")
) {
  ok("SSE route passes rmNote; OAuth untouched");
} else fail("SSE route contract failed");

const oauth = read("src/app/api/integrations/chatgpt/v1/oauth/authorize/route.ts");
if (oauth.includes("buildChatGptOAuthConsentRedirectUrl")) {
  ok("ChatGPT OAuth authorize route remains present");
} else fail("Unexpected OAuth authorize change surface");

console.log(
  failed === 0
    ? "\nCO-CHANAKYA-CREDIT-WORKBENCH-004: PASS"
    : `\nCO-CHANAKYA-CREDIT-WORKBENCH-004: FAIL (${failed})`,
);
process.exit(failed === 0 ? 0 : 1);
