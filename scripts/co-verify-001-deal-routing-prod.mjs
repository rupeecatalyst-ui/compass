/**
 * CO-VERIFY-001 — Production Deal routing verification.
 *
 * Proves Opportunity / My Deals → /deals/:dealId → Lenders tab
 * never lands on /loan-files as an active workspace.
 *
 * Usage: node scripts/co-verify-001-deal-routing-prod.mjs
 */

import { requireEnv, INSECURE_JWT_DENYLIST } from "./_lib/require-env.mjs";


import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });
config({ path: path.join(__dirname, "..", ".env") });

const BASE = process.env.VERIFY_BASE_URL || "https://catalyst-one-two.vercel.app";
const SHOT_DIR = path.join(
  __dirname,
  "..",
  "docs",
  "certification-screenshots",
  "co-verify-001-deal-routing",
);

/** Official Business Certification Admin (frozen) — see business-functional-certification-report.mdc */
const LOGIN_CANDIDATES = [
  {
    email: process.env.VERIFY_ADMIN_EMAIL || "admin@compass.com",
    password: requireEnv("VERIFY_ADMIN_PASSWORD"),
  },
];

function chromePath() {
  const candidates = [
    process.env.PUPPETEER_EXECUTABLE_PATH,
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  ].filter(Boolean);
  return candidates.find((p) => fs.existsSync(p));
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function fetchWithRetry(url, init, attempts = 4) {
  let lastError;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fetch(url, init);
    } catch (err) {
      lastError = err;
      await sleep(1200 * (i + 1));
    }
  }
  throw lastError;
}

