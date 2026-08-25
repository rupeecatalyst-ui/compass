#!/usr/bin/env node
/**
 * CO-PRODUCTION-REGRESSION-PREVENTION-014 — Master production certification runner.
 *
 * Gates (in order):
 *   1. Clean-SHA discipline
 *   2. TypeScript (optional — CERT_SKIP_TSC=1 to skip)
 *   3. Production shell smoke (BAT-authenticated)
 *
 * BUILD PASS != PRODUCTION PASS.
 * Full `npm run build` remains a separate mandatory engineering gate before deploy.
 *
 * Usage:
 *   node scripts/co-production-regression-014-certify.mjs
 *   node --env-file=.env.local scripts/co-production-regression-014-certify.mjs
 *
 * Env:
 *   CERT_DEPLOYMENT_TARGET — e.g. catalyst-one.rupeecatalyst.com (Hostinger)
 *   CERT_RUN_BUILD=1       — also run npm run build (slow)
 *   CERT_SKIP_TSC=1        — skip tsc gate
 *   CERT_SHELL_SCREENSHOTS=1 — save smoke PNG evidence
 */

import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { CERT_ROOT, padLabel, printSection } from "./_lib/cert-toolkit.mjs";

function git(args) {
  const r = spawnSync("git", args, { cwd: CERT_ROOT, encoding: "utf8" });
  return (r.stdout || "").trim();
}

function runNode(script, extraEnv = {}) {
  const scriptPath = path.join(CERT_ROOT, "scripts", script);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: CERT_ROOT,
    env: { ...process.env, ...extraEnv },
    encoding: "utf8",
    shell: false,
  });
  return {
    exitStatus: result.status ?? 1,
    stdout: result.stdout || "",
    stderr: result.stderr || "",
    pass: result.status === 0,
  };
}

function runNpm(script) {
  const result = spawnSync("npm", ["run", script], {
    cwd: CERT_ROOT,
    env: process.env,
    encoding: "utf8",
    shell: true,
  });
  return {
    exitStatus: result.status ?? 1,
    pass: result.status === 0,
    output: `${result.stdout || ""}${result.stderr || ""}`.slice(-2000),
  };
}

function extractJson(stdout) {
  const start = stdout.lastIndexOf("{");
  if (start < 0) return null;
  try {
    return JSON.parse(stdout.slice(start));
  } catch {
    return null;
  }
}

const timestamp = new Date().toISOString();
const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
const sha = git(["rev-parse", "HEAD"]);
const shortSha = git(["rev-parse", "--short", "HEAD"]);
const message = git(["log", "-1", "--format=%s"]);
const deploymentTarget =
  process.env.CERT_DEPLOYMENT_TARGET || "https://catalyst-one.rupeecatalyst.com";

const report = {
  sprint: "CO-PRODUCTION-REGRESSION-PREVENTION-014",
  timestamp,
  A_gitSha: sha,
  B_branch: branch,
  C_deploymentTarget: deploymentTarget,
  D_buildResult: process.env.CERT_RUN_BUILD === "1" ? "NOT_RUN" : "SKIPPED — run npm run build separately",
  E_typescriptResult: "NOT_RUN",
  F_featureVerification: "NOT_RUN — run scope-specific verify scripts before deploy",
  G_productionSmoke: "NOT_RUN",
  H_criticalRoutesTested: [
    "/login",
    "/dashboard",
    "/my-deals",
    "/documents",
    "/document-center",
    "/credit-workbench",
  ],
  I_shellLayoutResult: "NOT_RUN",
  J_notificationResult: "NOT_RUN",
  K_chanakyaHeaderResult: "NOT_RUN",
  L_browserRuntimeErrors: [],
  M_finalCertificationStatus: "BLOCKED",
  commitMessage: message,
  shortSha,
  gates: {},
};

printSection("CO-PRODUCTION-REGRESSION-014 — Production Certification");
console.log(`${padLabel("Branch")}${branch}`);
console.log(`${padLabel("Git SHA")}${sha}`);
console.log(`${padLabel("Deployment target")}${deploymentTarget}`);
console.log(`${padLabel("Timestamp")}${timestamp}`);
console.log("");
console.log("BUILD PASS != PRODUCTION PASS");
console.log("");

// Gate 1 — Clean SHA
console.log(">>> Gate 1: Clean-SHA discipline");
const clean = runNode("co-production-regression-014-clean-sha.mjs", {
  CERT_DEPLOYMENT_TARGET: deploymentTarget,
});
report.gates.cleanSha = clean.pass ? "PASS" : "FAIL";
if (!clean.pass) {
  console.log(clean.stdout);
  report.M_finalCertificationStatus = "BLOCKED";
  emitReport(report);
  process.exit(1);
}

