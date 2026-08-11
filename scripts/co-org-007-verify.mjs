#!/usr/bin/env node
/**
 * CO-ORG-007 — Enterprise Navigation Certification gate.
 * Engineering gate only — does NOT equal Product Owner Business Certification.
 * No deployment required.
 */
import { readFileSync, existsSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const failures = [];
const warnings = [];

function mustExist(rel, label) {
  if (!existsSync(join(root, rel))) failures.push(`${label ?? rel}: missing`);
}

function mustContain(rel, needle, label) {
  const abs = join(root, rel);
  if (!existsSync(abs)) {
    failures.push(`Missing file: ${rel}`);
    return;
  }
  if (!readFileSync(abs, "utf8").includes(needle)) {
    failures.push(`${label ?? rel}: expected "${needle}"`);
  }
}

function walkPages(dir, acc = []) {
  if (!existsSync(dir)) return acc;
  for (const name of readdirSync(dir)) {
    const p = join(dir, name);
    if (statSync(p).isDirectory()) walkPages(p, acc);
    else if (name === "page.tsx") acc.push(p);
  }
  return acc;
}

function pageExistsForRoute(routePath) {
  const clean = routePath.split("?")[0].split("#")[0];
  if (!clean || clean === "#") return true;
  if (clean === "/") {
    return (
      existsSync(join(root, "src/app/page.tsx")) ||
      existsSync(join(root, "src/app/(marketing)/page.tsx")) ||
      existsSync(join(root, "src/app/(public)/page.tsx"))
    );
  }
  const candidates = [
    join(root, "src/app/(dashboard)", clean, "page.tsx"),
    join(root, "src/app/(mission-control)", clean, "page.tsx"),
    join(root, "src/app/(horizon)", clean, "page.tsx"),
    join(root, "src/app/(auth)", clean, "page.tsx"),
    join(root, "src/app/(public)", clean, "page.tsx"),
    join(root, "src/app", clean, "page.tsx"),
  ];
  if (candidates.some((c) => existsSync(c))) return true;
  // strip leading slash for (auth)/login style already handled
  const dash = join(root, "src/app/(dashboard)", clean);
  if (existsSync(dash) && statSync(dash).isDirectory()) {
    const kids = readdirSync(dash);
    if (kids.some((k) => k.startsWith("[") && existsSync(join(dash, k, "page.tsx")))) {
      return true;
    }
  }
  const mc = join(root, "src/app/(mission-control)", clean);
  if (existsSync(mc) && statSync(mc).isDirectory()) {
    const kids = readdirSync(mc);
    if (kids.some((k) => k.startsWith("[") && existsSync(join(mc, k, "page.tsx")))) {
      return true;
    }
  }
  return false;
}

/** Extract quoted path literals that look like app routes from a file. */
function extractRouteLiterals(rel) {
  const text = readFileSync(join(root, rel), "utf8");
  const out = new Set();
  for (const m of text.matchAll(/["'`](\/(?:dashboard|contacts|my-[a-z-]+|loan-[a-z-]+|document-center|lenders|wealth-partners|accounting|mission-control(?:\/[a-z0-9-]+)?|horizon|admin(?:\/[a-z0-9/-]+)?|organization(?:\/[a-z0-9-]+)?|investments|tasks|chanakya-radar|settings|reports|sarathi(?:\/[a-z-]+)?|customers|dialogue|workflow|decisions|communication|opportunities|credit-[a-z-]+|lead-information|contact-strategy|opportunity-compass|pipeline|documents|loan-files|ai-assistant|design-system|create-organization|accept-invitation|login|forgot-password|reset-password|change-password|deals)(?:\/[a-z0-9[\]_-]+)*)/g)) {
    out.add(m[1].replace(/\/\[[^\]]+\]/g, ""));
  }
  // Also ROUTES.X usages resolved via routes.ts values for nav files — handled separately
  return [...out];
}

function extractRoutesTsValues() {
  const text = readFileSync(join(root, "src/constants/routes.ts"), "utf8");
  const vals = [];
  for (const m of text.matchAll(/:\s*"(\/[^"]+)"/g)) vals.push(m[1]);
  return vals;
}

function extractNavHrefsFromNavigationTs() {
  const text = readFileSync(join(root, "src/config/navigation.ts"), "utf8");
  const routesText = readFileSync(join(root, "src/constants/routes.ts"), "utf8");
  const routeMap = new Map();
  for (const m of routesText.matchAll(/([A-Z0-9_]+):\s*"(\/[^"]+)"/g)) {
    routeMap.set(m[1], m[2]);
  }
  const hrefs = new Set();
  for (const m of text.matchAll(/href:\s*`([^`]+)`/g)) {
    let raw = m[1];
    raw = raw.replace(/\$\{ROUTES\.([A-Z0-9_]+)\}/g, (_, k) => routeMap.get(k) ?? "");
    const path = raw.split("?")[0].split("#")[0];
    if (path && path !== "#") hrefs.add(path);
  }
  for (const m of text.matchAll(/href:\s*"([^"]+)"/g)) {
    const path = m[1].split("?")[0].split("#")[0];
    if (path && path !== "#") hrefs.add(path);
  }
  for (const m of text.matchAll(/href:\s*ROUTES\.([A-Z0-9_]+)/g)) {
    const v = routeMap.get(m[1]);
    if (v) hrefs.add(v);
    else failures.push(`navigation.ts ROUTES.${m[1]} not found in routes.ts`);
  }
  for (const m of text.matchAll(/buildDashboardHref\(ROUTES\.([A-Z0-9_]+)\)/g)) {
    const v = routeMap.get(m[1]);
    if (v) hrefs.add(v);
    else failures.push(`navigation.ts buildDashboardHref ROUTES.${m[1]} missing`);
  }
  return [...hrefs];
}

function extractAdminConsoleHrefs() {
  const text = readFileSync(join(root, "src/constants/administration-console.ts"), "utf8");
  const hrefs = new Set();
  for (const m of text.matchAll(/href:\s*ROUTES\.([A-Z0-9_]+)/g)) {
    const routes = readFileSync(join(root, "src/constants/routes.ts"), "utf8");
    const rm = routes.match(new RegExp(`${m[1]}:\\s*"([^"]+)"`));
    if (rm) hrefs.add(rm[1]);
    else failures.push(`administration-console ROUTES.${m[1]} missing`);
  }
  return [...hrefs];
}

