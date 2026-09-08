/**
 * CO-C1-EMPLOYEE-PWA-001
 * Employee PWA foundation: installability, auth boundary, cache policy,
 * newest-first lists, document view-only, checklist handoff, no admin modules.
 */
import fs from "node:fs";
import path from "path";
import { fileURLToPath } from "node:url";
import {
  EMPLOYEE_PWA_CANONICAL_LEAD_OBJECTS_EXIST,
  EMPLOYEE_PWA_LIST_ORDER,
  EMPLOYEE_PWA_MANIFEST_PATH,
  EMPLOYEE_PWA_NAME,
  EMPLOYEE_PWA_START_PATH,
  EMPLOYEE_PWA_THEME_MODES,
} from "../src/constants/employee-pwa.ts";
import { employeePwaMayCacheRequest, employeePwaIsSensitiveApiPath } from "../src/lib/employee-pwa/cache-policy.ts";
import { formatEmployeePwaSourceIdentity } from "../src/lib/employee-pwa/source-identity.ts";
import { employeePwaCanSeeMissionControl, employeePwaHrefIsAdminModule } from "../src/lib/employee-pwa/nav.ts";
import { employeePwaPushStatus } from "../src/lib/employee-pwa/push.ts";
import { DOCUMENT_WORKSPACE_EMAIL_NOT_SENT } from "../src/constants/document-workspace-inbound.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const failures = [];

function read(rel) {
  return fs.readFileSync(path.join(root, rel), "utf8");
}

function exists(rel) {
  return fs.existsSync(path.join(root, rel));
}

function expect(name, condition) {
  if (condition) console.log(`PASS  ${name}`);
  else {
    failures.push(name);
    console.log(`FAIL  ${name}`);
  }
}

function mustContain(rel, needle, label = needle) {
  expect(`${rel} contains ${label}`, read(rel).includes(needle));
}

function mustNotContain(rel, needle, label = needle) {
  expect(`${rel} omits ${label}`, !read(rel).includes(needle));
}

const manifest = JSON.parse(read("public/pwa/manifest.webmanifest"));
expect("manifest name is Catalyst One", manifest.name === EMPLOYEE_PWA_NAME);
expect("manifest start_url /pwa", manifest.start_url === EMPLOYEE_PWA_START_PATH);
expect("manifest display standalone", manifest.display === "standalone");
expect("manifest portrait", manifest.orientation === "portrait");
expect("manifest has 192 icon", manifest.icons.some((icon) => icon.sizes === "192x192"));
expect("manifest has 512 icon", manifest.icons.some((icon) => icon.sizes === "512x512"));
expect("manifest has maskable icon", manifest.icons.some((icon) => String(icon.purpose).includes("maskable")));
expect("icon 192 exists", exists("public/icon-192.png"));
expect("icon 512 exists", exists("public/icon-512.png"));
expect("apple touch icon exists", exists("public/apple-touch-icon.png"));
expect("service worker file exists", exists("public/pwa/sw.js"));
expect("offline shell exists", exists("public/pwa/offline.html"));

const sw = read("public/pwa/sw.js");
expect("SW caches offline shell", sw.includes("/pwa/offline.html"));
expect("SW never caches /api/", sw.includes('url.pathname.startsWith("/api/")'));
expect("SW skips Authorization requests", sw.includes("Authorization"));
expect("SW has notificationclick routing", sw.includes("notificationclick"));
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-register-sw.tsx", "EMPLOYEE_PWA_SW_PATH");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-register-sw.tsx", 'scope: "/pwa/"');

expect("shell assets cacheable", employeePwaMayCacheRequest("/pwa/offline.html") === true);
expect("API never cacheable", employeePwaMayCacheRequest("/api/enterprise-opportunities") === false);
expect("binary is sensitive", employeePwaIsSensitiveApiPath("/api/enterprise-transaction-documents/binary") === true);

mustContain("src/app/(employee-pwa)/pwa/layout.tsx", "EmployeePwaShell");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-shell.tsx", "AuthGuard");
mustNotContain("src/components/catalyst-one/employee-pwa/employee-pwa-shell.tsx", "/admin");
mustNotContain("src/constants/employee-pwa.ts", "wealth-partner-app");
expect("no canonical Lead objects", EMPLOYEE_PWA_CANONICAL_LEAD_OBJECTS_EXIST === false);