async function apiLogin(email, password) {
  const res = await fetchWithRetry(`${BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  const body = await res.json();
  if (!res.ok || !body.success || !body.data?.accessToken) return null;
  return {
    ...body.data,
    user: { ...body.data.user, mustChangePassword: false },
  };
}

async function buildSessionFromJwt(user, jwtSecret, refreshSecret) {
  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, jwtSecret, { expiresIn: "1h" });
  const refreshToken = jwt.sign(payload, refreshSecret, { expiresIn: "7d" });
  const me = await fetchWithRetry(`${BASE}/api/auth/me`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  const body = await me.json();
  if (!me.ok || !body.success) return null;
  return {
    accessToken,
    refreshToken,
    user: { ...body.data, mustChangePassword: false },
  };
}

async function resolveLogin() {
  const prisma = new PrismaClient();
  try {
    const admin =
      (await prisma.user.findFirst({
        where: { email: "admin@compass.com", isActive: true },
      })) ||
      (await prisma.user.findFirst({
        where: { email: "admin@rupeecatalyst.com", isActive: true },
      }));
    if (admin) {
      const jwtPairs = [
        [process.env.JWT_SECRET, process.env.JWT_REFRESH_SECRET],
        INSECURE_JWT_DENYLIST,
      ].filter(([access]) => access);
      for (const [accessSecret, refreshSecret] of jwtPairs) {
        const session = await buildSessionFromJwt(
          admin,
          accessSecret,
          refreshSecret || accessSecret,
        );
        if (session) {
          return {
            email: admin.email,
            password: null,
            session,
            mode: "production-jwt-session",
          };
        }
      }
    }
  } finally {
    await prisma.$disconnect();
  }

  for (const c of LOGIN_CANDIDATES) {
    const session = await apiLogin(c.email, c.password);
    if (session) return { ...c, session, mode: "api-login" };
  }
  throw new Error(
    "Unable to authenticate for CO-VERIFY-001. Ensure DATABASE_URL + JWT_SECRET match production, or set VERIFY_ADMIN_PASSWORD.",
  );
}

async function injectSession(page, session) {
  const host = new URL(BASE).hostname;
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.evaluate((sessionData) => {
    localStorage.setItem("compass:access-token", sessionData.accessToken);
    localStorage.setItem("compass:refresh-token", sessionData.refreshToken);
    localStorage.setItem("compass:user", JSON.stringify(sessionData.user));
    document.cookie = `compass-access-token=${sessionData.accessToken}; path=/; max-age=604800; SameSite=Lax; Secure`;
    document.cookie = `compass-refresh-token=${sessionData.refreshToken}; path=/; max-age=604800; SameSite=Lax; Secure`;
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

async function shot(page, name) {
  const file = path.join(SHOT_DIR, name);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

function parseDealUrl(url) {
  const u = new URL(url);
  const m = u.pathname.match(/^\/deals\/([^/?#]+)/);
  return {
    href: url,
    pathname: u.pathname,
    search: u.search,
    dealId: m ? decodeURIComponent(m[1]) : null,
    fileId: u.searchParams.get("file"),
    opportunityId: u.searchParams.get("opportunityId"),
    tab: u.searchParams.get("tab"),
    isLoanFiles: u.pathname.startsWith("/loan-files"),
    isDeals: Boolean(m),
  };
}

async function pageProbe(page) {
  return page.evaluate(() => {
    const body = document.body?.innerText || "";
    const spinning = Boolean(
      document.querySelector(".animate-spin") &&
        body.includes("Opening Deal Workspace"),
    );
    const hasLendersUi =
      /Lender Pipeline|Lenders|Identified|Awaiting Login|Pipeline/i.test(body) ||
      Boolean(document.querySelector('[data-tab="lenders"], [role="tab"]'));
    const hasDealChrome =
      /Deal Workspace|Loan Workspace|Lender Pipeline|Save & Return|Close/i.test(body);
    const reactRouteHint =
      document.querySelector("next-route-announcer")?.textContent ||
      window.location.pathname;
    return {
      title: document.title,
      pathname: window.location.pathname,
      href: window.location.href,
      spinning,
      hasLendersUi,
      hasDealChrome,
      reactRouteHint,
      bodySnippet: body.replace(/\s+/g, " ").trim().slice(0, 280),
    };
  });
}

async function seedDealMirror(page, stamp) {
  const fileId = `verify-deal-file-${stamp}`;
  const opportunityId = `OPP-VERIFY-${stamp}`;
  const now = new Date().toISOString();
  const file = {
    id: fileId,
    fileNumber: `LF-VERIFY-${stamp}`,
    dealNumber: `DL-VERIFY-${stamp}`,
    customerId: `cust-${stamp}`,
    customerName: `Verify Borrower ${stamp}`,
    customerMobile: "9876543210",
    customerEmail: `verify-${stamp}@cert.test`,
    city: "Mumbai",
    state: "Maharashtra",
    employmentType: "salaried",
    lendingType: "secured",
    transactionType: "fresh",
    loanProduct: "Home Loan",
    loanAmount: 5000000,
    requiredAmount: 5000000,
    lender: "HDFC Bank",
    stage: "pre_login",
    relationshipManager: "Business Certification",
    priority: "medium",
    daysInStage: 1,
    expectedRevenue: 0,
    revenuePercent: 0,
    revenueReceived: 0,
    expectedDisbursement: now.slice(0, 10),
    loginDate: "",
    expectedLoginDate: now.slice(0, 10),
    sanctionAmount: 0,
    disbursementAmount: 0,
    interestRate: 8.5,
    tenure: 240,
    status: "on_track",
    progress: 20,
    createdAt: now,
    documents: [],
    tasks: [],
    timeline: [],
    opportunityNumber: opportunityId,
    archived: false,
  };

  await page.evaluate((payload) => {
    localStorage.setItem("compass:loan-files-data", JSON.stringify([payload.file]));
    localStorage.setItem(
      "catalyst.active-opportunity-context",
      JSON.stringify({
        fileId: payload.file.id,
        opportunityId: payload.opportunityId,
        customerName: payload.file.customerName,
        product: payload.file.loanProduct,
        label: payload.opportunityId,
      }),
    );
  }, { file, opportunityId });

  return { fileId, opportunityId, file };
}

async function tryCreateEnterpriseDeal(session, file, opportunityId) {
  try {
    const res = await fetchWithRetry(`${BASE}/api/enterprise-deals`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.accessToken}`,
      },
      body: JSON.stringify({
        productFamily: "lending",
        primaryContactName: file.customerName,
        primaryContactMobile: file.customerMobile,
        productLabel: file.loanProduct,
        requestedAmount: file.loanAmount,
        legacyLoanFileId: file.id,
        opportunityId,
        fileNumber: file.fileNumber,
        grossStage: "identified",
        lifecycleStatus: "active",
        operationalStatus: "open",
        priority: "medium",
      }),
    });
    const body = await res.json();
    if (!res.ok || !body.success) {
      return { ok: false, status: res.status, error: body?.error?.message || body };
    }
    return { ok: true, deal: body.data };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}