// --- Certification artefacts ---
mustExist("docs/co-org-007/CO-ORG-007-NAVIGATION-CERTIFICATION-REPORT.md", "cert report");
mustExist("docs/co-org-007/CO-ORG-007-NAVIGATION-INVENTORY.md", "inventory");
mustExist("docs/co-org-007/CO-ORG-007-REMAINING-GAPS.md", "gaps");

mustContain(
  "docs/co-org-007/CO-ORG-007-NAVIGATION-CERTIFICATION-REPORT.md",
  "PARTIAL",
  "honest partial grade",
);
mustContain(
  "docs/co-org-007/CO-ORG-007-NAVIGATION-CERTIFICATION-REPORT.md",
  "no deployment",
  "deploy skipped",
);

// --- Core SSOT presence ---
mustExist("src/config/navigation.ts", "nav SSOT");
mustExist("src/constants/routes.ts", "routes SSOT");
mustExist("src/constants/administration-console.ts", "admin console SSOT");
mustExist("src/mission-control/feature-registry/registry.ts", "MC feature registry");

mustContain("src/config/navigation.ts", "primaryDomainNavigation", "primary nav export");
mustContain("src/config/navigation.ts", 'badge: "Soon"', "Investments Soon badge present");
mustContain(
  "src/app/(dashboard)/investments/page.tsx",
  "Coming soon",
  "Investments placeholder page",
);

// Redirect shells still intentional
mustContain("src/app/(dashboard)/pipeline/page.tsx", "redirect", "pipeline redirect");
mustContain(
  "src/app/(dashboard)/documents/page.tsx",
  "DOCUMENT_CENTER",
  "documents redirect to Document Center",
);
mustContain(
  "src/app/(dashboard)/ai-assistant/page.tsx",
  "SARATHI",
  "ai-assistant redirect to SARATHI",
);

// Permission layouts
mustContain(
  "src/app/(dashboard)/admin/layout.tsx",
  "SUPER_ADMIN",
  "admin layout SUPER_ADMIN",
);
mustContain(
  "src/app/(dashboard)/admin/layout.tsx",
  "ADMIN",
  "admin layout ADMIN",
);
mustContain(
  "src/app/(dashboard)/organization/layout.tsx",
  "SUPER_ADMIN",
  "org layout SUPER_ADMIN",
);

