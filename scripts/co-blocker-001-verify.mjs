/**
 * CO-BLOCKER-001 — Loan Journey picker verification (production UI).
 *
 * Usage:
 *   VERIFY_ADMIN_PASSWORD=<current-password> node scripts/co-blocker-001-verify.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.VERIFY_BASE_URL || "https://catalyst-one-two.vercel.app";
const EMAIL = process.env.VERIFY_ADMIN_EMAIL || "admin@rupeecatalyst.com";
const PASSWORD = process.env.VERIFY_ADMIN_PASSWORD;

const SHOT_DIR = path.join(__dirname, "..", "docs", "certification-screenshots", "co-blocker-001");

if (!PASSWORD) {
  console.error("Set VERIFY_ADMIN_PASSWORD to the current production Super Admin password.");
  process.exit(1);
}

const stamp = Date.now();
const companyName = `BlockerCo ${stamp}`;
const contactName = `BlockerContact ${stamp}`;
const contactMobile = `9${String(stamp).slice(-9)}`;

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function login(page) {
  await page.goto(`${BASE}/login`, { waitUntil: "networkidle2", timeout: 120000 });
  await page.waitForSelector('input[type="email"]', { timeout: 30000 });
  await page.type('input[type="email"]', EMAIL, { delay: 10 });
  await page.type('input[type="password"]', PASSWORD, { delay: 10 });
  await page.click('button[type="submit"]');
  await sleep(3000);
  const url = page.url();
  if (url.includes("/login")) {
    throw new Error("Login failed — still on login page");
  }
}

async function createCompany(page) {
  await page.goto(`${BASE}/contacts`, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(1500);
  await page.evaluate(() => {
    document.querySelectorAll("button").forEach((b) => {
      if (b.textContent?.includes("Add Contact")) b.click();
    });
  });
  await sleep(800);
  await page.evaluate(() => {
    document.querySelectorAll("button").forEach((b) => {
      if (b.textContent?.trim() === "Company") b.click();
    });
  });
  await sleep(500);
  const inputs = await page.$$("input");
  for (const input of inputs) {
    const ph = await input.evaluate((el) => el.placeholder || "");
    if (/company|organisation|pvt/i.test(ph)) {
      await input.click({ clickCount: 3 });
      await input.type(companyName, { delay: 15 });
      break;
    }
  }
  await page.evaluate(() => {
    document.querySelectorAll("button").forEach((b) => {
      if (/continue/i.test(b.textContent || "")) b.click();
    });
  });
  await sleep(1200);
  await page.evaluate(() => {
    document.querySelectorAll("button").forEach((b) => {
      if (/save & continue/i.test(b.textContent || "")) b.click();
    });
  });
  await sleep(2500);
  await page.screenshot({ path: path.join(SHOT_DIR, "01-company-created.png") });
}

async function createContact(page) {
  await page.goto(`${BASE}/contacts`, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(1200);
  await page.evaluate(() => {
    document.querySelectorAll("button").forEach((b) => {
      if (b.textContent?.includes("Add Contact")) b.click();
    });
  });
  await sleep(800);
  await page.evaluate(() => {
    document.querySelectorAll("button").forEach((b) => {
      if (b.textContent?.trim() === "Individual") b.click();
    });
  });
  await sleep(400);
  const inputs = await page.$$("input");
  if (inputs[0]) {
    await inputs[0].click({ clickCount: 3 });
    await inputs[0].type(contactName, { delay: 15 });
  }
  await page.evaluate(() => {
    document.querySelectorAll("button").forEach((b) => {
      if (/continue/i.test(b.textContent || "")) b.click();
    });
  });
  await sleep(1000);
  const mobile = await page.$('input[placeholder*="mobile" i]');
  if (mobile) {
    await mobile.click({ clickCount: 3 });
    await mobile.type(contactMobile, { delay: 15 });
  }
  await page.evaluate(() => {
    const btn = [...document.querySelectorAll("button")].find(
      (b) => /save|create/i.test(b.textContent || "") && !/cancel/i.test(b.textContent || ""),
    );
    btn?.click();
  });
  await sleep(3000);
  await page.screenshot({ path: path.join(SHOT_DIR, "02-contact-created.png") });
}

async function openLoanJourney(page) {
  await page.goto(`${BASE}/loan-files?create=1`, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(2500);
  await page.waitForSelector('[role="dialog"]', { timeout: 30000 });
}

async function searchInDialog(page, placeholder, term) {
  const input = await page.waitForSelector(`input[placeholder="${placeholder}"]`, { timeout: 15000 });
  await input.click({ clickCount: 3 });
  await input.type(term, { delay: 30 });
  await sleep(2000);
  const text = await page.evaluate(() => document.body.innerText);
  return text.toLowerCase().includes(term.toLowerCase());
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });
  const { default: puppeteer } = await import("puppeteer");
  const chromePath =
    process.env.PUPPETEER_EXECUTABLE_PATH ||
    "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--window-size=1440,900"],
    executablePath: chromePath,
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();

  console.log(`CO-BLOCKER-001 verify → ${BASE}\n`);
  await login(page);
  console.log("✅ Logged in");

  await createCompany(page);
  console.log(`✅ Created company: ${companyName}`);

  await createContact(page);
  console.log(`✅ Created contact: ${contactName}`);

  await openLoanJourney(page);
  console.log("✅ Opened Loan Journey dialog");

  const companyFound = await searchInDialog(page, "Search company…", companyName);
  await page.screenshot({ path: path.join(SHOT_DIR, "03-company-in-loan-picker.png") });
  console.log(companyFound ? "✅ PASS — Company in Loan Journey picker" : "❌ FAIL — Company not in picker");

  const contactFound = await searchInDialog(page, "Search contact…", contactName);
  await page.screenshot({ path: path.join(SHOT_DIR, "04-contact-in-loan-picker.png") });
  console.log(contactFound ? "✅ PASS — Contact in Loan Journey picker" : "❌ FAIL — Contact not in picker");

  await browser.close();
  console.log(`\nScreenshots: ${SHOT_DIR}`);
  process.exit(companyFound && contactFound ? 0 : 1);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
