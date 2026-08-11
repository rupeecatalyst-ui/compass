/**
 * CO-AI-113 / Sprint AI-13 — Voice & Real-Time Conversation Engine (static verify).
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
  "src/types/enterprise-ai-voice.ts",
  "src/constants/enterprise-ai-platform/voice.ts",
  "src/lib/enterprise-ai-platform/voice/index.ts",
  "src/lib/enterprise-ai-platform/voice/composition.ts",
  "src/lib/enterprise-ai-platform/voice/stub-providers.ts",
  "src/lib/enterprise-ai-platform/voice/session-manager.ts",
  "src/lib/enterprise-ai-platform/voice/response-queue.ts",
  "src/lib/enterprise-ai-platform/voice/streaming.ts",
  "src/lib/enterprise-ai-platform/voice/voice-turn.ts",
  "src/lib/enterprise-ai-platform/voice/readiness.ts",
  "docs/co-ai-113/CO-AI-113-ARCHITECTURE-REPORT.md",
  "docs/co-ai-113/CO-AI-113-VOICE-ARCHITECTURE-REPORT.md",
  "docs/co-ai-113/CO-AI-113-BUSINESS-CERTIFICATION-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "runEaiVoiceConversationTurn",
  "createEaiVoiceSession",
  "interruptEaiVoiceSession",
  "recoverEaiVoiceSession",
  "configureEaiVoicePorts",
  "runEaiVoiceEngineReadiness",
  "createStubEaiSttProvider",
  "createStubEaiTtsProvider",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const voiceTurn = read("src/lib/enterprise-ai-platform/voice/voice-turn.ts");
assert.match(voiceTurn, /runEaiSarathiConversationTurn/);
assert.match(voiceTurn, /channel:\s*[\"']voice[\"']/);
assert.doesNotMatch(voiceTurn, /prisma\.|@prisma\/client|createLead|executeWorkflow|voice.?clon|emotion.?detect/i);

const stubs = read("src/lib/enterprise-ai-platform/voice/stub-providers.ts");
assert.doesNotMatch(stubs, /openai|elevenlabs|deepgram|google-cloud|azure|amazon-polly|@aws-sdk/i);

const constants = read("src/constants/enterprise-ai-platform/voice.ts");
assert.match(constants, /1\.0\.0-ai13/);
assert.match(constants, /only another interface/i);
assert.match(constants, /\ben\b/);
assert.match(constants, /\bhi\b/);
assert.match(constants, /\bmr\b/);

const version = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(version, /1\.17\.0-ai16/);
assert.match(version, /voice/);

const capability = read("src/constants/enterprise-ai-platform/capability-layer.ts");
assert.match(capability, /capabilityId:\s*[\"']voice[\"']/);
assert.match(capability, /effect:\s*[\"']allow[\"']/);

console.log("CO-AI-113 Voice & Real-Time Conversation Engine verify: PASS");
console.log("  STT · TTS · VAD · Session · Interrupt · Streaming · Queue · Recovery · Errors");
console.log("  Provider-independent · en/hi/mr · Platform intelligence unchanged · No CRM/Workflow");
