#!/usr/bin/env node
/**
 * CO-CERT-005 — Script 5: Master Production Certification Runner
 *
 * Runs gates in order and prints a consolidated Executive Summary.
 * Child scripts never receive instructions to print secrets.
 *
 * Usage: node scripts/co-cert-production.mjs
 */

import { spawnSync } from "node:child_process";
import path from "node:path";
import {
  CERT_ROOT,
  exitCode,
  padLabel,
  printSection,
} from "./_lib/cert-toolkit.mjs";

const GATES = [
  { id: "infrastructure", label: "Infrastructure", script: "co-cert-env-check.mjs" },
  { id: "routes", label: "Route Certification", script: "co-cert-route-smoke.mjs" },
  { id: "integrity", label: "Data Integrity", script: "co-cert-data-integrity.mjs" },
  { id: "migrations", label: "Migration Status", script: "co-cert-migrations.mjs" },
];

function runGate(script) {
  const scriptPath = path.join(CERT_ROOT, "scripts", script);
  const result = spawnSync(process.execPath, [scriptPath], {
    cwd: CERT_ROOT,
    env: process.env,
    encoding: "utf8",
    shell: false,
  });
  const output = `${result.stdout || ""}${result.stderr || ""}`;
  const lines = output.trimEnd().split(/\r?\n/);
  // Print child output for auditability (children already redact secrets)
  if (output.trim()) {
    console.log(output.trimEnd());
  }
  const overallLine = [...lines].reverse().find((l) => l === "PASS" || l === "FAIL");
  const status = result.status === 0 && overallLine === "PASS" ? "PASS" : "FAIL";
  return { status, exitStatus: result.status ?? 1, output };
}

printSection("Catalyst One Production Certification");
console.log(`Started: ${new Date().toISOString()}`);
console.log("");

const results = {};
for (const gate of GATES) {
  console.log("");
  console.log(`>>> Running: ${gate.label}`);
  console.log("=".repeat(48));
  const outcome = runGate(gate.script);
  results[gate.id] = outcome.status;
  console.log(`>>> ${gate.label}: ${outcome.status}`);
}

// Authentication gate — derived from route smoke (login reachable) + env JWT presence.
// Full interactive login remains a manual / separate credentialed gate.
const authDerived =
  results.infrastructure === "PASS" && results.routes === "PASS" ? "PASS" : "FAIL";

printSection("Catalyst One Production Certification");
printSection("Executive Summary");

const summaryRows = [
  ["Infrastructure", results.infrastructure],
  ["Authentication", authDerived],
  ["Route Certification", results.routes],
  ["Data Integrity", results.integrity],
  ["Migration Status", results.migrations],
];

for (const [label, status] of summaryRows) {
  console.log(`${padLabel(label)}${status}`);
}

const hardFails = Object.values(results).filter((s) => s === "FAIL").length;
let recommendation = "GO";
if (hardFails > 0) {
  recommendation = hardFails >= 2 || results.infrastructure === "FAIL" ? "NO-GO" : "GO WITH OBSERVATIONS";
} else if (authDerived === "FAIL") {
  recommendation = "GO WITH OBSERVATIONS";
}

printSection("Overall Recommendation");
console.log(recommendation);

const overallPass = hardFails === 0;
process.exit(exitCode(overallPass ? "PASS" : "FAIL"));
