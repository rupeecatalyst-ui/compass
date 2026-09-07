/**
 * Running React UI BAT — isolated Next on 127.0.0.1 against clean_002.
 * Never prints passwords. Never reuses a stale Next process.
 */
import { spawn, execSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const PARENT_NM = "C:\\Compass by Rupee Catalyst (3)\\node_modules";
const secret = JSON.parse(readFileSync(join(root, ".tmp/ppo-bat.secret.json"), "utf8"));
const dbIdx = process.argv.indexOf("--database");
const CLEAN_DB = dbIdx >= 0 ? process.argv[dbIdx + 1] : null;
if (CLEAN_DB !== "catalyst_one_product_program_bat_clean_002") {
  throw new Error("UI BAT must target catalyst_one_product_program_bat_clean_002.");
}
const HOST = "127.0.0.1";
const PORT = 3010;
const BASE = `http://${HOST}:${PORT}`;
const sectionIdx = process.argv.indexOf("--section");
const SECTION = sectionIdx >= 0 ? process.argv[sectionIdx + 1] : "full";
if (!["full", "deal-detail", "login-again", "programme", "opportunity-list", "publication"].includes(SECTION)) {
  throw new Error(`Unknown --section ${SECTION}. Use full | deal-detail | login-again | programme | opportunity-list | publication.`);
}
const shotDir = join(root, ".tmp/ppo-bat-screenshots");
mkdirSync(shotDir, { recursive: true });
const consoleLogs = [];
const pageErrors = [];
const failedRequests = [];
const networkSamples = [];

function urlFor(db) {
  return `postgresql://${encodeURIComponent(secret.user)}:${encodeURIComponent(secret.password)}@${HOST}:${secret.port}/${db}?schema=public`;
}

function redact(text) {
  return String(text)
    .replace(/postgresql:\/\/[^@\s]+@/g, "postgresql://***@")
    .replace(/password[=:]\s*\S+/gi, "password=***");
}

const webpackLog = [];
let prisma = null;
const childEnv = {
  ...process.env,
  NODE_PATH: PARENT_NM,
  DATABASE_URL: urlFor(CLEAN_DB),
  DIRECT_URL: urlFor(CLEAN_DB),
  JWT_SECRET: secret.jwtSecret,
  JWT_REFRESH_SECRET: secret.jwtRefreshSecret,
  ENTERPRISE_PERSISTENCE_MODE: "prisma",
  NEXT_PUBLIC_ENTERPRISE_PERSISTENCE_MODE: "prisma",
  ENTERPRISE_MARKETING_EMAIL_MODE: "dry_run",
  ENTERPRISE_MARKETING_EXECUTION_ENABLED: "false",
  NODE_ENV: "development",
  PORT: String(PORT),
  HOSTNAME: HOST,
  CATALYST_BAT_ISOLATED_PRISMA: "1",
  CATALYST_BAT_PRISMA_CLIENT_MODULE: ".tmp/generated/prisma-client",
  NEXT_TELEMETRY_DISABLED: "1",
};

if (SECTION === "publication") {
  const isolatedMod = await import(pathToFileURL(join(root, ".tmp/generated/prisma-client/index.js")).href);
  prisma = new isolatedMod.PrismaClient({
    datasources: { db: { url: urlFor(CLEAN_DB) } },
  });
}

const results = [];
const screenshots = [];
let sessionActor = "creator";
function record(id, ok, detail) {
  results.push({ id, ok, detail });
  console.log(JSON.stringify({ id, ok, detail }));
  if (!ok) {
    const excerpt = typeof detail?.excerpt === "string" ? ` excerpt=${detail.excerpt}` : "";
    throw new Error(`${id} FAIL${excerpt}`);
  }
}

function portListening() {
  try {
    const out = execSync("netstat -ano", { encoding: "utf8" });
    return out
      .split(/\r?\n/)
      .some((line) => line.includes(`${HOST}:${PORT}`) && /LISTENING/i.test(line));
  } catch {
    return false;
  }
}

function startNext() {
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [join(PARENT_NM, "next/dist/bin/next"), "dev", "--hostname", HOST, "--port", String(PORT)],
      { cwd: root, env: childEnv, stdio: ["ignore", "pipe", "pipe"] },
    );
    let ready = false;
    const failTimer = setTimeout(() => {
      if (!ready) reject(new Error("Next.js did not become ready within 180s"));
    }, 180_000);
    const onData = (chunk) => {
      const text = redact(String(chunk));
      webpackLog.push(text);
      process.stdout.write(text);
      if (/Ready in|started server|Local:/i.test(text)) {
        ready = true;
        clearTimeout(failTimer);
        resolve(child);
      }
    };
    child.stdout.on("data", onData);
    child.stderr.on("data", onData);
    child.on("error", reject);
    child.on("exit", (code) => {
      if (!ready) {
        clearTimeout(failTimer);
        reject(new Error(`Next.js exited ${code} before ready`));
      }
    });
  });
}

