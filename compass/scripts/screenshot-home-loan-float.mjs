import fs from "node:fs";
import { chromium } from "playwright";

fs.mkdirSync("screenshots", { recursive: true });

const shots = [
  { name: "360", width: 360, height: 860 },
  { name: "390", width: 390, height: 860 },
  { name: "412", width: 412, height: 915 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 900 },
];

const base = process.env.COMPASS_URL ?? "http://localhost:3015";
const browser = await chromium.launch();

for (const shot of shots) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${base}/home-loan`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(900);
  await page.screenshot({
    path: `screenshots/home-loan-float-${shot.name}.png`,
    fullPage: false,
  });
  await context.close();
  console.log(`saved home-loan-float-${shot.name}.png`);
}

await browser.close();
console.log("screenshots: ok");