expect("opportunity newest-first query", EMPLOYEE_PWA_LIST_ORDER.opportunityQuery === "orderBy=createdAt");
expect("deal newest-first query", EMPLOYEE_PWA_LIST_ORDER.dealQuery === "sort=createdAt_desc");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-opportunities.tsx", "EMPLOYEE_PWA_LIST_ORDER.opportunityQuery");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-deals.tsx", "EMPLOYEE_PWA_LIST_ORDER.dealQuery");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-opportunities.tsx", "formatEmployeePwaSourceIdentity");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-opportunities.tsx", "formatEmployeePwaLastAction");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-deals.tsx", "last action is visible but does not reorder");

expect("COMPASS source", formatEmployeePwaSourceIdentity({ sourceCode: "website_compass" }) === "COMPASS");
expect(
  "Wealth Partner + name",
  formatEmployeePwaSourceIdentity({ sourceCode: "wealth_partner", sourceContactName: "Asha" }) ===
    "Wealth Partner · Asha",
);
expect(
  "Direct + employee",
  formatEmployeePwaSourceIdentity({ sourceCode: "direct", relationshipManagerName: "Rahul" }) ===
    "Direct · Rahul",
);

mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-deal-detail.tsx", "/api/enterprise-deals/");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-deal-detail.tsx", "/transitions");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-opportunity-detail.tsx", "lifecycleStatus");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-opportunity-detail.tsx", "PATCH");

mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-documents.tsx", "View / Download");
mustNotContain("src/components/catalyst-one/employee-pwa/employee-pwa-documents.tsx", "move_to_deleted");
mustNotContain("src/components/catalyst-one/employee-pwa/employee-pwa-documents.tsx", "action: \"upload\"");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-documents.tsx", "prepare_handoff");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-documents.tsx", "DocumentWorkspaceChecklistShareDialog");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-documents.tsx", "queueEmail");
expect("queued email is not sent copy", DOCUMENT_WORKSPACE_EMAIL_NOT_SENT.includes("not been sent"));
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-documents.tsx", "New from Email");
mustContain("src/app/api/document-workspace/refinement-014/route.ts", "lod-checklist");

mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-chanakya.tsx", "/api/chanakya/conversation");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-chanakya.tsx", "EMPLOYEE_PWA_NO_LIVE_LENDER_RECOMMENDATION");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-mission-control.tsx", "Super Admin");
expect("viewer cannot see Mission Control", employeePwaCanSeeMissionControl("VIEWER") === false);
expect("super admin can see Mission Control", employeePwaCanSeeMissionControl("SUPER_ADMIN") === true);
expect("/admin is forbidden in PWA nav", employeePwaHrefIsAdminModule("/admin") === true);

expect("themes include system", EMPLOYEE_PWA_THEME_MODES.includes("system"));
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-more.tsx", "EMPLOYEE_PWA_THEME_MODES");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-notifications.tsx", "pwaDeepLink");

const push = employeePwaPushStatus();
expect("in-app notifications remain", push.inAppNotificationsEnabled === true);
if (!push.remotePushEnabled) {
  expect("remote push configuration required when keys missing", push.configurationRequired === true);
  mustContain(
    "src/components/catalyst-one/employee-pwa/employee-pwa-more.tsx",
    "EMPLOYEE_PWA_PUSH_DISABLED_MESSAGE",
  );
}

mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-create.tsx", "/api/ecm/contacts");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-create.tsx", "/api/enterprise-opportunities");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-create.tsx", "registerEteTask");
mustContain("src/components/catalyst-one/employee-pwa/employee-pwa-create.tsx", "EMPLOYEE_PWA_OFFLINE_MUTATION_BLOCKED");
mustContain("src/constants/employee-pwa.ts", "/api/product-registry/products?presentation=canonical");
mustContain("public/pwa/offline.html", "No mutation is queued while offline");
mustContain("src/hooks/use-auth.ts", "display-mode: standalone");
mustContain("package.json", "verify:co-c1-employee-pwa-001");

if (failures.length) {
  console.error(`\nFAILED ${failures.length} checks`);
  process.exit(1);
}
console.log("\nEmployee PWA 001 verification PASS");
