/**
 * CO-AI-117 certification evidence runner.
 * Calls EXISTING readiness / validation suites only — no new platform functionality.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { EAI_FRAMEWORK_VERSION } from "../src/constants/enterprise-ai-platform/index.ts";
import { EAI_OUTSIDE_DOMAIN_REFUSAL } from "../src/constants/enterprise-ai-platform/domain-governance.ts";
import { ensureEaiBehaviourPackScaffolds, resetEaiBehaviourPackRegistry } from "../src/lib/enterprise-ai-platform/behaviour-packs.ts";
import { resetEaiComposition } from "../src/lib/enterprise-ai-platform/composition.ts";
import { runEaiSarathiConversationTurn } from "../src/lib/enterprise-ai-platform/conversation-experience/turn-orchestrator.ts";
import { runEaiValidationPerformanceSuite } from "../src/lib/enterprise-ai-platform/validation-performance/readiness.ts";
import { runEaiConversationMemoryEngineReadiness } from "../src/lib/enterprise-ai-platform/conversation-memory/readiness.ts";
import { runEaiMultilingualEngineReadiness } from "../src/lib/enterprise-ai-platform/multilingual/readiness.ts";
import { runEaiVoiceEngineReadiness } from "../src/lib/enterprise-ai-platform/voice/readiness.ts";
import { runEaiWealthPartnerBehaviourReadiness } from "../src/lib/enterprise-ai-platform/wealth-partner-behaviour/readiness.ts";
import { runEaiConversationExperienceReadiness } from "../src/lib/enterprise-ai-platform/conversation-experience/readiness.ts";
import { isEaiOutsideDomainRefusalEquivalent } from "../src/lib/enterprise-ai-platform/multilingual/localisation.ts";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const outDir = join(root, "docs", "co-ai-117");
mkdirSync(outDir, { recursive: true });

function nowIso() {
  return new Date().toISOString();
}

async function runNamed(name, fn) {
  const started = Date.now();
  try {
    const result = await fn();
    const passed = result?.passed !== false;
    return {
      name,
      passed,
      durationMs: Date.now() - started,
      errors: result?.errors ?? [],
      warnings: result?.warnings ?? [],
      details: result?.details ?? undefined,
    };
  } catch (err) {
    return {
      name,
      passed: false,
      durationMs: Date.now() - started,
      errors: [err instanceof Error ? err.message : String(err)],
      warnings: [],
    };
  }
}

resetEaiComposition();
resetEaiBehaviourPackRegistry();
ensureEaiBehaviourPackScaffolds();

/** Business product / experience smoke — existing turn orchestrator only */
const BUSINESS_CASES = [
  { id: "balance_transfer", utterance: "I want a Balance Transfer to reduce my EMI", expectBlocked: false },
  { id: "home_loan", utterance: "I need a Home Loan for buying a house", expectBlocked: false },
  { id: "lap", utterance: "I need a Loan Against Property for business growth", expectBlocked: false },
  { id: "business_loan", utterance: "I need a Business Loan for working needs", expectBlocked: false },
  { id: "working_capital", utterance: "I need Working Capital finance for cash flow", expectBlocked: false },
  { id: "personal_loan", utterance: "I want a Personal Loan options review", expectBlocked: false },
  { id: "loan_advisory", utterance: "Advise me on home loan documentation checklist", expectBlocked: false },
  { id: "outside_domain", utterance: "Tell me a joke about politics", expectBlocked: true },
];

const businessResults = [];
for (const c of BUSINESS_CASES) {
  const turn = await runEaiSarathiConversationTurn({
    utterance: c.utterance,
    personaPackId: "sarathi_customer",
    languagePreference: "en",
  });
  const ok = c.expectBlocked
    ? turn.blocked &&
      (turn.facingText === EAI_OUTSIDE_DOMAIN_REFUSAL ||
        isEaiOutsideDomainRefusalEquivalent(turn.facingText))
    : !turn.blocked && turn.facingText.trim().length > 0;
  businessResults.push({
    id: c.id,
    passed: ok,
    blocked: turn.blocked,
    facingPreview: turn.facingText.slice(0, 100),
  });
}

const wealthPartner = await runNamed(
  "wealth_partner_behaviour",
  () => runEaiWealthPartnerBehaviourReadiness(),
);

const existingSuites = await Promise.all([
  runNamed("conversation_experience", () => runEaiConversationExperienceReadiness()),
  runNamed("voice", () => runEaiVoiceEngineReadiness()),
  runNamed("multilingual", () => runEaiMultilingualEngineReadiness()),
  runNamed("memory", () => runEaiConversationMemoryEngineReadiness()),
  runNamed("validation_performance_ai16", () => runEaiValidationPerformanceSuite()),
]);

const evidence = {
  certificationId: `eai_cert_${crypto.randomUUID()}`,
  sprint: "AI-17 / CO-AI-117",
  generatedAt: nowIso(),
  frameworkVersionUnderCertification: EAI_FRAMEWORK_VERSION,
  nature: "certification_only_no_new_features",
  governingStandards: {
    enterpriseAiConstitution: "docs/enterprise-ai/ENTERPRISE-AI-CONSTITUTION.md",
    sarathiBible: "docs/sarathi/SARATHI-BIBLE-V1.md",
    freeze: "docs/enterprise-ai/ENTERPRISE-AI-GOVERNING-STANDARDS-FREEZE.md",
  },
  businessCases: businessResults,
  existingSuiteEvidence: [...existingSuites, wealthPartner],
};

const failedBusiness = businessResults.filter((b) => !b.passed);
const failedSuites = evidence.existingSuiteEvidence.filter((s) => !s.passed);
evidence.passed = failedBusiness.length === 0 && failedSuites.length === 0;
evidence.summary = {
  businessPassed: businessResults.length - failedBusiness.length,
  businessTotal: businessResults.length,
  suitesPassed: evidence.existingSuiteEvidence.length - failedSuites.length,
  suitesTotal: evidence.existingSuiteEvidence.length,
  failedBusinessIds: failedBusiness.map((b) => b.id),
  failedSuiteNames: failedSuites.map((s) => s.name),
};

writeFileSync(
  join(outDir, "CO-AI-117-CERTIFICATION-EVIDENCE.json"),
  JSON.stringify(evidence, null, 2),
);

console.log(JSON.stringify(evidence.summary, null, 2));
if (!evidence.passed) {
  console.error("CO-AI-117 certification evidence FAILED");
  process.exit(1);
}
console.log("CO-AI-117 certification evidence PASSED");
console.log(`Framework under certification: ${EAI_FRAMEWORK_VERSION}`);