async function setInput(page, selector, value) {
  await page.waitForSelector(selector, { timeout: 30_000 });
  await page.click(selector, { clickCount: 3 });
  await page.keyboard.press("Backspace");
  await page.type(selector, value, { delay: 15 });
  const current = await page.$eval(selector, (el) => el.value);
  if (current !== value) {
    await page.$eval(
      selector,
      (el, next) => {
        const proto = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value");
        proto.set.call(el, next);
        el.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "insertText", data: next }));
        el.dispatchEvent(new Event("change", { bubbles: true }));
      },
      value,
    );
  }
  await page.waitForFunction(
    (sel, next) => document.querySelector(sel)?.value === next,
    { timeout: 10_000 },
    selector,
    value,
  );
}

const requireFromParent = createRequire(join(PARENT_NM, "puppeteer/package.json"));
const puppeteer = requireFromParent("puppeteer");

if (portListening()) {
  throw new Error(`127.0.0.1:${PORT} is already in use. Stop the previous Next process and retry.`);
}

const chromePath = [
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
].find((candidate) => candidate && existsSync(candidate));
if (!chromePath) {
  throw new Error("Puppeteer Chrome was not found. Set PUPPETEER_EXECUTABLE_PATH to a local Chrome binary.");
}
const child = await startNext();
await waitForHttpOk("/login");
await waitUntilRouteCompiles("/api/auth/login");
await waitUntilRouteCompiles("/api/auth/refresh");
const browser = await puppeteer.launch({
  headless: true,
  executablePath: chromePath,
  protocolTimeout: 600_000,
  args: ["--no-sandbox", `--window-size=1440,900`],
});
const page = await browser.newPage();
await page.setViewport({ width: 1440, height: 900 });
page.setDefaultNavigationTimeout(600_000);
page.setDefaultTimeout(420_000);
page.on("console", (msg) => {
  consoleLogs.push({ type: msg.type(), text: redact(msg.text()).slice(0, 500) });
});
page.on("pageerror", (err) => {
  pageErrors.push(redact(err?.message || String(err)).slice(0, 500));
});
page.on("requestfailed", (req) => {
  failedRequests.push({
    url: req.url().slice(0, 300),
    method: req.method(),
    failure: req.failure()?.errorText || null,
  });
});
page.on("response", (res) => {
  const url = res.url();
  if (/\/login(?:\?|$)|\/api\/auth\/|\/deals\/deal_ppo_adv_committed|\/workflow|\/api\/lender-registry\/programs/i.test(url)) {
    networkSamples.push({
      url: url.slice(0, 300),
      status: res.status(),
      method: res.request().method(),
    });
  }
});
console.log(JSON.stringify({
  batChildPid: child.pid,
  cleanupTarget: "spawned Next child only",
  port: PORT,
  section: SECTION,
  jwtExpiresInOverride: null,
}));

async function shot(name, assertion) {
  const file = join(shotDir, `${name}.png`);
  const vp = page.viewport() || { width: 1440, height: 900 };
  await page.screenshot({ path: file, fullPage: true });
  screenshots.push({
    filename: `${name}.png`,
    file,
    route: page.url(),
    screenSize: `${vp.width}x${vp.height}`,
    fixtureIdentity: "BAT creator / catalyst_one_product_program_bat_clean_002",
    assertion: assertion || name,
    result: "PASS",
  });
  return file;
}

async function waitForHttpOk(path, timeout = 360_000) {
  const deadline = Date.now() + timeout;
  let last = 0;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}${path}`, { redirect: "manual" });
      last = res.status;
      if (res.status === 200 || (res.status >= 300 && res.status < 400)) return res.status;
    } catch {
      /* Next still compiling */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`${path} did not become reachable (last HTTP ${last})`);
}

async function waitUntilRouteCompiles(path, timeout = 360_000) {
  const deadline = Date.now() + timeout;
  let last = 0;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${BASE}${path}`, { method: "GET", redirect: "manual" });
      last = res.status;
      if (res.status !== 404) return res.status;
    } catch {
      /* Next still compiling */
    }
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`${path} stayed 404 (last HTTP ${last})`);
}

function jwtExpMeta(token) {
  if (!token) return { present: false };
  try {
    const payload = JSON.parse(Buffer.from(token.split(".")[1], "base64url").toString("utf8"));
    const exp = Number(payload.exp) || null;
    const now = Math.floor(Date.now() / 1000);
    return {
      present: true,
      expired: exp != null ? now >= exp : null,
      remainingSec: exp != null ? exp - now : null,
    };
  } catch {
    return { present: true, decodeFailed: true };
  }
}

async function captureAuthDiagnostic(reason) {
  const tokens = await page.evaluate(() => ({
    access: localStorage.getItem("compass:access-token"),
    refresh: localStorage.getItem("compass:refresh-token"),
  }));
  let authMe = { status: null, code: null, bodyExcerpt: null };
  try {
    authMe = await page.evaluate(async () => {
      const token = localStorage.getItem("compass:access-token");
      const headers = token ? { Authorization: `Bearer ${token}` } : {};
      const res = await fetch("/api/auth/me", { headers });
      const text = await res.text();
      let code = null;
      try {
        code = JSON.parse(text)?.error?.code ?? null;
      } catch {
        /* HTML compile body */
      }
      return { status: res.status, code, bodyExcerpt: text.slice(0, 300) };
    });
  } catch (err) {
    authMe = { status: null, code: "FETCH_FAILED", bodyExcerpt: String(err.message) };
  }
  return {
    reason,
    url: page.url(),
    access: jwtExpMeta(tokens.access),
    refreshPresent: Boolean(tokens.refresh),
    authMe,
    consoleTail: consoleLogs.slice(-8),
    failedRequests: failedRequests.slice(-8),
    networkSamples: networkSamples.slice(-12),
  };
}

