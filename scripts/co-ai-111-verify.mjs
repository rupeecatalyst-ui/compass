/**
 * CO-AI-111 / Sprint AI-11 — SARATHI Conversation Experience (static verify).
 */

import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

function mustExist(rel) {
  assert.ok(existsSync(join(root, rel)), `Missing: ${rel}`);
}

const required = [
  "src/types/enterprise-ai-conversation-experience.ts",
  "src/constants/enterprise-ai-platform/conversation-experience.ts",
  "src/lib/enterprise-ai-platform/conversation-experience/index.ts",
  "src/lib/enterprise-ai-platform/conversation-experience/turn-orchestrator.ts",
  "src/lib/enterprise-ai-platform/conversation-experience/continuity.ts",
  "src/lib/enterprise-ai-platform/conversation-experience/suggested-questions.ts",
  "src/lib/enterprise-ai-platform/conversation-experience/readiness.ts",
  "src/components/catalyst-one/sarathi/index.ts",
  "src/components/catalyst-one/sarathi/sarathi-conversation-workspace.tsx",
  "src/components/catalyst-one/sarathi/conversation-message-list.tsx",
  "src/components/catalyst-one/sarathi/conversation-composer.tsx",
  "src/components/catalyst-one/sarathi/typing-indicator.tsx",
  "src/components/catalyst-one/sarathi/suggested-questions-bar.tsx",
  "src/components/catalyst-one/sarathi/action-proposal-cards.tsx",
  "src/app/(dashboard)/sarathi/page.tsx",
  "docs/co-ai-111/CO-AI-111-ARCHITECTURE-REPORT.md",
  "docs/co-ai-111/CO-AI-111-BUSINESS-CERTIFICATION-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "runEaiSarathiConversationTurn",
  "resolveEaiSarathiSuggestedQuestions",
  "loadEaiSarathiContinuityFromStorage",
  "saveEaiSarathiContinuityToStorage",
  "runEaiConversationExperienceReadiness",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const orchestrator = read(
  "src/lib/enterprise-ai-platform/conversation-experience/turn-orchestrator.ts",
);
assert.match(orchestrator, /composeEaiResponse/);
assert.match(orchestrator, /runEaiAdvisoryReasoning/);
assert.match(orchestrator, /runEaiPlanner/);
assert.match(orchestrator, /runEaiConsultationIntelligence/);
assert.match(orchestrator, /runEaiLeadIntelligence/);
assert.match(orchestrator, /runEaiExplainabilityTrust/);
assert.match(orchestrator, /requestedToolIds:\s*\[\s*\]/);
assert.doesNotMatch(orchestrator, /prisma\.|@prisma\/client|createLead|executeWorkflow|MediaRecorder|webkitSpeechRecognition|SpeechRecognition/i);

const cards = read("src/components/catalyst-one/sarathi/action-proposal-cards.tsx");
assert.match(cards, /recommendations for you to review|never auto-executed|CRM execution disabled/i);
assert.doesNotMatch(cards, /\bonExecute\b|executeProposal|type=\"submit\".*Execute/i);

const workspace = read(
  "src/components/catalyst-one/sarathi/sarathi-conversation-workspace.tsx",
);
assert.match(workspace, /runEaiSarathiConversationTurn/);
assert.match(workspace, /TypingIndicator|typing/);
assert.doesNotMatch(workspace, /SuggestedQuestionsBar|CustomerSummaryCard|welcomeChips/);
assert.match(workspace, /ActionProposalCards/);
assert.doesNotMatch(workspace, /MediaRecorder|webkitSpeechRecognition|SpeechRecognition|getUserMedia/i);

const constants = read("src/constants/enterprise-ai-platform/conversation-experience.ts");
assert.match(constants, /text-only/i);
assert.match(constants, /3\.3\.0-reasoning-001|3\.2\.0-vision-w1|3\.1\.0-ux002|3\.0\.0-ux001|2\.0\.0-refine|1\.0\.0-ai11/);
assert.match(constants, /EAI_SARATHI_SUGGESTED_QUESTIONS/);
assert.match(constants, /EAI_SARATHI_WELCOME/);
assert.match(workspace, /emitActionProposals/);
assert.doesNotMatch(workspace, /Enterprise AI Platform/);
assert.match(workspace, /proposalsUnlockedRef|readyForSummary/);
assert.match(workspace, /TypingIndicator|SARATHI is thinking|awaitSarathiNaturalThinkFloor|streamSarathiFacingText/);
assert.doesNotMatch(workspace, /typingDelayMs/);
assert.doesNotMatch(workspace, /SuggestedQuestionsBar|CustomerSummaryCard|welcomeChips/);
assert.doesNotMatch(workspace, /Yes, that summary is correct/);

const version = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(version, /1\.17\.0-ai16/);
assert.match(version, /conversation-experience/);

const routes = read("src/constants/routes.ts");
assert.match(routes, /SARATHI:\s*[\"']\/sarathi[\"']/);

const aiAssistant = read("src/app/(dashboard)/ai-assistant/page.tsx");
assert.match(aiAssistant, /redirect/);
assert.match(aiAssistant, /ROUTES\.SARATHI/);

assert.equal(
  existsSync(join(root, "src/components/catalyst-one/sarathi")),
  true,
  "SARATHI Conversation UI must exist in AI-11",
);

console.log("CO-AI-111 SARATHI Conversation Experience verify: PASS");
console.log("  Screen · History · Typing · Continuity · Suggestions · Adaptive · Micro/Tone · Proposal cards");
console.log("  Text only · Platform-orchestrated · No Voice · No CRM/Workflow execution");
