/**
 * Hostinger standalone packaging — copy static/public next to server.js.
 *
 * `output: "standalone"` does not include `.next/static` or `public` by default.
 * Without these copies, `/_next/static/*` and public files fail in production.
 *
 * Required layout:
 *   .next/standalone/server.js
 *   .next/standalone/.next/static/**
 *   .next/standalone/public/**
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const standaloneDir = path.join(root, ".next", "standalone");
const serverJs = path.join(standaloneDir, "server.js");

function fail(message) {
  console.error(`[standalone-assets] ${message}`);
  process.exit(1);
}

if (!fs.existsSync(serverJs)) {
  fail("missing .next/standalone/server.js — enable output: 'standalone' and re-run next build");
}

const staticSrc = path.join(root, ".next", "static");
const staticDest = path.join(standaloneDir, ".next", "static");
if (!fs.existsSync(staticSrc)) {
  fail("missing .next/static after next build");
}

fs.mkdirSync(path.dirname(staticDest), { recursive: true });
fs.cpSync(staticSrc, staticDest, { recursive: true, force: true });
console.log("[standalone-assets] copied .next/static → .next/standalone/.next/static");

const publicSrc = path.join(root, "public");
const publicDest = path.join(standaloneDir, "public");
if (fs.existsSync(publicSrc)) {
  fs.cpSync(publicSrc, publicDest, { recursive: true, force: true });
  console.log("[standalone-assets] copied public → .next/standalone/public");
} else {
  console.warn("[standalone-assets] no public/ directory — skipped");
}

console.log("[standalone-assets] packaging complete");