async function refreshBrowserSession() {
  const accessToken = await page.evaluate(() => localStorage.getItem("compass:access-token"));
  const meta = jwtExpMeta(accessToken);
  if (meta.present && meta.expired === false && (meta.remainingSec ?? 0) > 120) {
    return { ok: true, skipped: true, remainingSec: meta.remainingSec };
  }
  try {
    return await page.evaluate(async () => {
      try {
        const refreshToken = localStorage.getItem("compass:refresh-token");
        if (!refreshToken) return { ok: false, reason: "NO_REFRESH_TOKEN" };
        const res = await fetch("/api/auth/refresh", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({ refreshToken }),
        });
        const text = await res.text();
        let parsed = null;
        try {
          parsed = JSON.parse(text);
        } catch {
          parsed = null;
        }
        if (!res.ok || !parsed?.success || !parsed?.data?.accessToken) {
          return {
            ok: false,
            status: res.status,
            code: parsed?.error?.code || null,
            bodyExcerpt: text.slice(0, 300),
          };
        }
        localStorage.setItem("compass:access-token", parsed.data.accessToken);
        localStorage.setItem("compass:refresh-token", parsed.data.refreshToken);
        document.cookie = `compass-access-token=${parsed.data.accessToken}; path=/; max-age=${7 * 86400}; SameSite=Lax`;
        document.cookie = `compass-refresh-token=${parsed.data.refreshToken}; path=/; max-age=${7 * 86400}; SameSite=Lax`;
        return { ok: true, status: res.status };
      } catch (err) {
        return { ok: false, reason: "FETCH_FAILED", bodyExcerpt: String(err?.message || err) };
      }
    });
  } catch (err) {
    return { ok: false, reason: "EVALUATE_FAILED", bodyExcerpt: String(err?.message || err) };
  }
}

async function persistSessionFromLoginPayload(data) {
  if (!data?.accessToken || !data?.refreshToken) {
    throw new Error("Login JSON omitted accessToken/refreshToken.");
  }
  await page.evaluate((session) => {
    localStorage.setItem("compass:access-token", session.accessToken);
    localStorage.setItem("compass:refresh-token", session.refreshToken);
    if (session.user) localStorage.setItem("compass:user", JSON.stringify(session.user));
    document.cookie = `compass-access-token=${session.accessToken}; path=/; max-age=${7 * 86400}; SameSite=Lax`;
    document.cookie = `compass-refresh-token=${session.refreshToken}; path=/; max-age=${7 * 86400}; SameSite=Lax`;
  }, {
    accessToken: data.accessToken,
    refreshToken: data.refreshToken,
    user: data.user ?? null,
  });
  await page.waitForFunction(
    () => document.cookie.includes("compass-access-token="),
    { timeout: 30_000 },
  );
}

async function loginAs(userKey) {
  const expectedEmail = secret.users[userKey].email;
  const expectedPass = secret.users[userKey].password;
  const formDeadline = Date.now() + 360_000;
  let hasForm = false;
  while (Date.now() < formDeadline) {
    await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 360_000 });
    hasForm = Boolean(await page.$('input[type="email"]'));
    if (hasForm) break;
    await new Promise((r) => setTimeout(r, 2000));
  }
  if (!hasForm) {
    throw new Error("Login form did not appear after waiting for /login to compile.");
  }
  await page.waitForSelector('input[type="email"]', { timeout: 30_000 });
  await new Promise((r) => setTimeout(r, 2000));
  let loginResp = null;
  for (let submitAttempt = 0; submitAttempt < 4; submitAttempt++) {
    if (!page.url().includes("/login")) break;
    let filled = false;
    for (let attempt = 0; attempt < 8; attempt++) {
      if (!page.url().includes("/login")) break;
      await setInput(page, 'input[type="email"]', expectedEmail);
      await setInput(page, 'input[type="password"]', expectedPass);
      const emailVal = await page.$eval('input[type="email"]', (el) => el.value);
      const passVal = await page.$eval('input[type="password"]', (el) => el.value);
      if (emailVal === expectedEmail && passVal === expectedPass) {
        filled = true;
        break;
      }
      await new Promise((r) => setTimeout(r, 800));
    }
    if (!filled) {
      throw new Error("Login form values were empty before submit.");
    }
    const loginRespPromise = page.waitForResponse((res) => {
      if (!res.url().includes("/api/auth/login") || res.request().method() !== "POST") return false;
      const posted = res.request().postData() || "";
      return posted.length > 2 && posted.includes(expectedEmail);
    }, { timeout: 120_000 });
    await page.click('button[type="submit"]');
    try {
      loginResp = await loginRespPromise;
      break;
    } catch {
      await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 600_000 });
      await page.waitForSelector('input[type="email"]', { timeout: 30_000 });
    }
  }
  if (!loginResp) {
    throw new Error("Login POST with BAT email never reached the server.");
  }
  const status = loginResp.status();
  const contentType = loginResp.headers()["content-type"] || "";
  const bodyText = await loginResp.text();
  let parsed = null;
  try {
    parsed = JSON.parse(bodyText);
  } catch (err) {
    throw new Error(
      `Login JSON parse failed status=${status} contentType=${contentType} bodyLength=${bodyText.length} err=${err.message}`,
    );
  }
  if (status !== 200 || parsed?.success === false) {
    throw new Error(`Login HTTP ${status} code=${parsed?.error?.code || "none"}`);
  }
  await persistSessionFromLoginPayload(parsed?.data);
  await page.waitForNavigation({ waitUntil: "domcontentloaded", timeout: 360_000 }).catch(() => null);
  await new Promise((r) => setTimeout(r, 1500));
  return { status, contentType, url: page.url() };
}

