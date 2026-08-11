/**
 * CO-WP-PERF-002 — Structural verification (no production writes).
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const wpRoot = path.resolve(root, "..", "Wealth Partner App", "web");

function mustInclude(filePath, needles, label) {
  const text = fs.readFileSync(filePath, "utf8");
  for (const n of needles) {
    if (!text.includes(n)) {
      console.error(`FAIL ${label}: missing ${n} in ${path.relative(root, filePath)}`);
      process.exit(1);
    }
  }
  console.log(`PASS ${label}`);
}

mustInclude(
  path.join(root, "server/services/partner-gateway/partner-request-memo.ts"),
  ["runWithPartnerRequestMemo", "memoPartnerBinding", "memoPartnerEntitlements"],
  "request-memo",
);

mustInclude(
  path.join(root, "server/services/partner-gateway/partner-pipeline-cache.ts"),
  ["readPartnerPipelineCache", "writePartnerPipelineCache", "invalidatePartnerPipelineCache"],
  "pipeline-cache",
);

mustInclude(
  path.join(root, "server/services/partner-gateway/partner-home.service.ts"),
  ["phase", "shell", "ensurePartnerOpportunityStoreForHome", "HOME_OPP_LIMIT"],
  "home-progressive",
);

// Explicitly ensure empty searchCustomers("") is gone from home
{
  const text = fs.readFileSync(
    path.join(root, "server/services/partner-gateway/partner-home.service.ts"),
    "utf8",
  );
  if (text.includes('searchCustomers(userId, "")')) {
    console.error("FAIL home still calls searchCustomers(\"\")");
    process.exit(1);
  }
  console.log("PASS home-no-empty-customer-scan");
}

mustInclude(
  path.join(wpRoot, "src/App.tsx"),
  ["Soft", "AppShell"],
  "wp-soft-inside-shell-routes",
);

mustInclude(
  path.join(wpRoot, "src/screens/SplashScreen.tsx"),
  ["markSessionRestored", "Opening workspace"],
  "wp-splash-no-me",
);

mustInclude(
  path.join(wpRoot, "src/lib/use-partner-home-dashboard.ts"),
  ['phase: "shell"', 'phase: "desk"'],
  "wp-progressive-home",
);

mustInclude(
  path.join(wpRoot, "src/lib/use-partner-business.ts"),
  ["readCachedBusinessPipeline", "cacheBusinessPipeline"],
  "wp-pipeline-swr",
);

console.log("CO-WP-PERF-002 structural verify OK");
