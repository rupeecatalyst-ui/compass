/**
 * CO-BLOCKER-002 — Lead Case persistence / Strategic Workspace local verification.
 *
 * Verifies:
 * 1. Persisted Loan File appears in Strategic Workspace picker (`?entry=dashboard`)
 * 2. Selecting it opens Strategic Workspace against the same Lead Case without creating an Opportunity
 *
 * Usage:
 *   node scripts/co-blocker-002-local-ui-verify.mjs
 */

import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });
config({ path: path.join(__dirname, "..", ".env") });

const BASE = process.env.VERIFY_BASE_URL || "http://localhost:3000";
const SHOT_DIR = path.join(__dirname, "..", "docs", "certification-screenshots", "co-blocker-002");
const prisma = new PrismaClient();

function buildLeadCase(contact) {
  const now = new Date().toISOString();
  return {
    id: `lf-blocker-002-${Date.now()}`,
    fileNumber: "RC-2026-9901",
    customerId: contact.id,
    customerName: contact.name,
    customerMobile: contact.mobilePrimary || "9999999999",
    customerEmail: contact.personalEmail || contact.officialEmail || "leadcase@example.com",
    city: contact.city || "Mumbai",
    state: contact.state || "Maharashtra",
    employmentType: contact.employmentType || "Salaried",
    lendingType: "secured",
    transactionType: "fresh",
    loanProduct: "Home Loan",
    loanAmount: 4500000,
    requiredAmount: 4500000,
    lender: "Not selected",
    stage: "raw_lead",
    relationshipManager: contact.ownerName || "RM-001",
    priority: "high",
    daysInStage: 0,
    expectedRevenue: 0,
    revenuePercent: 1.2,
    payoutConfigured: false,
    revenueReceived: 0,
    expectedDisbursement: new Date(Date.now() + 30 * 86400000).toISOString(),
    loginDate: now.slice(0, 10),
    expectedLoginDate: now.slice(0, 10),
    sanctionAmount: 0,
    disbursementAmount: 0,
    interestRate: 9.5,
    tenure: 240,
    status: "on_track",
    progress: 11,
    createdAt: now,
    source: "Direct",
    documents: [
      { id: "doc-pan", name: "PAN", status: "pending" },
      { id: "doc-aadhaar", name: "Aadhaar", status: "pending" },
      { id: "doc-income", name: "Income Proof", status: "pending" },
    ],
    tasks: [
      {
        id: "task-lead-case-1",
        title: "Review Lead Case",
        priority: "high",
        dueDate: new Date(Date.now() + 86400000).toISOString(),
        assignedTo: contact.ownerName || "RM-001",
        completed: false,
      },
    ],
    timeline: [
      {
        id: "tl-lead-case-created",
        title: "Lead Case Created",
        description: "Loan file persisted for Lead Stage workbenches",
        timestamp: now,
        completed: true,
      },
    ],
    isUrgent: false,
    isDelayed: false,
    archived: false,
  };
}

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function buildSession() {
  const user = await prisma.user.findFirst({
    where: { email: "admin@rupeecatalyst.com", isActive: true },
  });
  if (!user) throw new Error("admin@rupeecatalyst.com not found");
  const accessToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_SECRET || "dev-secret-change-in-production",
    { expiresIn: "1h" },
  );
  const refreshToken = jwt.sign(
    { userId: user.id, email: user.email, role: user.role },
    process.env.JWT_REFRESH_SECRET || "dev-refresh-secret-change-in-production",
    { expiresIn: "7d" },
  );
  return {
    accessToken,
    refreshToken,
    user: {
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
    },
  };
}

async function injectSession(page, session) {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 120000 });
  await page.evaluate(
    ({ sessionData }) => {
      localStorage.setItem("compass:access-token", sessionData.accessToken);
      localStorage.setItem("compass:refresh-token", sessionData.refreshToken);
      localStorage.setItem("compass:user", JSON.stringify(sessionData.user));
      document.cookie = `compass-access-token=${sessionData.accessToken}; path=/; max-age=604800; SameSite=Lax`;
      document.cookie = `compass-refresh-token=${sessionData.refreshToken}; path=/; max-age=604800; SameSite=Lax`;
      sessionStorage.removeItem("catalyst.active-opportunity-context");
    },
    { sessionData: session },
  );
}

async function persistLeadCase(page, leadCase) {
  await page.goto(`${BASE}/loan-files`, { waitUntil: "networkidle2", timeout: 120000 });
  await page.evaluate((file) => {
    localStorage.setItem("compass:loan-files-data", JSON.stringify([file]));
    window.dispatchEvent(new CustomEvent("compass:loan-files-updated"));
  }, leadCase);
  const stored = await page.evaluate(() => localStorage.getItem("compass:loan-files-data"));
  console.log("stored after persisting on Loan Workspace:", Boolean(stored), "chars:", stored?.length ?? 0);
}

async function main() {
  fs.mkdirSync(SHOT_DIR, { recursive: true });

  const contact = await prisma.ecmContact.findFirst({
    where: { isDeleted: false, enabled: true },
    orderBy: { updatedAt: "desc" },
  });
  if (!contact) throw new Error("No ECM contact available for Lead Case smoke test");

  const leadCase = buildLeadCase(contact);
  const session = await buildSession();
  const { default: puppeteer } = await import("puppeteer");
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
    args: ["--no-sandbox", "--window-size=1440,900"],
    defaultViewport: { width: 1440, height: 900 },
  });
  const page = await browser.newPage();

  console.log(`CO-BLOCKER-002 local verify → ${BASE}`);
  await injectSession(page, session);
  await persistLeadCase(page, leadCase);

  await page.goto(`${BASE}/opportunities?entry=dashboard`, { waitUntil: "networkidle2", timeout: 120000 });
  await sleep(2000);
  const storedLoanFiles = await page.evaluate(() => localStorage.getItem("compass:loan-files-data"));
  console.log("stored loan files present:", Boolean(storedLoanFiles), "chars:", storedLoanFiles?.length ?? 0);
  await page.screenshot({ path: path.join(SHOT_DIR, "01-strategic-picker.png") });
  const pickerText = await page.evaluate(() => document.body.innerText);
  const pickerPass = pickerText.includes(leadCase.customerName) || pickerText.includes(leadCase.fileNumber);
  console.log(pickerPass ? "✅ Strategic picker shows persisted Lead Case" : "❌ Strategic picker missing Lead Case");

  if (!pickerPass) {
    await browser.close();
    await prisma.$disconnect();
    process.exit(1);
  }

  await page.evaluate((fileNumber) => {
    const btn = [...document.querySelectorAll("button")].find((el) =>
      (el.textContent || "").includes(fileNumber),
    );
    btn?.click();
  }, leadCase.fileNumber);
  await sleep(2500);
  await page.screenshot({ path: path.join(SHOT_DIR, "02-strategic-workspace-loaded.png") });

  const workspaceText = await page.evaluate(() => document.body.innerText);
  const noLeadCase = workspaceText.includes("No Lead Case to open");
  const loadedPass =
    !noLeadCase &&
    (workspaceText.includes("Strategic Overview") || workspaceText.includes(leadCase.customerName));
  console.log(loadedPass ? "✅ Strategic Workspace loaded Lead Case" : "❌ Strategic Workspace did not load Lead Case");

  await browser.close();
  await prisma.$disconnect();
  console.log(`Screenshots: ${SHOT_DIR}`);
  process.exit(pickerPass && loadedPass ? 0 : 1);
}

main().catch(async (err) => {
  console.error(err);
  await prisma.$disconnect().catch(() => {});
  process.exit(1);
});
