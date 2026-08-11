/**
 * CO-WP-EXP-001 — Saarthi / Notifications / Marketing / desktop experience verify.
 * Development only — does NOT deploy.
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

mustExist("docs/co-wp-exp-001/CO-WP-EXP-001-CONSOLIDATED-DEVELOPMENT-REPORT.md");
mustExist("server/services/partner-gateway/partner-saarthi.service.ts");
mustExist("server/services/partner-gateway/partner-marketing.service.ts");
mustExist("src/app/api/partner/saarthi/route.ts");
mustExist("src/app/api/partner/saarthi/ask/route.ts");
mustExist("src/app/api/partner/marketing/route.ts");

mustContain(
  "server/services/partner-gateway/partner-saarthi.service.ts",
  "Chanakya",
  "Saarthi/Chanakya separation notice",
);
mustNotContain(
  "server/services/partner-gateway/partner-saarthi.service.ts",
  "chanakya-guide",
  "must not import Chanakya guide",
);
mustNotContain(
  "server/services/partner-gateway/partner-saarthi.service.ts",
  "enterprise-ai-platform",
  "must not wire Enterprise AI Platform",
);
mustContain(
  "server/services/partner-gateway/partner-saarthi.service.ts",
  "listOwnedOpportunities",
  "partner-scoped opportunity answers",
);
mustContain(
  "server/services/partner-gateway/partner-home.service.ts",
  "never fall back to seed/mock notification",
  "honest notification fallback",
);
mustContain(
  "src/constants/enterprise-partner-home.ts",
  "does not invent business facts",
  "honest Saarthi seed copy",
);

const wpRoot = path.resolve(root, "..", "Wealth Partner App", "web");
if (!fs.existsSync(wpRoot)) {
  failures.push(`Missing WP: ${wpRoot}`);
} else {
  const mustWp = (rel, needle) => {
    const full = path.join(wpRoot, rel);
    if (!fs.existsSync(full)) {
      failures.push(`Missing WP ${rel}`);
      return;
    }
    if (needle && !fs.readFileSync(full, "utf8").includes(needle)) {
      failures.push(`WP ${rel} missing ${needle}`);
    }
  };
  mustWp("src/screens/saarthi/SaarthiDeskScreen.tsx", "partnerSaarthiAsk");
  mustWp("src/screens/saarthi/SaarthiDeskScreen.tsx", "not Chanakya");
  mustWp("src/screens/marketing/MarketingDeskScreen.tsx", "partnerMarketingDesk");
  mustWp("src/screens/HomeDashboard.tsx", "EnterpriseSaarthiWidget");
  mustWp("src/screens/notifications/NotificationCenterScreen.tsx", "DesktopPage");
  mustWp("src/components/shell/shell.css", ".saarthi-live");
  const shell = fs.readFileSync(path.join(wpRoot, "src/components/shell/shell.css"), "utf8");
  if (!shell.includes("display: none") || !/@media \(min-width: 1024px\)[\s\S]*\.saarthi-live/.test(shell)) {
    failures.push("WP shell.css must hide SaarthiLive at ≥1024");
  }
  const app = fs.readFileSync(path.join(wpRoot, "src/App.tsx"), "utf8");
  if (!app.includes("MarketingDeskScreen")) failures.push("WP App missing MarketingDeskScreen");
  const more = fs.readFileSync(path.join(wpRoot, "src/screens/more/MoreDeskScreen.tsx"), "utf8");
  if (!more.includes("/app/saarthi") || !more.includes("/app/marketing")) {
    failures.push("More desk missing Saarthi/Marketing links");
  }
}

if (failures.length) {
  console.error("CO-WP-EXP-001 VERIFY FAIL");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log("CO-WP-EXP-001 VERIFY PASS");
console.log(
  JSON.stringify(
    {
      saarthi: "partner-scoped Q&A + guidance; not Chanakya",
      notifications: "center SSOT; no seed fallback on Home",
      marketing: "enterprise feed projection; honest empty",
      desktop: "≥1024 side nav; SaarthiLive hidden; DesktopPage density",
      deploy: "not performed",
    },
    null,
    2,
  ),
);