async function logout() {
  try {
    await page.evaluate(async () => {
      try {
        const token = localStorage.getItem("compass:access-token");
        await fetch("/api/auth/logout", {
          method: "POST",
          headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
        });
      } catch {
        /* compile / Fast Refresh can abort this POST */
      }
      localStorage.clear();
    });
  } catch {
    /* execution context may already be gone */
  }
  const cookies = await page.cookies();
  if (cookies.length) await page.deleteCookie(...cookies);
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 180_000 });
}

function isTransientBrowserError(err) {
  return /Execution context was destroyed|Failed to fetch|net::ERR_|Target closed|Cannot find context with specified id/i.test(
    String(err?.message || err),
  );
}

async function safeEvaluate(fn, ...args) {
  let last = null;
  for (let i = 0; i < 8; i++) {
    try {
      return await page.evaluate(fn, ...args);
    } catch (err) {
      last = err;
      if (!isTransientBrowserError(err)) throw err;
      await new Promise((r) => setTimeout(r, 1000));
    }
  }
  throw last;
}

async function waitSettled({ selector, textRe, timeout = 420_000 } = {}) {
  const deadline = Date.now() + timeout;
  while (Date.now() < deadline) {
    if (selector && /\/login(\/|\?|$)/i.test(page.url()) && !/email|login/i.test(selector)) {
      const diag = await captureAuthDiagnostic(`waitSettled:${selector}`);
      throw new Error(`Landed on /login while waiting for ${selector}: ${JSON.stringify(diag)}`);
    }
    const ready = await safeEvaluate(
      (sel, reSrc) => {
        const t = document.body?.innerText || "";
        const compact = t.replace(/\s+/g, " ").trim();
        const hasTarget = Boolean(
          (sel && document.querySelector(sel)) || (reSrc && new RegExp(reSrc, "i").test(t)),
        );
        if (hasTarget) return true;
        const bootstrapping =
          compact.length < 400 && /Preparing( your workspace)?[.…]?/i.test(compact);
        if (bootstrapping) return false;
        if (sel) return Boolean(document.querySelector(sel));
        if (reSrc) return new RegExp(reSrc, "i").test(t);
        return compact.length > 80;
      },
      selector || null,
      textRe instanceof RegExp ? textRe.source : textRe || null,
    );
    if (ready) return;
    await new Promise((r) => setTimeout(r, 500));
  }
  throw new Error(`waitSettled timeout selector=${selector || ""} url=${page.url()}`);
}

async function go(path, selector) {
  const pathname = path.split("?")[0];
  await refreshBrowserSession();
  for (let attempt = 0; attempt < 3; attempt++) {
    try {
      await page.goto(`${BASE}${path}`, { waitUntil: "domcontentloaded", timeout: 600_000 });
    } catch (err) {
      if (!isTransientBrowserError(err)) throw err;
      continue;
    }
    if (/\/login(\/|\?|$)/i.test(page.url())) {
      const diag = await captureAuthDiagnostic(`go:${path}`);
      if (diag.access.expired === false && diag.authMe.status === 200) {
        throw new Error(`Login bounce is not JWT expiry: ${JSON.stringify(diag)}`);
      }
      await loginAs(sessionActor);
      await refreshBrowserSession();
      continue;
    }
    const deadline = Date.now() + 180_000;
    let ready = false;
    while (Date.now() < deadline) {
      if (/\/login(\/|\?|$)/i.test(page.url())) break;
      ready = await safeEvaluate(
        (expected, sel) => {
          const p = window.location.pathname;
          const pathOk =
            p === expected ||
            p.startsWith(`${expected}/`) ||
            (expected === "/deals" && (p === "/my-deals" || p.startsWith("/deals/")));
          if (!pathOk) return false;
          if (sel && !document.querySelector(sel)) return false;
          const compact = (document.body?.innerText || "").replace(/\s+/g, " ").trim();
          if (compact.length < 400 && /Preparing/i.test(compact)) return false;
          return compact.length > 40;
        },
        pathname,
        selector || null,
      );
      if (ready) break;
      await new Promise((r) => setTimeout(r, 1000));
    }
    if (/\/login(\/|\?|$)/i.test(page.url())) {
      const diag = await captureAuthDiagnostic(`go-wait:${path}`);
      if (diag.access.expired === false && diag.authMe.status === 200) {
        throw new Error(`Login bounce is not JWT expiry: ${JSON.stringify(diag)}`);
      }
      await loginAs(sessionActor);
      await refreshBrowserSession();
      continue;
    }
    if (ready) {
      await waitSettled({ selector, timeout: 60_000 });
      return;
    }
  }
  const diag = await captureAuthDiagnostic(`go-timeout:${path}`);
  throw new Error(`Navigation to ${path} did not become ready: ${JSON.stringify(diag)}`);
}

