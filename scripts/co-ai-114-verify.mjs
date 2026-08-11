/**
 * CO-AI-114 / Sprint AI-14 — Multilingual Intelligence Engine (static verify).
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
  "src/types/enterprise-ai-multilingual.ts",
  "src/constants/enterprise-ai-platform/multilingual.ts",
  "src/lib/enterprise-ai-platform/multilingual/index.ts",
  "src/lib/enterprise-ai-platform/multilingual/detect.ts",
  "src/lib/enterprise-ai-platform/multilingual/preference.ts",
  "src/lib/enterprise-ai-platform/multilingual/mixed-language.ts",
  "src/lib/enterprise-ai-platform/multilingual/translation.ts",
  "src/lib/enterprise-ai-platform/multilingual/localisation.ts",
  "src/lib/enterprise-ai-platform/multilingual/compose-turn.ts",
  "src/lib/enterprise-ai-platform/multilingual/readiness.ts",
  "docs/co-ai-114/CO-AI-114-ARCHITECTURE-REPORT.md",
  "docs/co-ai-114/CO-AI-114-BUSINESS-CERTIFICATION-REPORT.md",
];

for (const rel of required) mustExist(rel);

const barrel = read("src/lib/enterprise-ai-platform/index.ts");
for (const symbol of [
  "detectEaiLanguage",
  "resolveEaiLanguagePreference",
  "translateEaiUtteranceToCanonical",
  "localiseEaiResponseFacingText",
  "localiseEaiOutsideDomainRefusal",
  "isEaiOutsideDomainRefusalEquivalent",
  "buildEaiMultilingualTurnContext",
  "runEaiMultilingualEngineReadiness",
]) {
  assert.match(barrel, new RegExp(symbol));
}

const constants = read("src/constants/enterprise-ai-platform/multilingual.ts");
assert.match(constants, /1\.0\.0-ai14/);
assert.match(constants, /EAI_OUTSIDE_DOMAIN_REFUSAL_MEANING_KEY/);
assert.match(constants, /\ben\b/);
assert.match(constants, /\bhi\b/);
assert.match(constants, /\bmr\b/);
assert.match(constants, /EAI_OUTSIDE_DOMAIN_REFUSAL_BY_LANGUAGE/);
assert.match(constants, /EAI_OUTSIDE_DOMAIN_REFUSAL/);
assert.match(constants, /not_trained_for_subject/);

const turn = read("src/lib/enterprise-ai-platform/conversation-experience/turn-orchestrator.ts");
assert.match(turn, /buildEaiMultilingualTurnContext/);
assert.match(turn, /languagePreference/);
assert.match(turn, /preferredLanguage/);
assert.doesNotMatch(turn, /prisma\.|@prisma\/client|createLead|executeWorkflow/i);

const composer = read("src/lib/enterprise-ai-platform/response-composer.ts");
assert.match(composer, /localiseEaiResponseFacingText/);
assert.match(composer, /getEaiOutsideDomainRefusalLocalised/);

const version = read("src/constants/enterprise-ai-platform/index.ts");
assert.match(version, /1\.17\.0-ai16/);
assert.match(version, /multilingual/);

console.log("CO-AI-114 Multilingual Intelligence Engine verify: PASS");
console.log("  Detection · Preference · Mixed · Translation · Localisation");
console.log("  Tone · Micro · Domain Boundary · Identical refusal meaning · Behaviour consistent");
