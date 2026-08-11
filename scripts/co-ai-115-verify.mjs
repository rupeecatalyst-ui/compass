/**
 * CO-AI-115 / Sprint AI-15 — Enterprise Conversation Memory & Learning (static verify).
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
  "src/types/enterprise-ai-conversation-memory.ts",
  "src/constants/enterprise-ai-platform/conversation-memory.ts",
  "src/lib/enterprise-ai-platform/conversation-memory/index.ts",
  "src/lib/enterprise-ai-platform/conversation-memory/store.ts",
  "src/lib/enterprise-ai-platform/conversation-memory/create.ts",
  "src/lib/enterprise-ai-platform/conversation-memory/project.ts",
  "src/lib/enterprise-ai-platform/conversation-memory/confidence.ts",
  "src/lib/enterprise-ai-platform/conversation-memory/expiry.ts",
  "src/lib/enterprise-ai-platform/conversation-memory/validation.ts",
  "src/lib/enterprise-ai-platform/conversation-memory/learning-audit.ts",
  "src/lib/enterprise-ai-platform/conversation-memory/update-from-turn.ts",
  "src/lib/enterprise-ai-platform/conversation-memory/readiness.ts",
  "docs/co-ai-115/CO-AI-115-ARCHITECTURE-REPORT.md",
  "docs/co-ai-115/CO-AI-115-BUSINESS-CERTIFICATION-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "resolveEaiEnterpriseConversationMemory",
  "updateEaiEnterpriseMemoryFromTurn",
  "validateEaiEnterpriseConversationMemory",
  "expireEaiEnterpriseConversationMemory",
  "computeEaiMemoryConfidence",
  "projectEaiEnterpriseMemoryToCompact",
  "runEaiConversationMemoryEngineReadiness",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const constants = read("src/constants/enterprise-ai-platform/conversation-memory.ts");
assert.match(constants, /1\.0\.0-ai15/);
assert.match(constants, /Never perform automatic online learning/i);
assert.match(constants, /Never modify enterprise rules/i);

const update = read("src/lib/enterprise-ai-platform/conversation-memory/update-from-turn.ts");
assert.match(update, /controlled_explicit|refresh_from_turn/);
assert.match(update, /executionForbidden/);
assert.match(update, /never automatic online learning/i);
assert.doesNotMatch(update, /prisma\.|@prisma\/client|createLead|executeWorkflow|automaticOnlineLearning:\s*true/i);

const turn = read("src/lib/enterprise-ai-platform/conversation-experience/turn-orchestrator.ts");
assert.match(turn, /resolveEaiEnterpriseConversationMemory/);
assert.match(turn, /updateEaiEnterpriseMemoryFromTurn/);
assert.match(turn, /enterpriseMemoryId/);
assert.match(turn, /conversationMemory/);

const version = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(version, /1\.17\.0-ai16/);
assert.match(version, /conversation-memory/);

console.log("CO-AI-115 Enterprise Conversation Memory & Learning verify: PASS");
console.log("  Memory · Consultation History · Preferences · Facts · Questions");
console.log("  Recommendations · Proposals · Confidence · Expiry · Validation");
console.log("  Controlled auditable learning · No online learning · No rule mutation");
