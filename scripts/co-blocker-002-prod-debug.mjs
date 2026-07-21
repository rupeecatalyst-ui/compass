import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { config } from "dotenv";
import { PrismaClient } from "@prisma/client";
import jwt from "jsonwebtoken";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
config({ path: path.join(__dirname, "..", ".env.local") });

const BASE = "https://catalyst-one-two.vercel.app";
const SHOT = path.join(__dirname, "..", "docs", "certification-screenshots", "co-blocker-002", "debug-dialog.png");
const prisma = new PrismaClient();

async function sleep(ms) {
  return new Promise((r) => setTimeout(r, ms));
}

const admin = await prisma.user.findFirst({ where: { email: "admin@rupeecatalyst.com", isActive: true } });
const token = jwt.sign(
  { userId: admin.id, email: admin.email, role: admin.role },
  "dev-secret-change-in-production",
  { expiresIn: "1h" },
);
const session = {
  accessToken: token,
  refreshToken: token,
  user: { ...admin, mustChangePassword: false, createdAt: admin.createdAt.toISOString(), updatedAt: admin.updatedAt.toISOString() },
};

const stamp = Date.now();
const contactName = `CertLead ${stamp}`;
const contactMobile = `9${String(stamp).slice(-9)}`;

const createRes = await fetch(`${BASE}/api/ecm/contacts`, {
  method: "POST",
  headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
  body: JSON.stringify({
    name: contactName,
    mobilePrimary: contactMobile,
    personalEmail: `${stamp}@cert.test`,
    city: "Mumbai",
    state: "Maharashtra",
    primaryRole: "customer",
    roles: ["customer"],
    status: "active",
  }),
});
const created = (await createRes.json()).data;
console.log("created", created?.id, created?.name);

const { default: puppeteer } = await import("puppeteer");
const browser = await puppeteer.launch({
  headless: true,
  executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  args: ["--no-sandbox"],
  defaultViewport: { width: 1440, height: 900 },
});
const page = await browser.newPage();

await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded" });
await page.evaluate((sessionData) => {
  localStorage.setItem("compass:access-token", sessionData.accessToken);
  localStorage.setItem("compass:refresh-token", sessionData.refreshToken);
  localStorage.setItem("compass:user", JSON.stringify(sessionData.user));
  document.cookie = `compass-access-token=${sessionData.accessToken}; path=/; max-age=604800; SameSite=Lax`;
  document.cookie = `compass-refresh-token=${sessionData.refreshToken}; path=/; max-age=604800; SameSite=Lax`;
}, { sessionData: session });

await page.goto(`${BASE}/dashboard`, { waitUntil: "domcontentloaded", timeout: 120000 });
await sleep(2000);
console.log("after dashboard", page.url());

await page.goto(`${BASE}/loan-files?create=1`, { waitUntil: "domcontentloaded", timeout: 180000 });
await sleep(6000);
console.log("url", page.url());

const pre = await page.evaluate(() => ({
  hasDialog: Boolean(document.querySelector('[role="dialog"]')),
  bodySnippet: document.body.innerText.slice(0, 1200),
  inputs: [...document.querySelectorAll('[role="dialog"] input')].map((i) => ({
    ph: i.getAttribute("placeholder"),
    val: i.value,
  })),
}));
console.log(JSON.stringify(pre, null, 2));

if (pre.hasDialog) {
  await page.evaluate((term) => {
    const input =
      document.querySelector('[role="dialog"] input[placeholder*="contact" i]') ||
      document.querySelector('[role="dialog"] input');
    if (!input) return;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    if (setter) setter.call(input, term);
    else input.value = term;
    input.dispatchEvent(new Event("input", { bubbles: true }));
  }, String(stamp));
  await sleep(5000);
  const post = await page.evaluate(() => ({
    buttons: [...document.querySelectorAll('[role="dialog"] button')].map((b) => b.textContent?.trim()).filter(Boolean),
    dialogText: document.querySelector('[role="dialog"]')?.innerText?.slice(0, 2000),
  }));
  console.log(JSON.stringify(post, null, 2));
}

fs.mkdirSync(path.dirname(SHOT), { recursive: true });
await page.screenshot({ path: SHOT, fullPage: true });
console.log("screenshot", SHOT, fs.existsSync(SHOT));

await browser.close();
await prisma.$disconnect();
