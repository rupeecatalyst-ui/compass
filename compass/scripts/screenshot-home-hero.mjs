import fs from "node:fs";
import { chromium } from "playwright";

fs.mkdirSync("screenshots", { recursive: true });

const widths = [360, 390, 412];

const browser = await chromium.launch();

for (const w of widths) {
  const context = await browser.newContext({
    viewport: { width: w, height: 860 },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  await page.goto("http://localhost:3001/", {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  await page.waitForTimeout(800);
  await page.screenshot({ path: `screenshots/home-hero-${w}.png`, fullPage: false });
  await context.close();
}

await browser.close();
console.log("screenshots: ok");

