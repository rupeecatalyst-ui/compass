/**
 * CO-AI-G1-001 — verify Orchestrator contract layer exists (types + docs only).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => readFileSync(join(root, rel), "utf8");

assert.equal(
  existsSync(join(root, "docs/co-ai-g1-001/CO-AI-G1-001-ORCHESTRATOR-CONTRACTS.md")),
  true,
);
assert.equal(
  existsSync(join(root, "src/types/enterprise-ai-orchestrator/contracts.ts")),
  true,
);

const contracts = read("src/types/enterprise-ai-orchestrator/contracts.ts");
assert.match(contracts, /1\.0\.0-g1-001/);
assert.match(contracts, /eao\.context\.v1/);
assert.match(contracts, /eao\.request\.v1/);
assert.match(contracts, /eao\.response\.v1/);
assert.match(contracts, /eao\.tool\.request\.v1/);
assert.match(contracts, /eao\.policy\.request\.v1/);
assert.match(contracts, /eao\.memory\.v1/);
assert.match(contracts, /eao\.action_proposal\.v1/);
assert.match(contracts, /eao\.validation\.v1/);
assert.match(contracts, /eao\.audit\.v1/);
assert.match(contracts, /eao\.model_provider\.v1/);
assert.match(contracts, /Consultation Readiness|EaoConsultationReadinessSnapshot/);
assert.match(contracts, /never_auto_execute/);
assert.match(contracts, /enterprise_engines_are_ssot/);

const spec = read("docs/co-ai-g1-001/CO-AI-G1-001-ORCHESTRATOR-CONTRACTS.md");
assert.match(spec, /Sequence diagram/i);
assert.match(spec, /Component diagram/i);
assert.match(spec, /Error handling/i);
assert.match(spec, /Security considerations/i);
assert.match(spec, /Consultant Benchmark/i);
assert.doesNotMatch(spec, /Hybrid Cutover.*AUTHORISED/i);

const turn = read(
  "src/lib/enterprise-ai-platform/conversation-experience/turn-orchestrator.ts",
);

// Live turn may schedule shadow (G2-W1) behind a flag; must not use shadow for facing.
assert.match(
  turn,
  /scheduleEaoShadowAfterLiveTurn/,
);
assert.doesNotMatch(turn, /runEaoShadowInvocation\(/);
assert.doesNotMatch(turn, /facingText\s*=\s*.*shadow/i);

const { EAI_ORCHESTRATOR_CONTRACTS_VERSION } = await import(
  "../src/types/enterprise-ai-orchestrator/index.ts"
);
assert.equal(EAI_ORCHESTRATOR_CONTRACTS_VERSION, "1.0.0-g1-001");

console.log("CO-AI-G1-001 verify: PASS (contracts frozen; no live wiring)");
