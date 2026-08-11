/**
 * CO-WP-COM-001 — Commercials / Performance integration verify (development).
 * Does NOT deploy. Proves Gateway projects C1 SSOTs; Partner App does not calculate commission.
 */
import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const failures = [];

function mustExist(rel) {
  if (!fs.existsSync(path.join(root, rel))) failures.push(`Missing: ${rel}`);
}

function mustContain(rel, needle, label = needle) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  if (!text.includes(needle)) failures.push(`${rel} missing ${label}`);
}

function mustNotContain(rel, needle, label = needle) {
  const text = fs.readFileSync(path.join(root, rel), "utf8");
  if (text.includes(needle)) failures.push(`${rel} must not contain ${label}`);
}

mustExist("docs/co-wp-com-001/CO-WP-COM-001-INTEGRATION-REPORT.md");
mustExist("server/services/partner-gateway/partner-commercials.service.ts");
mustExist("server/services/partner-gateway/partner-performance.service.ts");
mustExist("src/app/api/partner/commercials/route.ts");
mustExist("src/app/api/partner/performance/route.ts");
mustExist("src/types/enterprise-partner-commercials.ts");

mustContain(
  "src/constants/enterprise-partner-entitlements/index.ts",
  '"commercials"',
  "commercials module key",
);
mustContain(
  "src/constants/enterprise-partner-entitlements/index.ts",
  '"performance"',
  "performance module key",
);

mustContain(
  "server/services/partner-gateway/partner-commercials.service.ts",
  "commercialProfileIsConfigured",
  "reuse commercial participation helpers",
);
mustContain(
  "server/services/partner-gateway/partner-commercials.service.ts",
  "listCommissions",
  "commission structures from WPR",
);
mustContain(
  "server/services/partner-gateway/partner-commercials.service.ts",
  "Module not entitled:",
  "module entitlement gate",
);
mustContain(
  "server/services/partner-gateway/partner-performance.service.ts",
  "monthlyTargetAmount",
  "targets from C1 profile",
);
mustContain(
  "server/services/partner-gateway/partner-performance.service.ts",
  "listOwnedOpportunities",
  "partner-scoped pipeline",
);

// No Partner invent of commission splits in Gateway commercials service
mustNotContain(
  "server/services/partner-gateway/partner-commercials.service.ts",
  "companyShare",
  "invented company share calc",
);
mustNotContain(
  "server/services/partner-gateway/partner-commercials.service.ts",
  "caShare",
  "invented CA share calc",
);

const wpRoot = path.resolve(root, "..", "Wealth Partner App", "web");
if (!fs.existsSync(wpRoot)) {
  failures.push(`Missing WP App: ${wpRoot}`);
} else {
  const commercials = fs.readFileSync(
    path.join(wpRoot, "src/screens/commercials/CommercialsScreen.tsx"),
    "utf8",
  );
  const performance = fs.readFileSync(
    path.join(wpRoot, "src/screens/performance/PerformanceScreen.tsx"),
    "utf8",
  );
  const api = fs.readFileSync(path.join(wpRoot, "src/lib/enterprise-api.ts"), "utf8");
  const ent = fs.readFileSync(path.join(wpRoot, "src/lib/partner-entitlements.ts"), "utf8");

  if (!api.includes("partnerCommercialsDesk")) failures.push("WP missing partnerCommercialsDesk");
  if (!api.includes("partnerPerformanceDesk")) failures.push("WP missing partnerPerformanceDesk");
  if (!commercials.includes("partnerCommercialsDesk")) {
    failures.push("CommercialsScreen not wired to Gateway");
  }
  if (!performance.includes("partnerPerformanceDesk")) {
    failures.push("PerformanceScreen not wired to Gateway");
  }
  if (commercials.includes("Math.round") && commercials.includes("commission")) {
    failures.push("CommercialsScreen must not calculate commission");
  }
  if (!ent.includes("commercials") || !ent.includes("performance")) {
    failures.push("WP entitlements missing commercials/performance modules");
  }
  if (!commercials.includes("never recalculated") && !commercials.includes("Not Specified")) {
    failures.push("CommercialsScreen missing honest empty / no-calc notice");
  }
}

if (failures.length) {
  console.error("CO-WP-COM-001 VERIFY FAIL");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-WP-COM-001 VERIFY PASS");
console.log(
  JSON.stringify(
    {
      commercials: "WPR commercial profile + structures + C1 earnings projection",
      performance: "profile targets + owned opp pipeline/product mix",
      entitlements: "modules.commercials / modules.performance",
      partnerCalc: "none",
      deploy: "not performed",
    },
    null,
    2,
  ),
);