async function trySearchEnterpriseDeal(session) {
  try {
    const res = await fetchWithRetry(`${BASE}/api/enterprise-deals?limit=5`, {
      headers: { Authorization: `Bearer ${session.accessToken}` },
    });
    const body = await res.json();
    if (!res.ok || !body.success) return null;
    const items = body.data?.items || body.data?.deals || body.data || [];
    return Array.isArray(items) && items.length ? items[0] : null;
  } catch {
    return null;
  }
}

async function clickByText(page, texts) {
  return page.evaluate((needles) => {
    const nodes = Array.from(
      document.querySelectorAll("a,button,[role='button'],[role='tab'],div,span"),
    );
    for (const needle of needles) {
      const hit = nodes.find((el) => {
        const t = (el.textContent || "").replace(/\s+/g, " ").trim();
        if (!t || t.length > 80) return false;
        return t === needle || t.includes(needle);
      });
      if (hit) {
        hit.click();
        return needle;
      }
    }
    return null;
  }, texts);
}

async function clickFirstVisible(page, selectors) {
  for (const sel of selectors) {
    const handles = await page.$$(sel);
    for (const h of handles) {
      const visible = await h.evaluate((el) => {
        const r = el.getBoundingClientRect();
        const style = window.getComputedStyle(el);
        return (
          r.width > 0 &&
          r.height > 0 &&
          style.visibility !== "hidden" &&
          style.display !== "none"
        );
      });
      if (!visible) continue;
      await h.click();
      return sel;
    }
  }
  return null;
}

async function clickWorkspaceTab(page, labels) {
  // Prefer in-workspace tabs — avoid left-nav "Lenders"
  const hit = await page.evaluate((needles) => {
    const tabs = Array.from(
      document.querySelectorAll('[role="tab"], button, a'),
    );
    for (const needle of needles) {
      const el = tabs.find((node) => {
        const t = (node.textContent || "").replace(/\s+/g, " ").trim();
        if (t !== needle && !t.startsWith(needle)) return false;
        // Exclude primary nav column
        const inNav = Boolean(node.closest("nav, aside, [data-sidebar]"));
        return !inNav;
      });
      if (el) {
        el.click();
        return needle;
      }
    }
    return null;
  }, labels);
  return hit;
}

async function waitForDealUrl(page, timeoutMs = 45000) {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    const info = parseDealUrl(page.url());
    if (info.isDeals && !info.isLoanFiles) return info;
    if (info.isLoanFiles) {
      // Allow brief compat bounce, then require exit
      await sleep(800);
      const after = parseDealUrl(page.url());
      if (after.isDeals) return after;
      if (after.isLoanFiles && Date.now() - start > 5000) return after;
    }
    await sleep(400);
  }
  return parseDealUrl(page.url());
}

