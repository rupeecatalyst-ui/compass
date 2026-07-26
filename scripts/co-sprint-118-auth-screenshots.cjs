/**
 * CO-SPRINT-118 — Capture auth experience screenshots via Puppeteer.
 * Usage: node scripts/co-sprint-118-auth-screenshots.cjs [baseUrl]
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

const candidates = [
  process.env.CHROME,
  process.env.PUPPETEER_EXECUTABLE_PATH,
  "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe",
  "C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe",
].filter(Boolean);

const executablePath = candidates.find((p) => fs.existsSync(p));

async function shot(page, name, url, viewport) {
  await page.setViewport(viewport);
  await page.goto(url, { waitUntil: "networkidle2", timeout: 90000 });
  await new Promise((r) => setTimeout(r, 1200));
  const file = path.join(outDir, `${name}.png`);
  await page.screenshot({ path: file, fullPage: true });
  console.log("wrote", file);
}

(async () => {
  console.log("executablePath", executablePath || "(bundled)");
  const browser = await puppeteer.launch({
    headless: true,
    executablePath: executablePath || undefined,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });
  const page = await browser.newPage();

  const desktop = { width: 1440, height: 900, deviceScaleFactor: 1 };
  const mobile = { width: 390, height: 844, deviceScaleFactor: 2 };

  await shot(page, "01-sign-in-desktop", `${base}/login`, desktop);
  await shot(page, "02-create-organization-desktop", `${base}/create-organization`, desktop);
  await shot(page, "03-accept-invitation-desktop", `${base}/accept-invitation`, desktop);
  await shot(page, "04-sign-in-mobile", `${base}/login`, mobile);
  await shot(page, "05-desktop-responsive", `${base}/login`, desktop);

  await page.setViewport(desktop);
  await page.goto(`${base}/create-organization`, {
    waitUntil: "networkidle2",
    timeout: 90000,
  });
  await page.click('button[type="submit"]').catch(() => undefined);
  await new Promise((r) => setTimeout(r, 700));
  await page.screenshot({
    path: path.join(outDir, "06-validation-states.png"),
    fullPage: true,
  });
  console.log("wrote validation");

  const passwordInputs = await page.$$('input[autocomplete="new-password"]');
  if (passwordInputs[0]) {
    await passwordInputs[0].type("Aa1!strongpass");
  }
  const eye = await page.$('button[aria-label="Show password"]');
  if (eye) await eye.click();
  await new Promise((r) => setTimeout(r, 400));
  await page.screenshot({
    path: path.join(outDir, "07-password-visibility-strength.png"),
    fullPage: true,
  });
  console.log("wrote password ux");

  await browser.close();
  console.log("done", outDir);
})().catch((e) => {
  console.error(e);
  process.exit(1);
});
