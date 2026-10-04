/**
 * Marketing verifier spawn helper.
 * Executable and arguments are always passed separately. shell is always false.
 * Gate commands are statically allowlisted — never concatenated from Sheet, campaign, env, or user input.
 *
 * Node 24 on Windows returns EINVAL when spawning npm.cmd with shell:false (batch/cmd spawn restriction).
 * Therefore gates run as `process.execPath` plus a frozen argument array equivalent to the npm script.
 */
import { spawnSync } from "node:child_process";

function tsxScript(rel) {
  return Object.freeze(["--import", "tsx", rel]);
}

function nodeScript(rel) {
  return Object.freeze([rel]);
}

/** @type {ReadonlyArray<{ script: string, nodeArgs: readonly string[] }>} */
export const MARKETING_PRESTAGING_GATES = Object.freeze([
  { script: "verify:co-marketing-redesign-001", nodeArgs: tsxScript("scripts/co-marketing-redesign-001-schema-verify.mjs") },
  { script: "verify:co-marketing-redesign-002", nodeArgs: tsxScript("scripts/co-marketing-redesign-002-durability-verify.mjs") },
  { script: "verify:co-marketing-redesign-003", nodeArgs: tsxScript("scripts/co-marketing-redesign-003-sheets-snapshot-verify.mjs") },
  { script: "verify:co-marketing-redesign-004", nodeArgs: tsxScript("scripts/co-marketing-redesign-004-pacing-verify.mjs") },
  { script: "verify:co-marketing-redesign-005", nodeArgs: tsxScript("scripts/co-marketing-redesign-005-home-registry-verify.mjs") },
  { script: "verify:co-marketing-redesign-006", nodeArgs: tsxScript("scripts/co-marketing-redesign-006-builder-shell-verify.mjs") },
  { script: "verify:co-marketing-redesign-007", nodeArgs: tsxScript("scripts/co-marketing-redesign-007-visual-editor-verify.mjs") },
  { script: "verify:co-marketing-redesign-008", nodeArgs: tsxScript("scripts/co-marketing-redesign-008-preview-personalisation-verify.mjs") },
  { script: "verify:co-marketing-redesign-009", nodeArgs: tsxScript("scripts/co-marketing-redesign-009-review-controls-verify.mjs") },
  { script: "verify:co-marketing-redesign-010", nodeArgs: tsxScript("scripts/co-marketing-redesign-010-monitoring-handoff-verify.mjs") },
  { script: "verify:co-marketing-redesign-011", nodeArgs: tsxScript("scripts/co-marketing-redesign-011-assets-verify.mjs") },
  { script: "verify:co-marketing-redesign-012", nodeArgs: tsxScript("scripts/co-marketing-redesign-012-consent-suppression-verify.mjs") },
  { script: "verify:co-marketing-redesign-013", nodeArgs: tsxScript("scripts/co-marketing-redesign-013-sender-deliverability-verify.mjs") },
  { script: "verify:co-marketing-redesign-014", nodeArgs: tsxScript("scripts/co-marketing-redesign-014-provider-contracts-verify.mjs") },
  { script: "verify:co-marketing-redesign-015", nodeArgs: tsxScript("scripts/co-marketing-redesign-015-monitoring-verify.mjs") },
  { script: "verify:co-marketing-redesign-016", nodeArgs: tsxScript("scripts/co-marketing-redesign-016-qualification-verify.mjs") },
  { script: "verify:co-marketing-redesign-017", nodeArgs: tsxScript("scripts/co-marketing-redesign-017-attribution-verify.mjs") },
  { script: "verify:co-marketing-redesign-018", nodeArgs: tsxScript("scripts/co-marketing-redesign-018-multichannel-contract-verify.mjs") },
  { script: "verify:co-marketing-redesign-019", nodeArgs: tsxScript("scripts/co-marketing-redesign-019-permissions-audit-verify.mjs") },
  { script: "verify:co-marketing-redesign-020", nodeArgs: tsxScript("scripts/co-marketing-redesign-020-recovery-verify.mjs") },
  { script: "verify:co-marketing-redesign-021", nodeArgs: tsxScript("scripts/co-marketing-redesign-021-ux-accessibility-verify.mjs") },
  { script: "verify:co-marketing-mkt-01", nodeArgs: nodeScript("scripts/co-marketing-mkt-01-verify.mjs") },
  { script: "verify:co-marketing-mkt-02", nodeArgs: tsxScript("scripts/co-marketing-mkt-02-verify.mjs") },
  { script: "verify:co-marketing-mkt-03", nodeArgs: tsxScript("scripts/co-marketing-mkt-03-verify.mjs") },
  { script: "verify:co-marketing-mkt-04", nodeArgs: tsxScript("scripts/co-marketing-mkt-04-verify.mjs") },
  { script: "verify:co-marketing-mkt-05", nodeArgs: tsxScript("scripts/co-marketing-mkt-05-verify.mjs") },
  { script: "verify:co-marketing-mkt-07", nodeArgs: tsxScript("scripts/co-marketing-mkt-07-verify.mjs") },
  { script: "verify:co-marketing-mkt-08", nodeArgs: tsxScript("scripts/co-marketing-mkt-08-verify.mjs") },
  { script: "verify:co-marketing-mkt-09", nodeArgs: tsxScript("scripts/co-marketing-mkt-09-verify.mjs") },
  { script: "verify:co-marketing-mkt-10", nodeArgs: tsxScript("scripts/co-marketing-mkt-10-verify.mjs") },
  { script: "verify:co-marketing-mkt-11", nodeArgs: tsxScript("scripts/co-marketing-mkt-11-verify.mjs") },
  { script: "verify:co-marketing-mkt-12", nodeArgs: tsxScript("scripts/co-marketing-mkt-12-verify.mjs") },
  { script: "verify:co-marketing-mkt-13", nodeArgs: tsxScript("scripts/co-marketing-mkt-13-verify.mjs") },
  { script: "verify:co-marketing-activation-002", nodeArgs: nodeScript("scripts/co-marketing-activation-002-verify.mjs") },
  { script: "verify:co-marketing-campaign-durability", nodeArgs: tsxScript("scripts/co-marketing-campaign-durability-verify.mjs") },
]);

