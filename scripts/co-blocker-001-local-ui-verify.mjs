/**
 * CO-BLOCKER-001 — Local UI verification with JWT session injection (no password).
 * Requires: dev server on localhost:3000, DATABASE_URL in .env.local
 *
 * Usage: node scripts/co-blocker-001-local-ui-verify.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const BASE = process.env.VERIFY_BASE_URL || "http://localhost:3000";
const SHOT_DIR = path.join(__dirname, "..", "docs", "certification-screenshots", "co-blocker-001");

config({ path: path.join(__dirname, "..", ".env.local") });
config({ path: path.join(__dirname, "..", ".env") });

const prisma = new PrismaClient();
const JWT_SECRET = process.env.JWT_SECRET || "dev-secret-change-in-production";
const JWT_REFRESH_SECRET = process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-in-production";

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

async function buildSession() {
  const user = await prisma.user.findFirst({
    where: { email: "admin@rupeecatalyst.com", isActive: true },
  });
  if (!user) throw new Error("admin@rupeecatalyst.com not found in database");

  const payload = { userId: user.id, email: user.email, role: user.role };
  const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "1h" });
  const refreshToken = jwt.sign(payload, JWT_REFRESH_SECRET, { expiresIn: "7d" });

  const sessionUser = {
    id: user.id,
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    isActive: user.isActive,
    employeeId: user.employeeId,
    mobile: user.mobile,
    department: user.department,
    mustChangePassword: false,
    reportingManagerId: user.reportingManagerId,
    eumUserId: user.eumUserId,
    createdAt: user.createdAt.toISOString(),
    updatedAt: user.updatedAt.toISOString(),
  };

  return { accessToken, refreshToken, user: sessionUser };
}

async function injectSession(page, session) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.evaluate(
    (s) => {
      localStorage.setItem("compass:access-token", s.accessToken);
      localStorage.setItem("compass:refresh-token", s.refreshToken);
      localStorage.setItem("compass:user", JSON.stringify(s.user));
      document.cookie = `compass-access-token=${s.accessToken}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `compass-refresh-token=${s.refreshToken}; path=/; max-age=604800; SameSite=Lax`;
    },
    session,
  );
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const [contacts, companies] = await Promise.all([
    prisma.ecmContact.findMany({
      where: { isDeleted: false },
      orderBy: { updatedAt: "desc" },
      take: 1,
      select: { name: true },
    }),
    prisma.ecmCompany.findMany({
      where: { isDeleted: false },
      orderBy: { updatedAt: "desc" },
      take: 1,
      select: { companyName: true },
    }),
  ]);

  const contactTerm = contacts[0]?.name;
  const companyTerm = companies[0]?.companyName;
  if (!contactTerm || !companyTerm) {
    throw new Error("Need at least one contact and company in PostgreSQL");
  }

  const session = await buildSession();
  const { default: puppeteer } = await import("puppeteer");
  const chromePath = process.env.PUPPETEER_EXECUTABLE_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: chromePath,
    args: ["--no-sandbox", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();

  console.log(`Local UI verify → ${BASE}`);
  await injectSession(page, session);
  await page.goto(`${BASE}/loan-files?create=1`, { waitUntil: "domcontentloaded", timeout: 180000 });
  await sleep(4000);

  const currentUrl = page.url();
  await page.screenshot({ path: path.join(SHOT_DIR, "00-loan-page.png") });
  if (currentUrl.includes("/login")) {
    throw new Error("Session injection failed — redirected to login");
  }

  const dialog = await page.$('[role="dialog"]');
  if (!dialog) {
    await page.evaluate(() => {
      const btn = [...document.querySelectorAll("button")].find((b) =>
        /new loan|start loan|create loan/i.test(b.textContent || ""),
      );
      btn?.click();
    });
    await sleep(2000);
  }

  await page.waitForSelector('[role="dialog"]', { timeout: 30000 });
  await page.screenshot({ path: path.join(SHOT_DIR, "00-loan-dialog-open.png") });

  async function searchPicker(placeholder, term, shotName) {
    const input = await page.waitForSelector(`input[placeholder="${placeholder}"]`, { timeout: 15000 });
    await input.click({ clickCount: 3 });
    await input.type(term.slice(0, Math.min(12, term.length)), { delay: 25 });
    await sleep(2500);
    const body = await page.evaluate(() => document.body.innerText);
    await page.screenshot({ path: path.join(SHOT_DIR, shotName) });
    return body.toLowerCase().includes(term.toLowerCase());
  }

  const companyFound = await searchPicker("Search company…", companyTerm, "03-company-in-loan-picker.png");
  console.log(companyFound ? `✅ Company picker: ${companyTerm}` : `❌ Company picker missing: ${companyTerm}`);

  const contactFound = await searchPicker("Search contact…", contactTerm, "04-contact-in-loan-picker.png");
  console.log(contactFound ? `✅ Contact picker: ${contactTerm}` : `❌ Contact picker missing: ${contactTerm}`);

  await browser.close();
  await prisma.$disconnect();

  console.log(`Screenshots: ${SHOT_DIR}`);
  process.exit(companyFound && contactFound ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
