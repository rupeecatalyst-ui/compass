import fs from "node:fs";
import { chromium } from "playwright";

fs.mkdirSync("screenshots", { recursive: true });

const widths = [
  { name: "360", width: 360, height: 860 },
  { name: "390", width: 390, height: 860 },
  { name: "412", width: 412, height: 860 },
  { name: "desktop", width: 1440, height: 900 },
];

const browser = await chromium.launch();

for (const { name, width, height } of widths) {
  const context = await browser.newContext({
    viewport: { width, height },
    deviceScaleFactor: 2,
  });

  const page = await context.newPage();
  await page.goto("http://localhost:3001/", {
    waitUntil: "networkidle",
    timeout: 60000,
  });

  await page.waitForTimeout(1000);
  await page.screenshot({
    path: `screenshots/sprint2-home-loan-${name}.png`,
    fullPage: false,
  });
  await context.close();
  console.log(`saved sprint2-home-loan-${name}.png`);
}

await browser.close();
console.log("screenshots: ok");
