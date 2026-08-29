#!/usr/bin/env node
/**
 * Lighthouse PWA audit helper — run after `npm run build && npm run start`.
 * Requires: npx lighthouse (downloads on first use).
 */
import { spawnSync } from "node:child_process";
import { existsSync } from "node:fs";

const url = process.env.COMPASS_LIGHTHOUSE_URL || "http://localhost:3001/";
const out = "lighthouse-pwa-report.html";

if (!existsSync("public/sw.js")) {
  console.error("Run npm run prebuild first.");
  process.exit(1);
}

const args = [
  url,
  "--only-categories=performance,accessibility,best-practices,pwa",
  "--preset=desktop",
  `--output=html`,
  `--output-path=${out}`,
  "--quiet",
];

const mobileArgs = [
  url,
  "--only-categories=performance,accessibility,best-practices,pwa",
  "--preset=perf",
  "--form-factor=mobile",
  `--output=json`,
  `--output-path=lighthouse-pwa-mobile.json`,
  "--quiet",
];

console.log("Running Lighthouse PWA audit for", url);
const desktop = spawnSync("npx", ["lighthouse", ...args], { stdio: "inherit", shell: true });
const mobile = spawnSync("npx", ["lighthouse", ...mobileArgs], { stdio: "inherit", shell: true });

if (desktop.status !== 0 || mobile.status !== 0) {
  process.exit(desktop.status || mobile.status || 1);
}

console.log(`Reports: ${out}, lighthouse-pwa-mobile.json`);
