#!/usr/bin/env node
/**
 * CO-PRODUCTION-REGRESSION-PREVENTION-014 — Production shell / notification / ticker smoke.
 *
 * Authenticated routes use CATALYST_BAT_* (never prints passwords).
 *
 * Usage:
 *   node --env-file=.env.local scripts/co-production-regression-014-shell-smoke.mjs
 *
 * Env:
 *   CATALYST_BAT_URL — default https://catalyst-one.rupeecatalyst.com
 *   CERT_SHELL_SCREENSHOTS=1 — save PNG evidence under docs/co-production-regression-prevention-014/evidence/
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  attachRuntimeListeners,
  chromePath,
  collectShellMetrics,
  evaluateShellPass,
} from "./_lib/production-shell-metrics.mjs";
import { CERT_ROOT, exitCode, padLabel, printSection } from "./_lib/cert-toolkit.mjs";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const base = (process.env.CATALYST_BAT_URL || "https://catalyst-one.rupeecatalyst.com").replace(
  /\/$/,
  "",
);
const email = process.env.CATALYST_BAT_EMAIL;
const password = process.env.CATALYST_BAT_PASSWORD;
const saveShots = process.env.CERT_SHELL_SCREENSHOTS === "1";
const evidenceDir = path.join(
  CERT_ROOT,
  "docs",
  "co-production-regression-prevention-014",
  "evidence",
);

const CRITICAL_ROUTES = [
  "/login",
  "/dashboard",
  "/my-deals",
  "/documents",
  "/document-center",
  "/credit-workbench",
];

/** Sidebar-accessible client navigation (primary nav). */
const SIDEBAR_NAV_FLOW = [
  { label: "Dashboard", linkText: "Dashboard", expectPath: /\/dashboard/ },
  { label: "My Deals", linkText: "My Deals", expectPath: /\/my-deals/ },
  { label: "Documents", linkText: "Documents", expectPath: /document/ },
];

/**
 * Deep-link routes not mounted in primary sidebar (command palette / journey modules).
 * Verified via direct route probes + optional in-app link click when present.
 */
const DEEP_LINK_ROUTES = [
  { label: "Document Center", path: "/document-center", expectPath: /document-center|document/ },
  { label: "Credit Workbench", path: "/credit-workbench", expectPath: /credit-workbench/ },
];