// --- Resolve every primary/admin-console/nav href ---
const navHrefs = extractNavHrefsFromNavigationTs();
for (const href of navHrefs) {
  if (!pageExistsForRoute(href)) {
    failures.push(`DEAD NAV: ${href} (from navigation.ts)`);
  }
}

const consoleHrefs = extractAdminConsoleHrefs();
for (const href of consoleHrefs) {
  if (!pageExistsForRoute(href)) {
    failures.push(`DEAD ADMIN CONSOLE TILE: ${href}`);
  }
}

const routeVals = extractRoutesTsValues();
for (const r of routeVals) {
  if (!pageExistsForRoute(r)) {
    // Public auth routes may live outside (dashboard) groups
    const publicOk = [
      "/login",
      "/forgot-password",
      "/reset-password",
      "/change-password",
      "/create-organization",
      "/accept-invitation",
      "/",
    ];
    if (publicOk.includes(r)) {
      const alt = [
        join(root, "src/app", r === "/" ? "(public)" : "(auth)", r, "page.tsx"),
        join(root, "src/app", r.slice(1), "page.tsx"),
        join(root, "src/app/(auth)", r.slice(1), "page.tsx"),
        join(root, "src/app/(public)", r.slice(1), "page.tsx"),
      ];
      // soft-check — warn only if clearly missing under dashboard trees
      if (!alt.some((a) => existsSync(a)) && !pageExistsForRoute(r)) {
        warnings.push(`ROUTES public/auth may need manual check: ${r}`);
      }
      continue;
    }
    failures.push(`ROUTES constant has no page: ${r}`);
  }
}

// Mission Control enabled modules should not be dead
const mcReg = readFileSync(
  join(root, "src/mission-control/feature-registry/registry.ts"),
  "utf8",
);
const enabledBlocks = [...mcReg.matchAll(/route:\s*"([^"]+)"[\s\S]*?featureFlag:\s*"enabled"/g)];
// Better: pair each module object — simpler scan for enabled routes
for (const m of mcReg.matchAll(
  /\{\s*id:\s*"[^"]+"[\s\S]*?route:\s*"([^"]+)"[\s\S]*?featureFlag:\s*"([^"]+)"[\s\S]*?status:\s*"([^"]+)"/g,
)) {
  const [, route, flag, status] = m;
  if (flag === "enabled") {
    if (!pageExistsForRoute(route) && route.startsWith("/mission-control")) {
      // settings etc. may use [module] catch-all
      const catchAll = join(
        root,
        "src/app/(mission-control)/mission-control/[module]/page.tsx",
      );
      if (!existsSync(catchAll) && !pageExistsForRoute(route)) {
        failures.push(`MC enabled module dead route: ${route} (${status})`);
      }
    }
    if (status === "scaffold") {
      warnings.push(`MC enabled scaffold in rail: ${route}`);
    }
  }
}

// Primary modules that must exist
const mustHavePages = [
  "/dashboard",
  "/chanakya-radar",
  "/contacts",
  "/my-opportunities",
  "/my-deals",
  "/loan-journey",
  "/tasks",
  "/document-center",
  "/lenders",
  "/wealth-partners",
  "/accounting",
  "/mission-control/executive-briefing",
  "/horizon",
  "/admin",
  "/settings",
  "/investments",
];
for (const p of mustHavePages) {
  if (!pageExistsForRoute(p)) failures.push(`Primary module page missing: ${p}`);
}

mustContain(
  "docs/co-org-007/CO-ORG-007-NAVIGATION-INVENTORY.md",
  "Investments",
  "inventory documents Investments",
);
mustContain(
  "docs/co-org-007/CO-ORG-007-REMAINING-GAPS.md",
  "ADMIN",
  "gaps document permission drift",
);

if (warnings.length) {
  console.log("CO-ORG-007 warnings:");
  for (const w of warnings) console.log(" ~", w);
}

if (failures.length) {
  console.error("CO-ORG-007 verify FAILED:");
  for (const f of failures) console.error(" -", f);
  process.exit(1);
}

console.log(
  `CO-ORG-007 verify PASS (engineering gate — Navigation Certification PARTIAL; ${warnings.length} warnings; no deploy)`,
);
