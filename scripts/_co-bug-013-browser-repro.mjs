/**
 * CO-BUG-013 — browser repro: login then capture route error + stack.
 * Usage: node scripts/_co-bug-013-browser-repro.mjs
 * Password: VERIFY_ADMIN_PASSWORD | SMOKE_PASSWORD | DEMO_AUTH_PASSWORD | argv[2]
 */
import { chromium } from "playwright";

const BASE = process.env.VERIFY_BASE_URL || "https://catalyst-one-two.vercel.app";
const EMAIL = process.env.VERIFY_ADMIN_EMAIL || "admin@compass.com";
const PASSWORD =
  process.env.VERIFY_ADMIN_PASSWORD ||
  process.env.SMOKE_PASSWORD ||
  process.env.DEMO_AUTH_PASSWORD ||
  process.argv[2] ||
  "";

if (!PASSWORD) {
  console.log(JSON.stringify({ error: "NO_PASSWORD" }, null, 2));
  process.exit(2);
}

const pageerrors = [];
const consoleErrors = [];
const failedApis = [];

const browser = await chromium.launch({ headless: true });
const page = await browser.newPage();

page.on("pageerror", (e) => {
  pageerrors.push({ message: e.message, stack: e.stack });
});
page.on("console", (msg) => {
  if (msg.type() === "error") {
    consoleErrors.push(msg.text());
  }
});
page.on("response", (res) => {
  const u = res.url();
  if (res.status() >= 400 && (u.includes("/api/") || u.includes(BASE))) {
    failedApis.push({ status: res.status(), url: u.slice(0, 200) });
  }
});

try {
  await page.goto(`${BASE}/login`, { waitUntil: "domcontentloaded", timeout: 90000 });
  await page.waitForSelector('input[type="email"], input[name="email"]', { timeout: 30000 });
  await page.fill('input[type="email"], input[name="email"]', EMAIL);
  await page.fill('input[type="password"], input[name="password"]', PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(10000);

  const bodyText = await page.locator("body").innerText();
  console.log(
    JSON.stringify(
      {
        url: page.url(),
        hasErrorBoundary: /Unable to load this view/i.test(bodyText),
        bodySnippet: bodyText.slice(0, 800),
        pageerrors,
        consoleErrors: consoleErrors.slice(0, 50),
        failedApis: failedApis.slice(0, 40),
      },
      null,
      2,
    ),
  );
} catch (e) {
  console.log(JSON.stringify({ error: String(e), pageerrors, consoleErrors }, null, 2));
  process.exit(1);
} finally {
  await browser.close();
}