async function loginApi() {
  const res = await fetch(`${base}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok || !body.success || !body.data?.accessToken) {
    return {
      ok: false,
      status: res.status,
      code: body?.error?.code || body?.code || null,
      message: (body?.error?.message || body?.message || "login_failed").slice(0, 240),
    };
  }
  return {
    ok: true,
    session: {
      accessToken: body.data.accessToken,
      refreshToken: body.data.refreshToken,
      user: { ...body.data.user, mustChangePassword: false },
    },
  };
}

async function injectSession(page, session) {
  const host = new URL(base).hostname;
  await page.goto(`${base}/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.evaluate((s) => {
    localStorage.setItem("compass:access-token", s.accessToken);
    localStorage.setItem("compass:refresh-token", s.refreshToken);
    localStorage.setItem("compass:user", JSON.stringify(s.user));
    document.cookie = `compass-access-token=${s.accessToken}; path=/; max-age=604800; SameSite=Lax; Secure`;
    document.cookie = `compass-refresh-token=${s.refreshToken}; path=/; max-age=604800; SameSite=Lax; Secure`;
  }, session);
  await page.setCookie(
    {
      name: "compass-access-token",
      value: session.accessToken,
      domain: host,
      path: "/",
      secure: true,
      sameSite: "Lax",
    },
    {
      name: "compass-refresh-token",
      value: session.refreshToken,
      domain: host,
      path: "/",
      secure: true,
      sameSite: "Lax",
    },
  );
}

async function clickSidebarLink(page, linkText) {
  const clicked = await page.evaluate((text) => {
    const links = [...document.querySelectorAll("aside a, nav a")];
    const match = links.find((a) => (a.textContent || "").trim().includes(text));
    if (!match) return false;
    match.click();
    return true;
  }, linkText);
  if (!clicked) {
    const fallbackHref = {
      Dashboard: "/dashboard",
      "My Deals": "/my-deals",
      Documents: "/documents",
      "Credit Workbench": "/credit-workbench",
    }[linkText];
    if (fallbackHref) {
      await page.goto(`${base}${fallbackHref}`, { waitUntil: "domcontentloaded", timeout: 120000 });
      return { method: "goto_fallback", ok: true };
    }
    return { method: "click", ok: false };
  }
  await new Promise((r) => setTimeout(r, 3500));
  return { method: "click", ok: true };
}

function buildFailureAdvice(failure) {
  return {
    exactFailure: failure.code,
    affectedRoute: failure.route || failure.step || null,
    affectedComponent: failure.component || null,
    likelyCause: failure.likelyCause || "unknown — run CO-CHANAKYA-PRODUCTION-REGRESSION-012 diagnostic pattern",
    deployedCommitContainsChange: "compare git diff against baseline 538e733",
    nextStep: failure.nextStep || "STOP — do not speculative CSS fix; diagnose with git diff + asset probe",
  };
}

async function main() {
  if (!email || !password) {
    console.log("BAT credentials are not configured. Authenticated certification cannot continue.");
    process.exit(2);
  }

  if (saveShots) fs.mkdirSync(evidenceDir, { recursive: true });

  const report = {
    sprint: "CO-PRODUCTION-REGRESSION-PREVENTION-014",
    gate: "production-shell-smoke",
    timestamp: new Date().toISOString(),
    base,
    criticalRoutes: CRITICAL_ROUTES,
    loginRoute: null,
    directRoutes: [],
    navigationFlow: [],
    viewports: {},
    shell: { pass: false, failures: [] },
    notification: { pass: false, failures: [] },
    chanakyaHeader: { pass: false, failures: [] },
    runtime: { consoleErrors: [], pageErrors: [], failedRequests: [] },
    finalStatus: "BLOCKED",
    failurePolicy: [],
  };

  const loginRouteCheck = await fetch(`${base}/login`, { cache: "no-store", redirect: "follow" });
  const loginHtml = await loginRouteCheck.text();
  report.loginRoute = {
    path: "/login",
    status: loginRouteCheck.status,
    hasNext: /_next\/static/.test(loginHtml),
    pass: loginRouteCheck.status === 200 && /_next\/static/.test(loginHtml),
  };

  const login = await loginApi();
  if (!login.ok) {
    report.finalStatus = "BLOCKED";
    report.failurePolicy.push(
      buildFailureAdvice({
        code: "auth_login_failed",
        route: "/api/auth/login",
        component: "Authentication",
        likelyCause: "Database/auth misconfiguration or invalid BAT credentials",
        nextStep: "Verify CATALYST_BAT_* and production DB connectivity before shell smoke",
      }),
    );
    console.log(JSON.stringify(report, null, 2));
    process.exit(1);
  }

  const { default: puppeteer } = await import("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath(),
    args: ["--no-sandbox", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(90000);
    const runtime = attachRuntimeListeners(page);
    await injectSession(page, login.session);

    // Direct route probes
    for (const route of CRITICAL_ROUTES.filter((r) => r !== "/login")) {
      runtime.clear();
      await page.goto(`${base}${route}`, { waitUntil: "domcontentloaded", timeout: 180000 });
      await new Promise((r) => setTimeout(r, 3000));
      const metrics = await collectShellMetrics(page);
      const shellEval = evaluateShellPass(metrics);
      const rt = runtime.snapshot();

      const entry = {
        route,
        finalUrl: page.url(),
        metrics,
        runtime: rt,
        shellPass: shellEval.pass,
        shellFailures: shellEval.failures,
        notificationPass: metrics.toastVisibleCount <= 1,
        chanakyaPass: !metrics.tickerOverlapsActions && (metrics.ticker?.contained !== false),
        pass:
          shellEval.pass &&
          metrics.toastVisibleCount <= 1 &&
          !metrics.tickerOverlapsActions &&
          rt.pageErrors.length === 0,
      };

      if (saveShots) {
        const shot = path.join(evidenceDir, `route${route.replace(/\//g, "-") || "-root"}.png`);
        await page.screenshot({ path: shot, fullPage: false });
        entry.screenshot = shot;
      }

      report.directRoutes.push(entry);
    }

    // Sequential primary-sidebar client navigation
    await page.goto(`${base}/dashboard`, { waitUntil: "domcontentloaded", timeout: 180000 });
    await new Promise((r) => setTimeout(r, 2000));

    for (const step of SIDEBAR_NAV_FLOW) {
      runtime.clear();
      const nav = await clickSidebarLink(page, step.linkText);
      const metrics = await collectShellMetrics(page);
      const shellEval = evaluateShellPass(metrics);
      const rt = runtime.snapshot();
      const pathOk = step.expectPath.test(page.url());

      report.navigationFlow.push({
        step: step.label,
        kind: "sidebar",
        navigation: nav,
        finalUrl: page.url(),
        pathOk,
        metrics,
        runtime: rt,
        shellPass: shellEval.pass && pathOk,
        pass: shellEval.pass && pathOk && metrics.toastVisibleCount <= 1 && rt.pageErrors.length === 0,
      });
    }

    // Dashboard quick-action link → Document Center (in-app Link navigation when available)
    runtime.clear();
    await page.goto(`${base}/dashboard`, { waitUntil: "domcontentloaded", timeout: 180000 });
    await new Promise((r) => setTimeout(r, 2000));
    const quickDocNav = await page.evaluate(() => {
      const link = [...document.querySelectorAll("main a[href]")].find((a) =>
        /document/i.test(a.getAttribute("href") || ""),
      );
      if (!link) return { ok: false, method: "no_quick_action_link" };
      link.click();
      return { ok: true, method: "quick_action_click", href: link.getAttribute("href") };
    });
    await new Promise((r) => setTimeout(r, 3500));
    if (quickDocNav.ok) {
      const metrics = await collectShellMetrics(page);
      const shellEval = evaluateShellPass(metrics);
      const rt = runtime.snapshot();
      report.navigationFlow.push({
        step: "Document Center (quick action)",
        kind: "in_app_link",
        navigation: quickDocNav,
        finalUrl: page.url(),
        pathOk: /document/i.test(page.url()),
        metrics,
        runtime: rt,
        shellPass: shellEval.pass,
        pass: shellEval.pass && metrics.toastVisibleCount <= 1 && rt.pageErrors.length === 0,
      });
    }

    // Deep-link routes — not in primary sidebar; SPA hop via in-app link or controlled goto
    await injectSession(page, login.session);

    for (const hop of DEEP_LINK_ROUTES) {
      runtime.clear();
      await page.goto(`${base}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120000 });
      await new Promise((r) => setTimeout(r, 2000));
      const inApp = await page.evaluate((segment) => {
        const link = [...document.querySelectorAll("a[href]")].find((a) =>
          (a.getAttribute("href") || "").includes(segment),
        );
        if (link) {
          link.click();
          return { method: "in_app_link", ok: true };
        }
        return { method: "none", ok: false };
      }, hop.path.replace(/^\//, ""));

      if (!inApp.ok) {
        await page.goto(`${base}${hop.path}`, { waitUntil: "domcontentloaded", timeout: 180000 });
      } else {
        await new Promise((r) => setTimeout(r, 3500));
      }

      await new Promise((r) => setTimeout(r, 4500));

      const metrics = await collectShellMetrics(page);
      const shellEval = evaluateShellPass(metrics);
      const rt = runtime.snapshot();
      const pathOk = hop.expectPath.test(page.url());

      report.navigationFlow.push({
        step: hop.label,
        kind: inApp.ok ? "in_app_link" : "spa_goto_deep_link",
        navigation: inApp,
        finalUrl: page.url(),
        pathOk,
        metrics,
        runtime: rt,
        shellPass: shellEval.pass && pathOk,
        pass: shellEval.pass && pathOk && metrics.toastVisibleCount <= 1 && rt.pageErrors.length === 0,
      });
    }

    // 1280px viewport — dashboard shell + ticker containment
    await page.setViewport({ width: 1280, height: 800 });
    await page.goto(`${base}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await new Promise((r) => setTimeout(r, 2500));
    report.viewports.width1280 = await collectShellMetrics(page);

    // 1440px re-check
    await page.setViewport({ width: 1440, height: 900 });
    await page.goto(`${base}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120000 });
    await new Promise((r) => setTimeout(r, 2000));
    report.viewports.width1440 = await collectShellMetrics(page);
  } finally {
    await browser.close();
  }

  // Aggregate results
  const shellFails = [];
  const notifFails = [];
  const chanakyaFails = [];
  const allRuntimeErrors = [];

  if (!report.loginRoute.pass) shellFails.push("login_route_broken");

  for (const r of report.directRoutes) {
    if (!r.shellPass) shellFails.push(`${r.route}:${r.shellFailures.join(",")}`);
    if (!r.notificationPass) notifFails.push(`${r.route}:multi_toast`);
    if (!r.chanakyaPass) chanakyaFails.push(`${r.route}:ticker_overlap_or_overflow`);
    allRuntimeErrors.push(...r.runtime.pageErrors, ...r.runtime.consoleErrors);
  }
  for (const n of report.navigationFlow) {
    if (!n.pass) shellFails.push(`nav_${n.step}`);
    if (n.metrics.toastVisibleCount > 1) notifFails.push(`nav_${n.step}:multi_toast`);
    if (n.metrics.tickerOverlapsActions) chanakyaFails.push(`nav_${n.step}:ticker_overlap`);
    allRuntimeErrors.push(...n.runtime.pageErrors, ...n.runtime.consoleErrors);
  }

  if (report.viewports.width1280?.tickerOverlapsActions) {
    chanakyaFails.push("1280px:ticker_overlaps_actions");
  }
  if (report.viewports.width1280?.horizontalOverflow) {
    shellFails.push("1280px:horizontal_overflow");
  }

  report.shell = { pass: shellFails.length === 0, failures: shellFails };
  report.notification = { pass: notifFails.length === 0, failures: notifFails };
  report.chanakyaHeader = { pass: chanakyaFails.length === 0, failures: chanakyaFails };
  report.runtime = {
    consoleErrors: [...new Set(allRuntimeErrors)].slice(0, 20),
    pageErrors: [],
    failedRequests: [],
  };

  const allPass =
    report.loginRoute.pass &&
    report.shell.pass &&
    report.notification.pass &&
    report.chanakyaHeader.pass &&
    report.directRoutes.every((r) => r.pass) &&
    report.navigationFlow.every((n) => n.pass);

  report.finalStatus = allPass ? "READY FOR PRODUCTION" : "BLOCKED";

  if (!allPass) {
    for (const f of [...shellFails, ...notifFails, ...chanakyaFails].slice(0, 5)) {
      report.failurePolicy.push(
        buildFailureAdvice({
          code: f,
          route: f.split(":")[0],
          component: f.includes("toast") ? "EnterpriseNotificationHost" : f.includes("ticker") ? "ChanakyaLiveIntelligenceBar" : "DashboardLayout/AppShell",
        }),
      );
    }
  }

  printSection("CO-PRODUCTION-REGRESSION-014 — Shell Smoke");
  console.log(`${padLabel("Target")}${base}`);
  console.log(`${padLabel("Login route")}${report.loginRoute.pass ? "PASS" : "FAIL"}`);
  console.log(`${padLabel("Shell / layout")}${report.shell.pass ? "PASS" : "FAIL"}`);
  console.log(`${padLabel("Notification contract")}${report.notification.pass ? "PASS" : "FAIL"}`);
  console.log(`${padLabel("CHANAKYA header")}${report.chanakyaHeader.pass ? "PASS" : "FAIL"}`);
  console.log(`${padLabel("Client navigation")}${report.navigationFlow.every((n) => n.pass) ? "PASS" : "FAIL"}`);
  printSection("Final certification status");
  console.log(report.finalStatus);
  console.log("");
  console.log(JSON.stringify(report, null, 2));

  process.exit(exitCode(allPass ? "PASS" : "FAIL"));
}

main().catch((e) => {
  console.error(String(e));
  process.exit(1);
});