export const MARKETING_PRESTAGING_GATE_SCRIPTS = Object.freeze(
  MARKETING_PRESTAGING_GATES.map((gate) => gate.script),
);

const STATIC_SCRIPT_PATTERN = /^verify:co-marketing-[a-z0-9:-]+$/;

export function marketingNodeExecutable() {
  return process.execPath;
}

export function assertAllowlistedMarketingNpmScript(scriptName) {
  if (typeof scriptName !== "string" || !STATIC_SCRIPT_PATTERN.test(scriptName)) {
    throw new Error("Refusing non-static Marketing npm script name");
  }
  if (!MARKETING_PRESTAGING_GATE_SCRIPTS.includes(scriptName)) {
    throw new Error(`Refusing non-allowlisted npm script: ${scriptName}`);
  }
}

/**
 * Run one statically allowlisted Marketing verifier with shell:false.
 * `scriptName` must already be on MARKETING_PRESTAGING_GATE_SCRIPTS.
 */
export function runAllowlistedMarketingNpmScript(scriptName, options = {}) {
  assertAllowlistedMarketingNpmScript(scriptName);
  const gate = MARKETING_PRESTAGING_GATES.find((item) => item.script === scriptName);
  if (!gate) {
    throw new Error(`Refusing non-allowlisted npm script: ${scriptName}`);
  }
  const args = [...gate.nodeArgs];
  const run = spawnSync(process.execPath, args, {
    cwd: options.cwd,
    env: options.env,
    stdio: options.stdio ?? "inherit",
    encoding: options.encoding ?? "utf8",
    shell: false,
    windowsHide: true,
  });
  if (run.error) {
    run.status = run.status ?? 1;
  }
  return run;
}
