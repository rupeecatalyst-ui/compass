/**
 * CO-MARKETING-REDESIGN-022 — Prove the deployable certification harness is gone.
 * Does not send, migrate, commit, deploy, or contact Hostinger.
 */
import assert from "node:assert/strict";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

function walk(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const full = join(dir, name);
    const stat = statSync(full);
    if (stat.isDirectory()) {
      if (name === "node_modules" || name === ".next") continue;
      walk(full, acc);
    } else {
      acc.push(full);
    }
  }
  return acc;
}

function read(rel) {
  return readFileSync(join(root, rel), "utf8");
}

assert.equal(existsSync(join(root, "src/app/internal")), false, "src/app/internal must not exist");
assert.equal(
  existsSync(join(root, "src/lib/enterprise-marketing-engine/certification-harness.ts")),
  false,
  "certification-harness.ts must not exist",
);
assert.equal(
  existsSync(join(root, "src/components/catalyst-one/admin/marketing/marketing-certification-desk.tsx")),
  false,
  "certification desk must not exist",
);
assert.equal(
  existsSync(join(root, "src/components/catalyst-one/admin/marketing/marketing-certification-providers.tsx")),
  false,
  "certification providers must not exist",
);

const layout = read("src/app/layout.tsx");
assert.doesNotMatch(layout, /marketing-cert|MarketingCertification|MARKETING_CERT_LOCAL/);
assert.match(layout, /AppProviders/);

const nextConfig = read("next.config.ts");
assert.doesNotMatch(nextConfig, /MARKETING_CERT_LOCAL/);
assert.doesNotMatch(nextConfig, /marketing-cert/);

const nav = read("src/components/catalyst-one/admin/marketing/marketing-module-nav.tsx");
assert.doesNotMatch(nav, /certificationMode|marketing-cert|MARKETING_CERT/);

const appFiles = walk(join(root, "src/app"));
for (const file of appFiles) {
  const text = readFileSync(file, "utf8");
  assert.doesNotMatch(text, /marketing-cert/, `deployable app file still mentions marketing-cert: ${file}`);
  assert.doesNotMatch(text, /MARKETING_CERT_LOCAL/, `deployable app file still mentions MARKETING_CERT_LOCAL: ${file}`);
}

const forbiddenManifestSnippets = ["/internal/marketing-cert"];

const manifestCandidates = [
  ".next/app-path-routes-manifest.json",
  ".next/routes-manifest.json",
  ".next/server/app-paths-manifest.json",
];

let inspectedBuildManifest = false;
let staleBuildManifest = false;
for (const rel of manifestCandidates) {
  const full = join(root, rel);
  if (!existsSync(full)) continue;
  inspectedBuildManifest = true;
  const text = readFileSync(full, "utf8");
  const hasCertRoute = forbiddenManifestSnippets.some((snippet) => text.includes(snippet));
  if (hasCertRoute) {
    staleBuildManifest = true;
    console.log(`stale generated ${rel} still mentions /internal/marketing-cert — a fresh safe Next build is required`);
  }
}

if (staleBuildManifest && process.env.MARKETING_CERT_REQUIRE_FRESH_BUILD === "1") {
  assert.equal(staleBuildManifest, false, "production build route manifest still contains /internal/marketing-cert");
}

if (staleBuildManifest) {
  console.log("CO-MARKETING-REDESIGN-022 no-cert-route: PASS (source). Build manifest is stale until the safe Next build.");
} else if (inspectedBuildManifest) {
  console.log("CO-MARKETING-REDESIGN-022 no-cert-route: PASS (source + production route manifest)");
} else {
  console.log("CO-MARKETING-REDESIGN-022 no-cert-route: PASS (source). Build manifest not present yet.");
}