async function readBody() {
  await waitSettled({ timeout: 180_000 });
  const text = await page.evaluate(() => document.body?.innerText || "");
  return { text, excerpt: text.replace(/\s+/g, " ").slice(0, 400) };
}

async function bodyHas(re) {
  const { text, excerpt } = await readBody();
  return { text, ok: re.test(text), excerpt };
}

async function pageAuthedJson(url, attempts = 12) {
  let last = null;
  for (let i = 0; i < attempts; i++) {
    try {
      last = await page.evaluate(async (target) => {
        try {
          const token = localStorage.getItem("compass:access-token");
          const res = await fetch(target, {
            headers: token ? { Authorization: `Bearer ${token}` } : {},
          });
          const text = await res.text();
          let body = null;
          try {
            body = JSON.parse(text);
          } catch {
            body = null;
          }
          return { fetched: true, status: res.status, body, excerpt: text.slice(0, 200) };
        } catch (err) {
          return { fetched: false, reason: String(err?.message || err) };
        }
      }, url);
    } catch (err) {
      last = { fetched: false, reason: String(err?.message || err) };
    }
    if (last?.fetched && last.status === 200 && last.body) return last.body;
    await new Promise((r) => setTimeout(r, 2000));
  }
  throw new Error(`Authed JSON fetch failed for ${url}: ${JSON.stringify(last)}`);
}

