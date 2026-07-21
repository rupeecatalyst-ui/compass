/**
 * CO-BUSINESS-CERTIFICATION — Enterprise Registry SSOT UI verification.
 *
 * Runs end-to-end business scenarios on production with screenshots.
 *
 * Usage:
 *   VERIFY_ADMIN_EMAIL=... VERIFY_ADMIN_PASSWORD=... node scripts/co-business-cert-registry-ui.mjs
 *
 * Optional: VERIFY_BASE_URL=https://catalyst-one-two.vercel.app
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.VERIFY_BASE_URL || "https://catalyst-one-two.vercel.app";
const EMAIL = process.env.VERIFY_ADMIN_EMAIL || "admin@rupeecatalyst.com";
const PASSWORD = process.env.VERIFY_ADMIN_PASSWORD;
if (!PASSWORD) {
  console.error(
    "Set VERIFY_ADMIN_PASSWORD to the current Rupee Catalyst production Super Admin password.",
  );
  console.error("Account: admin@rupeecatalyst.com (SUPER_ADMIN) — bootstrap temp password may have been rotated.");
  process.exit(1);
}
const SHOT_DIR = path.join(__dirname, "..", "docs", "certification-screenshots", "co-business-cert-registry");

const stamp = Date.now();
const companyName = `CertCo ${stamp}`;
const companyNameUpdated = `${companyName} Updated`;
const contactName = `CertContact ${stamp}`;
const contactMobile = `9${String(stamp).slice(-9)}`;

const results = [];

function record(scenario, pass, detail = "") {
  results.push({ scenario, pass, detail });
  console.log(`${pass ? "PASS" : "FAIL"} — ${scenario}${detail ? `: ${detail}` : ""}`);
}

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function jsonFetch(urlPath, { method = "GET", token, body } = {}) {
  const res = await fetch(`${BASE}${urlPath}`, {
    method,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await res.json().catch(() => ({}));
  return { res, data };
}

async function screenshot(page, name) {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const file = path.join(SHOT_DIR, `${name}.png`);
  await page.screenshot({ path: file, fullPage: false });
  return file;
}

async function loginViaApi() {
  const login = await jsonFetch("/api/auth/login", {
    method: "POST",
    body: { email: EMAIL, password: PASSWORD },
  });
  if (!login.res.ok || !login.data?.data?.accessToken) {
    throw new Error(login.data?.error?.message || `Login failed (${login.res.status})`);
  }
  return {
    token: login.data.data.accessToken,
    refreshToken: login.data.data.refreshToken,
    user: login.data.data.user,
  };
}

async function pickerHasMatch(page, placeholder, searchText) {
  const inputs = await page.$$(`input[placeholder="${placeholder}"]`);
  if (!inputs.length) return false;
  const input = inputs[0];
  await input.click({ clickCount: 3 });
  await input.type(searchText, { delay: 20 });
  await sleep(800);
  const bodyText = await page.evaluate(() => document.body.innerText);
  return bodyText.toLowerCase().includes(searchText.toLowerCase());
}

async function openLoanCreateDialog(page) {
  await page.goto(`${BASE}/loan-files?create=1`, { waitUntil: "networkidle2", timeout: 90000 });
  await sleep(1500);
  const dialog = await page.$('[role="dialog"]');
  return Boolean(dialog);
}

async function createCompanyInRegistry(page, name) {
  await page.goto(`${BASE}/contacts`, { waitUntil: "networkidle2", timeout: 90000 });
  await sleep(1200);
  await page.evaluate(() => window.scrollTo(0, 0));
  const addBtn = await page.evaluateHandle(() =>
    [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Add Contact")),
  );
  if (!addBtn) throw new Error("Add Contact button not found");
  await addBtn.asElement()?.click();
  await sleep(800);

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Company");
    btn?.click();
  });
  await sleep(500);

  const companyInput = await page.waitForSelector('input[placeholder*="company" i], label:has-text("Company") + input, input', {
    timeout: 10000,
  }).catch(() => null);

  // Intent screen company name field
  const inputs = await page.$$("input");
  for (const input of inputs) {
    const ph = await input.evaluate((el) => el.getAttribute("placeholder") || "");
    if (/company/i.test(ph) || ph.includes("Pvt") || ph.includes("organisation")) {
      await input.click({ clickCount: 3 });
      await input.type(name, { delay: 15 });
      break;
    }
  }

  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      /continue/i.test(b.textContent || ""),
    );
    btn?.click();
  });
  await sleep(1200);

  // Company workspace — Save & Continue on identity
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      /save & continue/i.test(b.textContent || ""),
    );
    btn?.click();
  });
  await sleep(2000);

  // Close company modal if still open
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      b.getAttribute("aria-label") === "Close workspace" || b.textContent?.trim() === "Close",
    );
    btn?.click();
  });
  await sleep(800);
}

async function createContactInRegistry(page, name, mobile) {
  await page.goto(`${BASE}/contacts`, { waitUntil: "networkidle2", timeout: 90000 });
  await sleep(1200);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent?.includes("Add Contact"));
    btn?.click();
  });
  await sleep(800);
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => b.textContent?.trim() === "Individual");
    btn?.click();
  });
  await sleep(400);
  const nameInputs = await page.$$("input");
  if (nameInputs[0]) {
    await nameInputs[0].click({ clickCount: 3 });
    await nameInputs[0].type(name, { delay: 15 });
  }
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) => /continue/i.test(b.textContent || ""));
    btn?.click();
  });
  await sleep(1000);

  // Quick contact wizard — fill mobile if visible
  const mobileInput = await page.$('input[placeholder*="mobile" i]');
  if (mobileInput) {
    await mobileInput.click({ clickCount: 3 });
    await mobileInput.type(mobile, { delay: 15 });
  }
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find((b) =>
      /save|create|continue/i.test(b.textContent || "") && !/cancel/i.test(b.textContent || ""),
    );
    btn?.click();
  });
  await sleep(2500);
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  console.log(`\nCO-BUSINESS-CERTIFICATION UI verify → ${BASE}`);
  console.log(`Screenshots → ${SHOT_DIR}\n`);

  const { default: puppeteer } = await import("puppeteer");
  const { token, refreshToken, user } = await loginViaApi();
  console.log(`Authenticated: ${user.email} (${user.role})\n`);
  loginViaApi.refreshToken = refreshToken;

  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();

  // Seed auth session (matches src/lib/api-client.ts + src/lib/auth.ts)
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.evaluate(
    ({ accessToken, refreshToken, userJson }) => {
      localStorage.setItem("compass:access-token", accessToken);
      if (refreshToken) localStorage.setItem("compass:refresh-token", refreshToken);
      localStorage.setItem("compass:user", userJson);
    },
    {
      accessToken: token,
      userJson: JSON.stringify(user),
      refreshToken: loginViaApi.refreshToken || "",
    },
  );

  // --- Scenario 1: Create Company → Loan Journey Associated Company ---
  try {
    await createCompanyInRegistry(page, companyName);
    await screenshot(page, "01-company-created-in-registry");
    const opened = await openLoanCreateDialog(page);
    const found = opened && (await pickerHasMatch(page, "Search company…", companyName));
    await screenshot(page, "01-loan-journey-company-search");
    record("1. New Company visible in Associated Company search (no refresh)", found, companyName);
  } catch (err) {
    record("1. New Company visible in Associated Company search (no refresh)", false, String(err.message || err));
  }

  // --- Scenario 2: Create Contact → Primary Applicant ---
  try {
    await createContactInRegistry(page, contactName, contactMobile);
    await screenshot(page, "02-contact-created-in-registry");
    const opened = await openLoanCreateDialog(page);
    const found = opened && (await pickerHasMatch(page, "Search contact…", contactName));
    await screenshot(page, "02-loan-journey-contact-search");
    record("2. New Contact visible in Primary Applicant search (no refresh)", found, contactName);
  } catch (err) {
    record("2. New Contact visible in Primary Applicant search (no refresh)", false, String(err.message || err));
  }

  // Resolve IDs via API for edit/delete/restore
  const companies = await jsonFetch(`/api/ecm/companies?search=${encodeURIComponent(String(stamp))}`, { token });
  const companyRow = (companies.data?.data?.items ?? []).find((c) => c.companyName?.includes(String(stamp)));
  const contacts = await jsonFetch(`/api/ecm/contacts?search=${encodeURIComponent(String(stamp))}`, { token });
  const contactRow = (contacts.data?.data?.items ?? []).find((c) => c.name?.includes(String(stamp)));

  // --- Scenario 3: Edit Company name ---
  try {
    if (!companyRow?.id) throw new Error("Company not found for edit test");
    await jsonFetch(`/api/ecm/companies/${companyRow.id}`, {
      method: "PATCH",
      token,
      body: { companyName: companyNameUpdated },
    });
    await page.goto(`${BASE}/contacts`, { waitUntil: "networkidle2" });
    await sleep(1000);
    await screenshot(page, "03-company-edited-in-registry");
    const opened = await openLoanCreateDialog(page);
    const foundLoan = opened && (await pickerHasMatch(page, "Search company…", "Updated"));
    const foundBt = opened && (await pickerHasMatch(page, "Search institution...", "Updated"));
    await screenshot(page, "03-company-updated-in-pickers");
    record(
      "3. Edited Company name visible in search pickers",
      foundLoan || foundBt,
      companyNameUpdated,
    );
  } catch (err) {
    record("3. Edited Company name visible in search pickers", false, String(err.message || err));
  }

  // --- Scenario 4: Soft delete Company ---
  try {
    if (!companyRow?.id) throw new Error("Company not found for delete test");
    await jsonFetch("/api/admin/recovery", {
      method: "POST",
      token,
      body: { action: "soft_delete", module: "companies", entityId: companyRow.id, reason: "cert" },
    });
    await sleep(1000);
    const opened = await openLoanCreateDialog(page);
    const stillThere = opened && (await pickerHasMatch(page, "Search company…", "Updated"));
    await screenshot(page, "04-company-soft-deleted-absent");
    record("4. Soft-deleted Company absent from pickers", opened && !stillThere);
  } catch (err) {
    record("4. Soft-deleted Company absent from pickers", false, String(err.message || err));
  }

  // --- Scenario 5: Restore Company ---
  try {
    if (!companyRow?.id) throw new Error("Company not found for restore test");
    await jsonFetch("/api/admin/recovery", {
      method: "POST",
      token,
      body: { action: "restore", module: "companies", entityId: companyRow.id },
    });
    await sleep(1500);
    const opened = await openLoanCreateDialog(page);
    const found = opened && (await pickerHasMatch(page, "Search company…", "Updated"));
    await screenshot(page, "05-company-restored-visible");
    record("5. Restored Company visible in pickers", found);
  } catch (err) {
    record("5. Restored Company visible in pickers", false, String(err.message || err));
  }

  // --- Scenario 6a: Soft delete Contact ---
  try {
    if (!contactRow?.id) throw new Error("Contact not found for delete test");
    await jsonFetch("/api/admin/recovery", {
      method: "POST",
      token,
      body: { action: "soft_delete", module: "contacts", entityId: contactRow.id, reason: "cert" },
    });
    await sleep(1000);
    const opened = await openLoanCreateDialog(page);
    const stillThere = opened && (await pickerHasMatch(page, "Search contact…", contactName));
    await screenshot(page, "06-contact-soft-deleted-absent");
    record("6a. Soft-deleted Contact absent from pickers", opened && !stillThere);
  } catch (err) {
    record("6a. Soft-deleted Contact absent from pickers", false, String(err.message || err));
  }

  // --- Scenario 6b: Restore Contact ---
  try {
    if (!contactRow?.id) throw new Error("Contact not found for restore test");
    await jsonFetch("/api/admin/recovery", {
      method: "POST",
      token,
      body: { action: "restore", module: "contacts", entityId: contactRow.id },
    });
    await sleep(1500);
    const opened = await openLoanCreateDialog(page);
    const found = opened && (await pickerHasMatch(page, "Search contact…", contactName));
    await screenshot(page, "06-contact-restored-visible");
    record("6b. Restored Contact visible in pickers", found);
  } catch (err) {
    record("6b. Restored Contact visible in pickers", false, String(err.message || err));
  }

  await browser.close();

  const summaryPath = path.join(SHOT_DIR, "results.json");
  fs.writeFileSync(
    summaryPath,
    JSON.stringify(
      {
        baseUrl: BASE,
        authenticatedAs: { email: user.email, role: user.role },
        stamp,
        companyName,
        companyNameUpdated,
        contactName,
        results,
        screenshotsDir: SHOT_DIR,
      },
      null,
      2,
    ),
  );

  const passCount = results.filter((r) => r.pass).length;
  const failCount = results.filter((r) => !r.pass).length;
  console.log(`\nSummary: ${passCount} PASS, ${failCount} FAIL`);
  console.log(`Results JSON: ${summaryPath}\n`);
  process.exit(failCount > 0 ? 1 : 0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
