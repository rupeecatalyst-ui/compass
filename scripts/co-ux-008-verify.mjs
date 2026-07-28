#!/usr/bin/env node
/**
 * CO-UX-008 — Static verify for CHANAKYA Loading Experience framework.
 */
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel) {
  if (!existsSync(resolve(root, rel))) failures.push(`Missing: ${rel}`);
}

function mustContain(rel, needle) {
  const abs = resolve(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing: ${rel}`);
    return;
  }
  if (!readFileSync(abs, "utf8").includes(needle)) {
    failures.push(`${rel} missing "${needle}"`);
  }
}

mustExist("src/components/catalyst-one/chanakya-loading/chanakya-loading-experience.tsx");
mustExist("src/components/catalyst-one/chanakya-loading/enterprise-loading-surface.tsx");
mustExist("src/lib/chanakya-loading/compose-messages.ts");
mustExist("src/lib/chanakya-loading/use-chanakya-loading-session.ts");
mustExist("src/lib/chanakya-loading/derive-live-signals.ts");
mustExist("src/constants/chanakya-loading/catalog.ts");
mustExist("src/constants/chanakya-loading/timing.ts");
mustExist("docs/co-ux-008/CO-UX-008-CHANAKYA-LOADING-READINESS-REPORT.md");
mustExist(".cursor/rules/enterprise-chanakya-loading.mdc");

mustContain("src/constants/chanakya-loading/timing.ts", "CHANAKYA_LOADING_LEVEL1_MS");
mustContain("src/constants/chanakya-loading/timing.ts", "CHANAKYA_LOADING_LEVEL2_MS");
mustContain("src/lib/chanakya-loading/compose-messages.ts", "composeChanakyaLoadingMessages");
mustContain("src/lib/chanakya-loading/derive-live-signals.ts", "composeBusinessIntelligenceSnapshot");
mustContain(
  "src/components/catalyst-one/chanakya-loading/chanakya-loading-experience.tsx",
  "CO-UX-008",
);
mustContain("src/app/loading.tsx", "ChanakyaLoadingExperience");
mustContain("src/components/auth/auth-guard.tsx", "ChanakyaLoadingExperience");
mustContain("src/app/(dashboard)/loan-journey/page.tsx", "ChanakyaLoadingExperience");
mustContain("src/app/(dashboard)/tasks/page.tsx", "ChanakyaLoadingExperience");
mustContain("src/app/(dashboard)/chanakya-radar/page.tsx", "ChanakyaLoadingExperience");

const experience = readFileSync(
  resolve(root, "src/components/catalyst-one/chanakya-loading/chanakya-loading-experience.tsx"),
  "utf8",
);
if (experience.includes("animate-spin") && experience.includes("border-t-transparent")) {
  failures.push("Full-page CHANAKYA experience must not use traditional spinner ring");
}

if (failures.length) {
  console.error("CO-UX-008 verify FAILED");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-UX-008 verify PASSED");
console.log(" - Levels, compose, EBI signals, EnterpriseLoadingSurface present");
console.log(" - Canonical ChanakyaLoadingExperience is CO-UX-008");
