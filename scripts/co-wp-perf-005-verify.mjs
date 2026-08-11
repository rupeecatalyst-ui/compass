/**
 * CO-WP-PERF-005 — Static verify (no network): ensures P0 structural fixes are present.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const checks = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function check(name, cond, detail = "") {
  checks.push({ name, ok: Boolean(cond), detail });
}

const auth = read("server/services/partner-gateway/partner-auth.service.ts");
const binding = read("server/services/partner-gateway/partner-binding.service.ts");
const notif = read("server/services/partner-gateway/partner-notification-center.service.ts");
const entitlements = read(
  "server/services/partner-entitlements/partner-entitlements.service.ts",
);
const loginRoute = read("src/app/api/partner/auth/login/route.ts");
const meRoute = read("src/app/api/partner/auth/me/route.ts");
const notifRoute = read("src/app/api/partner/notifications/route.ts");

check(
  "login attaches entitlements via same resolver",
  auth.includes("attachPartnerEntitlements") &&
    auth.includes("partnerEntitlementsService"),
);
check("login reuses preloaded user for binding", auth.includes("preloadedUser"));
check(
  "binding parallel partner lookups",
  binding.includes("Promise.all") && binding.includes("findPartnerByActivation"),
);
check(
  "notifications no getOpportunity fan-out",
  !notif.includes("getOpportunity(") &&
    notif.includes("listCachedOpportunityDetailsForHome"),
);
check(
  "notifications no searchCustomers call",
  !/partnerBusinessService\.searchCustomers|await\s+.*searchCustomers\(/.test(notif),
);
check(
  "notifications batched ECM birthdays",
  notif.includes("loadBirthdayContacts") && notif.includes("findMany"),
);
check(
  "markRead single getCenter",
  notif.includes("withUpdatedReadFlags") &&
    !/return this\.getCenter\(userId\);\s*\n\s*},\s*\n\s*async markAllRead/.test(notif),
);
check(
  "entitlement templates batch findMany",
  entitlements.includes("code: { in: seedCodes }"),
);
check(
  "auth routes use request memo",
  loginRoute.includes("runWithPartnerRequestMemo") &&
    meRoute.includes("runWithPartnerRequestMemo"),
);
check(
  "notifications route uses request memo",
  notifRoute.includes("runWithPartnerRequestMemo"),
);

const failed = checks.filter((c) => !c.ok);
for (const c of checks) {
  console.log(`${c.ok ? "PASS" : "FAIL"}  ${c.name}${c.detail ? ` — ${c.detail}` : ""}`);
}
if (failed.length) {
  console.error(`\n${failed.length} check(s) failed`);
  process.exit(1);
}
console.log(`\nAll ${checks.length} PERF-005 structural checks passed.`);
