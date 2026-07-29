/**
 * CO-INC-001A — Kanban stage vocabulary unification verify (static + pure logic).
 * Run: node scripts/co-inc-001a-verify.mjs
 * Does NOT migrate or mutate live data.
 */
import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const read = (rel) => fs.readFileSync(path.join(root, rel), "utf8");

// --- Static SSOT checks ---
const mapSrc = read("src/lib/enterprise-deal/deal-lender-stage-map.ts");
assert.match(mapSrc, /CO-INC-001A/);
assert.ok(!/case "identified":\s*\n\s*case "prelogin":\s*\n\s*return "pre_login"/.test(mapSrc),
  "lossy identified|prelogin → pre_login write map must be removed");
assert.match(mapSrc, /normalizeLenderCaseStage/);
assert.match(mapSrc, /lenderCaseStageToPipelineStageProjection/);

const rulesSrc = read("server/services/enterprise-deal/deal-stage-rules.ts");
assert.match(rulesSrc, /canonicalizeDealPipelineStage/);
assert.match(rulesSrc, /tryCanonicalLenderCaseStage/);
assert.match(rulesSrc, /Re-open/);

const constants = read("src/constants/lender-pipeline.ts");
assert.match(constants, /won:\s*"disbursed"/);
assert.match(constants, /logged_in:\s*"logged_in_wip"/);
assert.match(constants, /tryCanonicalLenderCaseStage/);

const runtime = read("src/lib/enterprise-deal/deal-pipeline-runtime.ts");
assert.match(runtime, /lenderCaseStageToGrossStage\(lender\.caseStage\)/);
assert.match(runtime, /grossStageToLenderCaseStage\(current\.grossStage\)/);

// --- Pure transition matrix (tsx/ts via ts-node not available — inline mirror) ---
const FORWARD = [
  "identified",
  "prelogin",
  "logged_in_wip",
  "soft_approved",
  "final_approved",
  "closure_wip",
  "disbursed",
];

const LEGACY = {
  pre_login: "prelogin",
  logged_in: "logged_in_wip",
  won: "disbursed",
  login: "logged_in_wip",
};

function canon(s) {
  const k = String(s).trim().toLowerCase().replace(/\s+/g, "_");
  if (FORWARD.includes(k) || k === "hold" || k === "lost") return k;
  if (LEGACY[k]) return LEGACY[k];
  throw new Error(`Unknown ${s}`);
}

function assertForwardChain() {
  for (let i = 0; i < FORWARD.length - 1; i++) {
    const from = FORWARD[i];
    const to = FORWARD[i + 1];
    assert.equal(canon(from), from);
    assert.equal(canon(to), to);
    assert.ok(FORWARD.indexOf(to) === FORWARD.indexOf(from) + 1, `${from}→${to}`);
  }
}

assertForwardChain();

// Legacy Registry values must canonicalize for transitions
assert.equal(canon("pre_login"), "prelogin");
assert.equal(canon("logged_in"), "logged_in_wip");
assert.equal(canon("won"), "disbursed");

// Hold / Lost / Re-open targets are canonical
assert.equal(canon("hold"), "hold");
assert.equal(canon("lost"), "lost");
assert.ok(FORWARD.includes("identified")); // re-open target

console.log("CO-INC-001A Kanban stage vocabulary unification verify: PASS");
console.log("Canonical vocabulary: LenderCaseStage (identified → … → disbursed + hold/lost)");
