/**
 * CO-SPRINT-118 — Capture auth experience screenshots via Puppeteer.
 * Usage: node scripts/co-sprint-118-auth-screenshots.mjs [baseUrl]
 */
const fs = require("fs");
const path = require("path");
const puppeteer = require("puppeteer");

const base = (process.argv[2] || "https://catalyst-one-two.vercel.app").replace(/\/$/, "");
const outDir = path.join(
  process.cwd(),
  "docs",
  "certification-screenshots",
  "co-sprint-118-auth",
);
fs.mkdirSync(outDir, { recursive: true });

async function shot(page, name, url, viewport) {
  await page.setViewport(viewport);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 1200));
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("wrote", file);
}

(async () => {
  const browser = await puppeteer.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  const desktop = { width: 1440, height: 900, deviceScaleFactor: 1 };
  const mobile = { width: 390, height: 844, deviceScaleFactor: 2 };

  await shot(page, "01-sign-in-desktop", `${base}/login`, desktop);
  await shot(page, "02-create-organization-desktop", `${base}/create-organization`, desktop);
  await shot(page, "03-accept-invitation-desktop", `${base}/accept-invitation`, desktop);
  await shot(page, "04-sign-in-mobile", `${base}/login`, mobile);
  await shot(page, "05-forgot-password-desktop", `${base}/forgot-password`, desktop);

  // Validation + password visibility on create org
  await page.setViewport(desktop);
  await page.goto(`${base}/create-organization`, { waitUntil: "networkidle2", timeout: 90000 });
  await page.click('button[type="submit"]').catch(() => {});
  await new Promise((r) => setTimeout(r, 600));
  await page.screenshot({
    path: path.join(outDir, "06-validation-states.png"),
    fullPage: true,
  });
  console.log("wrote validation");

  const password = await page.$('input[autocomplete="new-password"]');
  if (password) {
    await password.type("Aa1!strongpass");
    const eye = await page.$('button[aria-label="Show password"]');
    if (eye) await eye.click();
    await new Promise((r) => setTimeout(r, 400));
    await page.screenshot({
      path: path.join(outDir, "07-password-visibility-strength.png"),
      fullPage: true,
    });
    console.log("wrote password ux");
  }

  await browser.close();
  console.log("done", outDir);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