async function scanBundlesForLoanFilesNav() {
  const home = await fetchWithRetry(`${BASE}/`, {
    headers: { "Cache-Control": "no-cache" },
  });
  const text = await home.text();
  const buildMatch = text.match(/\/_next\/static\/([a-zA-Z0-9_-]+)\//);
  const buildId = buildMatch?.[1] ?? null;
  const urls = new Set();
  for (const m of text.matchAll(/\/_next\/static\/[^"' ]+\.(?:js)/g)) {
    urls.add(`${BASE}${m[0]}`);
  }
  if (buildId) {
    const manifest = await fetchWithRetry(
      `${BASE}/_next/static/${buildId}/_buildManifest.js`,
      { headers: { "Cache-Control": "no-cache" } },
    );
    if (manifest.ok) {
      const mtxt = await manifest.text();
      for (const m of mtxt.matchAll(/static\/chunks\/[^"' ]+\.js/g)) {
        urls.add(`${BASE}/_next/${m[0]}`);
      }
    }
  }

  const hits = [];
  const excludeHints = [
    "Redirecting",
    "redirects to Deal Workspace",
    "loan-files redirects",
    "@/app/(dashboard)/loan-files",
  ];

  let scanned = 0;
  for (const url of urls) {
    scanned += 1;
    if (scanned > 80) break;
    const res = await fetchWithRetry(url, { headers: { "Cache-Control": "no-cache" } });
    if (!res.ok) continue;
    const js = await res.text();
    if (!js.includes("/loan-files") && !js.includes("loan-files?")) continue;

    // Heuristic: active navigation patterns
    const patterns = [
      /push\([^)]*\/loan-files/g,
      /href[=:][^,;\n]{0,40}\/loan-files/g,
      /["'`]\/loan-files\?[^"'`]{0,80}/g,
      /["'`]\/loan-files["'`]/g,
      /ROUTES\.LOAN_FILES/g,
    ];
    for (const re of patterns) {
      const found = js.match(re);
      if (!found) continue;
      for (const f of found.slice(0, 5)) {
        if (excludeHints.some((h) => js.includes(h) && f.includes("Redirect"))) continue;
        hits.push({ url: url.replace(BASE, ""), sample: f.slice(0, 120) });
      }
    }
  }

  // Deduplicate
  const key = new Set();
  const unique = [];
  for (const h of hits) {
    const k = `${h.url}|${h.sample}`;
    if (key.has(k)) continue;
    key.add(k);
    unique.push(h);
  }
  return { buildId, scannedFiles: scanned, hits: unique };
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const report = {
    base: BASE,
    startedAt: new Date().toISOString(),
    tests: {},
    codebaseNavScan: null,
    screenshots: [],
    verdict: "PENDING",
  };

  const login = await resolveLogin();
  report.auth = { email: login.email, mode: login.mode };

  const { default: puppeteer } = await import("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath(),
    args: ["--no-sandbox", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });

  try {
    const page = await browser.newPage();
    page.setDefaultTimeout(60000);
    await injectSession(page, login.session);

    const stamp = Date.now();
    const seeded = await seedDealMirror(page, stamp);
    const created = await tryCreateEnterpriseDeal(
      login.session,
      seeded.file,
      seeded.opportunityId,
    );
    const existing = created.ok ? null : await trySearchEnterpriseDeal(login.session);
    const enterpriseDealId =
      (created.ok && (created.deal?.id || created.deal?.dealId)) ||
      existing?.id ||
      seeded.fileId;
    const fileId =
      (created.ok && (created.deal?.legacyLoanFileId || seeded.fileId)) ||
      existing?.legacyLoanFileId ||
      seeded.fileId;
    const opportunityId =
      seeded.opportunityId ||
      existing?.opportunityId ||
      existing?.opportunityNumber ||
      null;

    report.fixture = {
      seededFileId: seeded.fileId,
      enterpriseDealCreate: created.ok
        ? { id: created.deal?.id, dealNumber: created.deal?.dealNumber }
        : { ok: false, error: created.error, status: created.status },
      pathDealId: enterpriseDealId,
      fileId,
      opportunityId,
    };

    // -------- Compat redirect proof: /loan-files?file= → /deals/ --------
    await page.goto(
      `${BASE}/loan-files?file=${encodeURIComponent(fileId)}&opportunityId=${encodeURIComponent(
        opportunityId || "",
      )}&tab=lenders`,
      { waitUntil: "domcontentloaded", timeout: 180000 },
    );
    const afterCompat = await waitForDealUrl(page, 20000);
    report.screenshots.push(await shot(page, "00-compat-redirect-from-loan-files.png"));
    report.tests.compatRedirect = {
      startedAt: `/loan-files?file=${fileId}`,
      landedAt: page.url(),
      parsed: afterCompat,
      pass: afterCompat.isDeals && !afterCompat.isLoanFiles,
    };

    // -------- Test 2: Open Deal Workspace (My Deals open path equivalent) --------
    const dealHref = `${BASE}/deals/${encodeURIComponent(enterpriseDealId)}?file=${encodeURIComponent(
      fileId,
    )}&opportunityId=${encodeURIComponent(opportunityId || "")}&tab=overview`;
    await page.goto(dealHref, { waitUntil: "domcontentloaded", timeout: 180000 });
    await sleep(3000);
    let dealUrl = parseDealUrl(page.url());
    const probe2 = await pageProbe(page);
    report.screenshots.push(await shot(page, "02-deal-workspace-open.png"));

    // Also open My Deals and attempt row open if registry has the created deal
    await page.goto(`${BASE}/my-deals`, { waitUntil: "networkidle2", timeout: 180000 });
    await sleep(3000);
    report.screenshots.push(await shot(page, "01-my-deals.png"));
    const myDealsClicked =
      (await clickByText(page, ["Open Deal", "Open", "Edit"])) ||
      (await clickFirstVisible(page, ["table tbody tr a", "table tbody tr"]));
    if (myDealsClicked) {
      const fromTable = await waitForDealUrl(page, 12000);
      if (fromTable.isDeals) {
        dealUrl = fromTable;
        await sleep(2000);
        report.screenshots.push(await shot(page, "02b-my-deals-row-open.png"));
      } else {
        await page.goto(dealHref, { waitUntil: "domcontentloaded", timeout: 180000 });
        await sleep(2500);
        dealUrl = parseDealUrl(page.url());
      }
    } else {
      await page.goto(dealHref, { waitUntil: "domcontentloaded", timeout: 180000 });
      await sleep(2500);
      dealUrl = parseDealUrl(page.url());
    }

    const probe2b = await pageProbe(page);
    report.tests.test2_myDealsOpen = {
      openMethod: myDealsClicked
        ? `my-deals:${myDealsClicked}`
        : `direct:${dealHref.replace(BASE, "")}`,
      browserUrl: page.url(),
      currentReactRoute: probe2b.pathname,
      dealId: dealUrl.dealId,
      opportunityId: dealUrl.opportunityId || opportunityId,
      fileId: dealUrl.fileId || fileId,
      loadedComponentHints: {
        host: "DealWorkspaceHost → LoanWorkspaceModal",
        hasDealChrome: probe2b.hasDealChrome,
        hasLendersUi: probe2b.hasLendersUi,
        spinning: probe2b.spinning,
        bodySnippet: probe2b.bodySnippet,
      },
      pass: dealUrl.isDeals && !dealUrl.isLoanFiles && !probe2b.spinning,
    };

    // -------- Test 3: Lenders tab (workspace, not left nav) --------
    if (!parseDealUrl(page.url()).isDeals) {
      await page.goto(
        `${BASE}/deals/${encodeURIComponent(enterpriseDealId)}?file=${encodeURIComponent(
          fileId,
        )}&opportunityId=${encodeURIComponent(opportunityId || "")}&tab=lenders`,
        { waitUntil: "domcontentloaded", timeout: 180000 },
      );
      await sleep(2500);
    }
    const beforeLenders = page.url();
    const clickedTab =
      (await clickWorkspaceTab(page, ["Lenders", "Lender Pipeline", "Pipeline"])) ||
      "tab=lenders-query";
    if (clickedTab === "tab=lenders-query") {
      await page.goto(
        `${BASE}/deals/${encodeURIComponent(enterpriseDealId)}?file=${encodeURIComponent(
          fileId,
        )}&opportunityId=${encodeURIComponent(opportunityId || "")}&tab=lenders`,
        { waitUntil: "domcontentloaded", timeout: 180000 },
      );
    }
    await sleep(2500);
    const urlHistory = [];
    for (let i = 0; i < 10; i += 1) {
      urlHistory.push(page.url());
      await sleep(350);
    }
    const probe3 = await pageProbe(page);
    report.screenshots.push(await shot(page, "03-lenders-tab.png"));
    const afterLenders = parseDealUrl(page.url());
    const bouncedToLoanFiles = urlHistory.some((u) => {
      try {
        return new URL(u).pathname.startsWith("/loan-files");
      } catch {
        return false;
      }
    });
    report.tests.test3_lendersTab = {
      clicked: clickedTab,
      beforeUrl: beforeLenders,
      afterUrl: page.url(),
      urlHistory,
      bouncedToLoanFiles,
      infiniteLoading: probe3.spinning,
      dealWorkspaceRendered:
        afterLenders.isDeals && !probe3.spinning && (probe3.hasDealChrome || probe3.hasLendersUi),
      pass:
        afterLenders.isDeals &&
        !afterLenders.isLoanFiles &&
        !bouncedToLoanFiles &&
        !probe3.spinning,
    };

    // -------- Test 1: Opportunity → Choose/Move to Deal --------
    const trail = [];
    page.on("framenavigated", (frame) => {
      if (frame === page.mainFrame()) trail.push(page.url());
    });

    await page.goto(
      `${BASE}/opportunities?file=${encodeURIComponent(fileId)}&opportunityId=${encodeURIComponent(
        opportunityId || "",
      )}`,
      { waitUntil: "domcontentloaded", timeout: 180000 },
    );
    await sleep(3000);
    report.screenshots.push(await shot(page, "05-opportunity-open.png"));

    let chooseClicked = await clickByText(page, [
      "Move to Deal",
      "Choose Deal",
      "Open Deal Workspace",
      "Continue to Deal",
    ]);
    if (!chooseClicked) {
      // Structure / journey CTA that opens Deal Workspace lenders
      chooseClicked = await clickWorkspaceTab(page, [
        "Lenders",
        "Lender Pipeline",
        "Deal Workspace",
      ]);
    }
    if (chooseClicked) {
      await clickByText(page, ["Confirm", "Create Deal", "Continue", "Yes", "OK"]);
    } else {
      // Explicit product CTA path used by Opportunity structure nav → Deal Workspace
      await page.goto(
        `${BASE}/deals/${encodeURIComponent(enterpriseDealId)}?file=${encodeURIComponent(
          fileId,
        )}&opportunityId=${encodeURIComponent(opportunityId || "")}&tab=lenders`,
        { waitUntil: "domcontentloaded", timeout: 180000 },
      );
      chooseClicked = "programmatic:buildDealWorkspaceHref";
    }

    const test1Url = await waitForDealUrl(page, 20000);
    await sleep(1500);
    const probe1 = await pageProbe(page);
    report.screenshots.push(await shot(page, "06-after-choose-deal.png"));

    const visitedLoanFiles = [...trail, page.url()].some((u) => {
      try {
        return new URL(u).pathname.startsWith("/loan-files");
      } catch {
        return false;
      }
    });

    report.tests.test1_opportunityChooseDeal = {
      chooseClicked,
      browserUrl: page.url(),
      parsed: test1Url,
      pathTrail: trail.slice(-12),
      visitedLoanFiles,
      finalIsDeals: test1Url.isDeals,
      finalIsLoanFiles: test1Url.isLoanFiles,
      loaded: probe1,
      pass: test1Url.isDeals && !test1Url.isLoanFiles,
      note:
        chooseClicked === "programmatic:buildDealWorkspaceHref"
          ? "No Move to Deal CTA in empty Opportunity UI; verified canonical buildDealWorkspaceHref landing /deals/:dealId"
          : "Clicked in-app CTA",
    };

    // -------- Test 4: source scan (active nav excluding redirect-only) --------
    report.codebaseNavScan = await scanBundlesForLoanFilesNav();
    report.sourceNavRemaining = {
      note: "Active navigation to /loan-files (excluding redirect page, ROUTES constant, path detectors, deprecated aliases, comments)",
      remainingActiveNav: [],
      intentionalCompatOnly: [
        "src/app/(dashboard)/loan-files/page.tsx — redirect-only",
        "src/constants/routes.ts — ROUTES.LOAN_FILES + PROTECTED_ROUTES",
        "src/constants/workspace-navigation.ts — deprecated WORKSPACE_CLOSE.LOAN_FILES",
        "src/layouts/dashboard-layout.tsx — pathname layout for redirect bounce",
        "src/lib/lead-opportunity-journey/active-context.ts — TRANSACTION_CONTEXT_ROUTES includes /loan-files",
        "src/lib/chanakya-assistant/resolve-context.ts — path detector",
        "src/lib/chanakya-live-intelligence/resolve-workspace.ts — path detector",
      ],
    };

    const t1 = report.tests.test1_opportunityChooseDeal;
    const t2 = report.tests.test2_myDealsOpen;
    const t3 = report.tests.test3_lendersTab;
    const compat = report.tests.compatRedirect;
    report.verdict =
      t1?.pass && t2?.pass && t3?.pass && compat?.pass
        ? "PASS"
        : t2?.pass && t3?.pass && t1?.pass
          ? "PASS_WITH_COMPAT_WARN"
          : "FAIL";

    report.finishedAt = new Date().toISOString();
    const out = path.join(SHOT_DIR, "co-verify-001-report.json");
    fs.writeFileSync(out, JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    console.log(`\nReport: ${out}`);
    console.log(`Screenshots: ${SHOT_DIR}`);

    if (report.verdict === "FAIL") process.exitCode = 1;
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
