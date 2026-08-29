#!/usr/bin/env node
/**
 * CO-COMPASS-PWA-001 — PWA boundary verifier (engineering gate).
 */
import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = join(process.cwd());

function read(rel) {
  const full = join(root, rel);
  assert.ok(existsSync(full), `Missing: ${rel}`);
  return readFileSync(full, "utf8");
}

const manifest = read("src/app/manifest.ts");
const pwaConfig = read("src/config/pwa.ts");
const swTemplate = read("public/sw.template.js");
const layout = read("src/app/layout.tsx");
const install = read("src/components/pwa/pwa-install-prompt.tsx");
const register = read("src/components/pwa/pwa-service-worker-register.tsx");

assert.match(manifest, /pwaConfig\.name/);
assert.match(pwaConfig, /COMPASS by Rupee Catalyst/);
assert.match(pwaConfig, /shortName:\s*"COMPASS"/);
assert.match(manifest, /display:\s*pwaConfig\.display|display:.*standalone/);
assert.match(pwaConfig, /portrait-primary/);
assert.match(manifest, /pwaConfig\.orientation/);
assert.match(pwaConfig, /#06080d/);
assert.match(swTemplate, /\/api\//);
assert.match(swTemplate, /isSensitiveRequest/);
assert.match(swTemplate, /Never cache API or customer data/i);
assert.match(swTemplate, /offline\.html/);
assert.doesNotMatch(swTemplate, /caches\.put.*api/i);
assert.match(layout, /appleWebApp/);
assert.match(layout, /apple-touch-icon/);
assert.match(install, /beforeinstallprompt/);
assert.match(install, /Not now/);
assert.match(pwaConfig, /Add to Home Screen/i);
assert.match(register, /\.register\("\/sw\.js"/);
assert.match(register, /production/);

const requiredIcons = [
  "public/pwa/icons/icon-192x192.png",
  "public/pwa/icons/icon-512x512.png",
  "public/pwa/icons/apple-touch-icon.png",
  "public/pwa/icons/icon-512x512-maskable.png",
  "public/sw.js",
  "public/offline.html",
];
for (const icon of requiredIcons) {
  assert.ok(existsSync(join(root, icon)), `Missing generated asset: ${icon}. Run npm run prebuild`);
}

const sw = read("public/sw.js");
assert.doesNotMatch(sw, /__PWA_CACHE_VERSION__/);
assert.match(sw, /compass-pwa-/);

const markSource = join(root, "src/assets/brand/rupee-catalyst-logo-dark-mark@2x.png");
assert.ok(existsSync(markSource), "Approved mark source missing for PWA icons");

console.log("CO-COMPASS-PWA-001 verify: PASS");
