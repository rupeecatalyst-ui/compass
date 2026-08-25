#!/usr/bin/env node
/**
 * CO-PRODUCTION-REGRESSION-PREVENTION-014 — Clean-SHA deployment discipline gate.
 * Ensures production deploys target a committed Git SHA, not a dirty working tree.
 *
 * Usage:
 *   node scripts/co-production-regression-014-clean-sha.mjs
 *
 * Env:
 *   CERT_STRICT_UNTRACKED=1  — FAIL if any untracked files exist (CI-style)
 */

import { spawnSync } from "node:child_process";
import { CERT_ROOT, exitCode, padLabel, printSection } from "./_lib/cert-toolkit.mjs";

function git(args) {
  const r = spawnSync("git", args, { cwd: CERT_ROOT, encoding: "utf8" });
  return (r.stdout || "").trim();
}

function gitStatusPorcelain() {
  return git(["status", "--porcelain"]);
}

function parseStatus(lines) {
  const modified = [];
  const staged = [];
  const untracked = [];
  for (const line of lines.split(/\r?\n/).filter(Boolean)) {
    const code = line.slice(0, 2);
    const file = line.slice(3).trim();
    if (code === "??") {
      untracked.push(file);
      continue;
    }
    if (code.includes("M") || code.includes("A") || code.includes("D") || code.includes("R")) {
      if (code[0] !== " ") staged.push(file);
      if (code[1] !== " ") modified.push(file);
    }
  }
  return { modified, staged, untracked };
}

const branch = git(["rev-parse", "--abbrev-ref", "HEAD"]);
const sha = git(["rev-parse", "HEAD"]);
const shortSha = git(["rev-parse", "--short", "HEAD"]);
const message = git(["log", "-1", "--format=%s"]);
const timestamp = new Date().toISOString();
const porcelain = gitStatusPorcelain();
const { modified, staged, untracked } = parseStatus(porcelain);

const strictUntracked = process.env.CERT_STRICT_UNTRACKED === "1";
const dirtyTracked = modified.length > 0 || staged.length > 0;
const hasUntracked = untracked.length > 0;

let status = "PASS";
const blockers = [];
if (dirtyTracked) {
  status = "FAIL";
  blockers.push("dirty_tracked_files");
}
if (strictUntracked && hasUntracked) {
  status = "FAIL";
  blockers.push("untracked_files_present");
}

const report = {
  sprint: "CO-PRODUCTION-REGRESSION-PREVENTION-014",
  gate: "clean-sha",
  timestamp,
  git: { branch, sha, shortSha, message },
  workingTree: {
    dirtyTracked,
    modifiedCount: modified.length,
    stagedCount: staged.length,
    untrackedCount: untracked.length,
    modified: modified.slice(0, 30),
    staged: staged.slice(0, 30),
    untracked: untracked.slice(0, 30),
  },
  deploymentTarget: process.env.CERT_DEPLOYMENT_TARGET || "(set CERT_DEPLOYMENT_TARGET before deploy)",
  status,
  blockers,
  policy:
    "Production must deploy from committed Git SHA only. Never deploy from a dirty working tree.",
};

printSection("CO-PRODUCTION-REGRESSION-014 — Clean-SHA Gate");
console.log(`${padLabel("Branch")}${branch}`);
console.log(`${padLabel("Commit SHA")}${sha}`);
console.log(`${padLabel("Short SHA")}${shortSha}`);
console.log(`${padLabel("Commit message")}${message}`);
console.log(`${padLabel("Deployment target")}${report.deploymentTarget}`);
console.log(`${padLabel("Modified tracked")}${modified.length}`);
console.log(`${padLabel("Staged")}${staged.length}`);
console.log(`${padLabel("Untracked")}${untracked.length}`);
printSection("Result");
console.log(status);
if (blockers.length) {
  console.log("");
  console.log("Blockers:", blockers.join(", "));
}
console.log("");
console.log(JSON.stringify(report, null, 2));

process.exit(exitCode(status === "PASS" ? "PASS" : "FAIL"));