// Gate 2 — TypeScript
if (process.env.CERT_SKIP_TSC !== "1") {
  console.log(">>> Gate 2: TypeScript (npx tsc --noEmit)");
  const tsc = spawnSync("npx", ["tsc", "--noEmit"], {
    cwd: CERT_ROOT,
    encoding: "utf8",
    shell: true,
  });
  report.E_typescriptResult = tsc.status === 0 ? "PASS" : "FAIL";
  report.gates.typescript = report.E_typescriptResult;
  if (tsc.status !== 0) {
    report.M_finalCertificationStatus = "BLOCKED";
    emitReport(report);
    process.exit(1);
  }
} else {
  report.E_typescriptResult = "SKIPPED";
  report.gates.typescript = "SKIPPED";
}

// Gate 2b — optional build
if (process.env.CERT_RUN_BUILD === "1") {
  console.log(">>> Gate 2b: Production build");
  const build = runNpm("build");
  report.D_buildResult = build.pass ? "PASS" : "FAIL";
  report.gates.build = report.D_buildResult;
  if (!build.pass) {
    report.M_finalCertificationStatus = "BLOCKED";
    emitReport(report);
    process.exit(1);
  }
}

// Gate 3 — Shell smoke
console.log(">>> Gate 3: Production shell smoke (BAT)");
const smoke = runNode("co-production-regression-014-shell-smoke.mjs");
report.gates.shellSmoke = smoke.pass ? "PASS" : "FAIL";
const smokeJson = extractJson(smoke.stdout);
if (smokeJson) {
  report.G_productionSmoke = smokeJson.finalStatus || (smoke.pass ? "PASS" : "FAIL");
  report.I_shellLayoutResult = smokeJson.shell?.pass ? "PASS" : "FAIL";
  report.J_notificationResult = smokeJson.notification?.pass ? "PASS" : "FAIL";
  report.K_chanakyaHeaderResult = smokeJson.chanakyaHeader?.pass ? "PASS" : "FAIL";
  report.L_browserRuntimeErrors = smokeJson.runtime?.consoleErrors || [];
  report.smokeDetail = smokeJson;
} else {
  report.G_productionSmoke = smoke.pass ? "PASS" : "FAIL";
}

const allPass =
  report.gates.cleanSha === "PASS" &&
  (report.gates.typescript === "PASS" || report.gates.typescript === "SKIPPED") &&
  (report.D_buildResult === "PASS" || report.D_buildResult.startsWith("SKIPPED")) &&
  report.gates.shellSmoke === "PASS";

report.M_finalCertificationStatus = allPass ? "READY FOR PRODUCTION" : "BLOCKED";

emitReport(report);
process.exit(allPass ? 0 : 1);

function emitReport(r) {
  printSection("Deployment Certification Report (014)");
  console.log(`${padLabel("A. Git SHA")}${r.A_gitSha}`);
  console.log(`${padLabel("B. Branch")}${r.B_branch}`);
  console.log(`${padLabel("C. Deployment target")}${r.C_deploymentTarget}`);
  console.log(`${padLabel("D. Build result")}${r.D_buildResult}`);
  console.log(`${padLabel("E. TypeScript result")}${r.E_typescriptResult}`);
  console.log(`${padLabel("F. Feature verification")}${r.F_featureVerification}`);
  console.log(`${padLabel("G. Production smoke")}${r.G_productionSmoke}`);
  console.log(`${padLabel("H. Critical routes")}${r.H_criticalRoutesTested.join(", ")}`);
  console.log(`${padLabel("I. Shell / layout")}${r.I_shellLayoutResult}`);
  console.log(`${padLabel("J. Notification")}${r.J_notificationResult}`);
  console.log(`${padLabel("K. CHANAKYA header")}${r.K_chanakyaHeaderResult}`);
  console.log(`${padLabel("L. Runtime errors")}${r.L_browserRuntimeErrors.length}`);
  printSection("M. Final certification status");
  console.log(r.M_finalCertificationStatus);

  const outDir = path.join(CERT_ROOT, "docs", "co-production-regression-prevention-014", "reports");
  fs.mkdirSync(outDir, { recursive: true });
  const outFile = path.join(outDir, `cert-${r.shortSha}-${Date.now()}.json`);
  fs.writeFileSync(outFile, JSON.stringify(r, null, 2));
  console.log("");
  console.log(`Report written: ${outFile}`);
}