try {
  const first = await loginAs("creator");
  record("UI-LOGIN", !/\/login(\/|\?|$)/i.test(first.url), first);
  await shot("01-after-login");

  if (SECTION === "publication") {
    await waitUntilRouteCompiles("/api/lender-registry/programs");
    const { runPublicationBat } = await import("./co-product-program-operations-001-pg-ui-publication-flow.mjs");
    const publication = await runPublicationBat({
      page,
      BASE,
      prisma,
      record,
      shot,
      go,
      loginAs,
      logout,
      pageAuthedJson,
      waitSettled,
      setInput,
      bodyHas,
      setSessionActor: (next) => {
        sessionActor = next;
      },
    });
    writeFileSync(
      join(root, ".tmp/ppo-publication-evidence.json"),
      `${JSON.stringify({
        ok: true,
        database: CLEAN_DB,
        base: BASE,
        marketingExecution: childEnv.ENTERPRISE_MARKETING_EXECUTION_ENABLED,
        emailMode: childEnv.ENTERPRISE_MARKETING_EMAIL_MODE,
        ...publication,
        results,
        screenshots,
        networkSamples: networkSamples.slice(-80),
      }, null, 2)}\n`,
    );
  } else if (SECTION === "deal-detail") {
    await go("/deals", '[data-testid="deal-registry-table"], table, [data-field="advantage-committed"]');
    const dealList = await bodyHas(/Advantage Committed \(₹\)/);
    record("UI-DEAL-LIST-ADVANTAGE", dealList.ok, { url: page.url() });
    await go("/deals/deal_ppo_adv_committed", '[data-field="advantage-committed"]');
    await waitSettled({ selector: '[data-field="advantage-committed"]', textRe: /Advantage Committed/i, timeout: 120_000 });
    const dealDetail = await bodyHas(/Advantage Committed \(₹\)/);
    record("UI-DEAL-DETAIL-ADVANTAGE", dealDetail.ok, { url: page.url() });
    await shot("21-deal-detail");
  } else if (SECTION === "opportunity-list") {
    await go("/my-opportunities");
    const oppList = await bodyHas(/Advantage Committed \(₹\)/);
    record("UI-OPPORTUNITY-LIST-ADVANTAGE", oppList.ok, { url: page.url() });
    await shot("18-opportunity-list-advantage", "Advantage Committed (₹) on Opportunity List");
  } else if (SECTION === "full" || SECTION === "programme") {
  await go("/admin/product-programs", '[data-testid="programme-new"]');
  const registry = await bodyHas(/Product Programmes|New Programme/i);
  record("UI-PROGRAMME-REGISTRY", registry.ok, { url: page.url() });
  await shot("01-programme-registry");

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((el) => /New Programme/i.test(el.textContent || ""));
    btn?.click();
  });
  await new Promise((r) => setTimeout(r, 1500));
  await page.waitForSelector('[data-testid="programme-lender"]', { timeout: 30_000 });
  await shot("02-programme-editor-identity");
  await page.click('[data-testid="programme-lender"]');
  await new Promise((r) => setTimeout(r, 400));
  record("UI-PROGRAMME-LENDER-DROPDOWN", true, { opened: true });
  await page.keyboard.press("Escape");
  await page.click('[data-testid="programme-product"]');
  await new Promise((r) => setTimeout(r, 400));
  record("UI-PROGRAMME-PRODUCT-DROPDOWN", true, { opened: true });
  await page.keyboard.press("Escape");

  const publishedBody = await pageAuthedJson("/api/lender-registry/programs?pageSize=50");
  const publishedItems = publishedBody?.data?.items || publishedBody?.data || [];
  const published = Array.isArray(publishedItems)
    ? publishedItems.find((row) => row.isLivePublished) || publishedItems[0]
    : null;
  record("UI-PROGRAMME-API-DURABLE", Boolean(published?.id), {
    id: published?.id,
    completenessState: published?.completenessState,
  });

  if (SECTION === "full") {
  await page.goto(`${BASE}/admin/product-programs?programId=${encodeURIComponent(published.id)}`, {
    waitUntil: "domcontentloaded",
    timeout: 180_000,
  });
  await page.waitForSelector('[data-section="programme-identity"]', { timeout: 30_000 });
  await shot("02-programme-editor-identity-loaded");
  await page.waitForSelector('[data-testid="multi-select-employment-types"]');
  await shot("03-employment-multi-select");
  await page.waitForSelector('[data-testid="multi-select-legal-constitution"]');
  await shot("04-constitution-multi-select");
  await page.waitForSelector('[data-section="eligibility"]');
  await page.$eval('[data-section="eligibility"]', (el) => el.scrollIntoView());
  await shot("05-eligibility");
  await page.$eval('[data-section="pricing-roi"]', (el) => el.scrollIntoView());
  await shot("06-pricing-roi");
  await page.$eval('[data-section="policy"]', (el) => el.scrollIntoView());
  await shot("07-policy");
  await page.$eval('[data-section="lod"]', (el) => el.scrollIntoView());
  await shot("08-lod");
  await page.$eval('[data-section="completeness-review"]', (el) => el.scrollIntoView());
  const completeText = await bodyHas(/Completeness: Complete/i);
  record("UI-PROGRAMME-COMPLETE-REVIEW", completeText.ok, { url: page.url() });
  await shot("09-completeness-review");
  await shot("10-publication-validation");

  await go("/admin/lender-registry");
  await page.waitForFunction(
    () => /Fixture Housing Finance|lender_ppo_clean/i.test(document.body?.innerText || ""),
    { timeout: 60_000 },
  );
  const lenderRegistry = await bodyHas(/Fixture Housing Finance|lender_ppo_clean/i);
  record("UI-LENDER-REGISTRY", lenderRegistry.ok, { url: page.url(), excerpt: lenderRegistry.excerpt });
  await shot("11-lender-registry");
  await page.goto(`${BASE}/lenders?workspace=lender_ppo_clean`, { waitUntil: "domcontentloaded", timeout: 180_000 });
  await page.waitForSelector('[data-testid="lender-360-root"]', { timeout: 90_000 });
  await page.waitForSelector('[data-testid="eld-tab-products"]', { timeout: 30_000 });
  await page.click('[data-testid="eld-tab-products"]');
  await page.waitForSelector('[data-testid="lender-360-programme-card"]', { timeout: 30_000 });
  const cardText = await page.$eval('[data-testid="lender-360-programme-card"]', (el) => el.textContent || "");
  const lender360 = /HOME_LOAN|Home Loan|v\d+|Policy/i.test(cardText);
  const notAvailableOnly = /No published product programmes for this lender/i.test(cardText);
  record("UI-LENDER-360", lender360 && !notAvailableOnly, {
    url: page.url(),
    excerpt: cardText.replace(/\s+/g, " ").slice(0, 400),
  });
  await shot("12-lender-360-complete-programme");
  await shot("13-version-history");

  await page.goto(`${BASE}/admin/product-programs?programId=${encodeURIComponent(published.id)}`, {
    waitUntil: "domcontentloaded",
    timeout: 180_000,
  });
  await page.waitForSelector('[data-testid="programme-save-draft"]', { timeout: 30_000 });
  const draftPatch = page.waitForResponse((res) => {
    return res.url().includes("/api/lender-registry/programs/") && res.request().method() === "PATCH";
  }, { timeout: 120_000 });
  await page.click('[data-testid="programme-save-draft"]');
  const draftResp = await draftPatch;
  if (draftResp.status() !== 200) {
    const failedBody = await draftResp.text();
    throw new Error(`Save Draft PATCH ${draftResp.status()} ${failedBody.slice(0, 300)}`);
  }
  await waitSettled({ selector: '[data-testid="programme-save-draft"]' });
  await shot("14-draft-revision");
  const afterDraftBody = await pageAuthedJson("/api/lender-registry/programs?page=1&pageSize=200&status=all&enabled=all");
  const afterDraftItems = afterDraftBody?.data?.items || afterDraftBody?.data || [];
  const afterDraftList = Array.isArray(afterDraftItems) ? afterDraftItems : [];
  const afterDraftRow = afterDraftList.find((row) => row.supersedesProgramId && row.publicationState !== "published")
    || afterDraftList.find((row) => row.publicationState === "draft");
  const afterDraftParent = afterDraftList.find((row) => row.id === afterDraftRow?.supersedesProgramId)
    || afterDraftList.find((row) => row.isLivePublished);
  const afterDraft = {
    draftId: afterDraftRow?.id ?? null,
    completenessState: afterDraftRow?.completenessState ?? null,
    parentLive: Boolean(afterDraftParent?.isLivePublished),
  };
  record("UI-DRAFT-REVISION-COMPLETE", afterDraft.completenessState === "complete" && afterDraft.parentLive, afterDraft);
  for (const testId of ["programme-submit", "programme-approve", "programme-publish"]) {
    const visible = await page.$(`[data-testid="${testId}"]`);
    record(`UI-PROGRAMME-${testId.toUpperCase()}`, Boolean(visible), { testId });
  }

  await go("/chanakya-radar", '[data-testid="published-programme-evidence"]');
  const chanakya = await bodyHas(/CHANAKYA programme evidence/i);
  record("UI-CHANAKYA-EVIDENCE", chanakya.ok, { url: page.url(), excerpt: chanakya.excerpt });
  await shot("15-chanakya-evidence");
  await go("/opportunity-compass", '[data-testid="published-programme-evidence"]');
  const compass = await bodyHas(/Opportunity Compass programme/i);
  record("UI-OPPORTUNITY-COMPASS", compass.ok, { url: page.url(), excerpt: compass.excerpt });
  await shot("16-opportunity-compass");
  await go("/credit-workbench?opportunityId=opp_ppo_adv_committed", '[data-testid="published-programme-evidence"]');
  const proposal = await bodyHas(/Proposal programme \/ version/i);
  record("UI-PROPOSAL-PROGRAMME", proposal.ok, { url: page.url(), excerpt: proposal.excerpt });
  await shot("17-proposal-programme-version");
  await go("/document-center?opportunityId=opp_ppo_adv_committed", '[data-testid="programme-lod-overlay"]');
  const lod = await bodyHas(/Programme LOD overlay|No published programme LOD overlay|required document/i);
  record("UI-LOD-OVERLAY", lod.ok, { url: page.url(), excerpt: lod.excerpt });

  await go("/my-opportunities");
  const oppList = await bodyHas(/Advantage Committed \(₹\)/);
  record("UI-OPPORTUNITY-LIST-ADVANTAGE", oppList.ok, { url: page.url() });
  await shot("18-opportunity-list-advantage");

  await go("/opportunities?opportunityId=opp_ppo_adv_committed", '[data-surface="opportunity-360-advantage-committed"]');
  const opp360 = await bodyHas(/Advantage Committed \(₹\)/);
  record("UI-OPPORTUNITY-360-ADVANTAGE", opp360.ok, { url: page.url() });
  await shot("19-opportunity-360");

  await go("/deals", '[data-testid="deal-registry-table"], table, [data-field="advantage-committed"]');
  const dealList = await bodyHas(/Advantage Committed \(₹\)/);
  record("UI-DEAL-LIST-ADVANTAGE", dealList.ok, { url: page.url() });
  await shot("20-deal-list");

  await go("/deals/deal_ppo_adv_committed", '[data-field="advantage-committed"]');
  if (/\/login(\/|\?|$)/i.test(page.url())) {
    await loginAs("creator");
    await go("/deals/deal_ppo_adv_committed", '[data-field="advantage-committed"]');
  }
  await waitSettled({ selector: '[data-field="advantage-committed"]', textRe: /Advantage Committed/i, timeout: 420_000 });
  const dealDetail = await bodyHas(/Advantage Committed \(₹\)/);
  record("UI-DEAL-DETAIL-ADVANTAGE", dealDetail.ok, { url: page.url() });
  await shot("21-deal-detail");

  await go("/my-deals");
  await waitSettled({ textRe: /Advantage Committed \(₹\)/ });
  const kanban = await bodyHas(/Advantage Committed \(₹\)/);
  record("UI-DEAL-KANBAN-ADVANTAGE", kanban.ok, { url: page.url() });
  await shot("22-deal-kanban");

  await go("/accounting?case=eac_ppo_adv_committed", "#accounting-case-eac_ppo_adv_committed");
  const accountingProof = await page.evaluate(() => {
    const table = document.querySelector('[data-testid="accounting-cases-table"]');
    const row = document.querySelector("#accounting-case-eac_ppo_adv_committed");
    const field = row?.querySelector('[data-field="advantage-committed"]');
    const tableText = (table?.innerText || "").replace(/\s+/g, " ");
    return {
      header: /Advantage Committed/i.test(tableText),
      amount: /1,25,000|125000/i.test(field?.textContent || ""),
      fieldText: (field?.textContent || "").replace(/\s+/g, " ").trim(),
      tableExcerpt: tableText.slice(0, 400),
    };
  });
  record("UI-ACCOUNTING-ADVANTAGE", accountingProof.header && accountingProof.amount, accountingProof);
  await shot("23-accounting-list-detail");

  await go("/contacts?contact=ecm_ppo_bat_customer");
  const c360 = await bodyHas(/Advantage Committed \(₹\)|BAT Customer One|OPP-PPO-HL-COMMITTED/i);
  record("UI-CUSTOMER-360", c360.ok, { url: page.url() });
  await shot("24-customer-360");

  await go("/opportunities?opportunityId=opp_ppo_adv_not_committed", '[data-surface="opportunity-360-advantage-committed"]');
  const notCommitted = await bodyHas(/Not committed/);
  record("UI-NOT-COMMITTED", notCommitted.ok, { url: page.url() });
  await shot("25-not-committed");

  await go("/opportunities?opportunityId=opp_ppo_adv_not_applicable", '[data-surface="opportunity-360-advantage-committed"]');
  const notApplicable = await bodyHas(/Not applicable/);
  record("UI-NOT-APPLICABLE", notApplicable.ok, { url: page.url() });
  await shot("26-not-applicable");

  await page.setViewport({ width: 390, height: 844 });
  await page.goto(`${BASE}/admin/product-programs?programId=${encodeURIComponent(published.id)}`, {
    waitUntil: "domcontentloaded",
    timeout: 600_000,
  });
  await waitSettled({ selector: '[data-section="programme-identity"], [data-testid="programme-save-draft"]', timeout: 180_000 });
  await shot("27-mobile-programme");
  await page.goto(`${BASE}/my-opportunities`, { waitUntil: "domcontentloaded", timeout: 600_000 });
  await waitSettled({ textRe: /Advantage Committed|My Opportunities|Opportunity/i, timeout: 180_000 });
  await shot("28-mobile-deal-opportunity");
  }
  }

  if (SECTION === "full" || SECTION === "login-again") {
  await page.setViewport({ width: 1440, height: 900 });
  const existingCookies = await page.cookies();
  if (existingCookies.length) await page.deleteCookie(...existingCookies);
  await page.evaluate(() => localStorage.clear());
  const second = await loginAs("creator");
  record("UI-LOGIN-AGAIN", !/\/login(\/|\?|$)/i.test(second.url), second);
  await page.evaluate(async () => {
    try {
      const token = localStorage.getItem("compass:access-token");
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      });
    } catch {
      /* compile / Fast Refresh can abort this POST */
    }
    localStorage.clear();
  });
  const afterLogoutCookies = await page.cookies();
  if (afterLogoutCookies.length) await page.deleteCookie(...afterLogoutCookies);
  const third = await loginAs("creator");
  record("UI-LOGIN-LOGOUT-LOGIN", !/\/login(\/|\?|$)/i.test(third.url), third);
  }

  const joinedLog = webpackLog.join("\n");
  record("WEBPACK-NO-CREATE-REQUIRE", !/createRequire/i.test(joinedLog), {
    matched: /createRequire/i.test(joinedLog),
  });

  writeFileSync(
    join(root, ".tmp/ppo-ui-bat-results.json"),
    `${JSON.stringify({ ok: true, section: SECTION, database: CLEAN_DB, base: BASE, batChildPid: child.pid, screenshots, results }, null, 2)}\n`,
  );
  writeFileSync(join(shotDir, "manifest.json"), `${JSON.stringify(screenshots, null, 2)}\n`);
  const statusLine = SECTION === "publication"
    ? "FOCUSED UI PUBLICATION BAT PASSED"
    : SECTION === "full"
      ? "FULL UI BAT PASSED — READY FOR PRODUCT OWNER REVIEW"
      : `UI BAT SECTION ${SECTION} PASSED`;
  console.log(JSON.stringify({ ok: true, status: statusLine, section: SECTION, database: CLEAN_DB, base: BASE, screenshotCount: screenshots.length, results }));
} catch (err) {
  try {
    await shot("FAIL-current", err?.message || "failure");
    if (screenshots.length) screenshots[screenshots.length - 1].result = "FAIL";
  } catch {
    /* page may already be gone */
  }
  const failure = {
    ok: false,
    section: SECTION,
    database: CLEAN_DB,
    base: BASE,
    batChildPid: child?.pid ?? null,
    url: page?.url?.() ?? null,
    message: err?.message || String(err),
    stack: err?.stack || null,
    consoleLogs: consoleLogs.slice(-40),
    pageErrors: pageErrors.slice(-20),
    failedRequests: failedRequests.slice(-20),
    networkSamples: networkSamples.slice(-30),
    webpackTail: webpackLog.join("").slice(-8000),
  };
  writeFileSync(join(root, ".tmp/ppo-ui-bat-failure.json"), `${JSON.stringify(failure, null, 2)}\n`);
  console.error(err?.stack || err);
  throw err;
} finally {
  if (prisma) {
    try {
      await prisma.$disconnect();
    } catch {
      /* closed */
    }
  }
  try {
    await browser.close();
  } catch {
    /* closed */
  }
  // Cleanup targets only the Next process spawned by startNext() in this BAT.
  // Never taskkill /T, never kill an unidentified PID, never scan the machine.
  if (child?.pid) {
    try {
      child.kill("SIGTERM");
    } catch {
      /* already exited */
    }
  }
}
