/**
 * CO-WP-BAT-004 — Static verification for Opportunity Workspace resolution.
 * Run: node scripts/co-wp-bat-004-verify.mjs
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const checks = [];

function ok(name, pass, detail = "") {
  checks.push({ name, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"}  ${name}${detail ? ` — ${detail}` : ""}`);
}

const service = fs.readFileSync(
  path.join(root, "server/services/partner-gateway/partner-business.service.ts"),
  "utf8",
);
const recovery = fs.readFileSync(
  path.join(root, "../Wealth Partner App/web/src/components/business/OpportunityRecoveryScreen.tsx"),
  "utf8",
);
const detail = fs.readFileSync(
  path.join(root, "../Wealth Partner App/web/src/screens/business/OpportunityDetailScreen.tsx"),
  "utf8",
);

ok(
  "Durable placeholder persistence key",
  service.includes("partnerBusinessPlaceholder") && service.includes("writePersistedPlaceholder"),
);
ok(
  "Seed reconstruction on miss",
  service.includes("tryReconstructSeedOpportunity"),
);
ok(
  "ensureStore is async hydrate",
  service.includes("async function ensureStore") && service.includes("readPersistedPlaceholder"),
);
ok(
  "Premium recovery screen exists",
  recovery.includes("We couldn&apos;t open this Opportunity") ||
    recovery.includes("We couldn't open this Opportunity"),
);
ok(
  "Workspace uses recovery (not bare not found)",
  detail.includes("OpportunityRecoveryScreen") && !detail.includes('className="biz-error">{state.message}'),
);

const failed = checks.filter((c) => !c.pass);
console.log(`\n${checks.length - failed.length}/${checks.length} checks passed`);
process.exit(failed.length ? 1 : 0);
