import fs from "node:fs";
import { chromium } from "playwright";

fs.mkdirSync("screenshots", { recursive: true });

const shots = [
  { name: "home-360", path: "/", width: 360, height: 800 },
  { name: "home-390", path: "/", width: 390, height: 844 },
  { name: "home-412", path: "/", width: 412, height: 915 },
  { name: "home-tablet", path: "/", width: 768, height: 1024 },
  { name: "home-desktop", path: "/", width: 1440, height: 900 },
  { name: "home-loan-360", path: "/home-loan", width: 360, height: 800 },
  { name: "tools-360", path: "/tools", width: 360, height: 800 },
  { name: "coaches-desktop", path: "/coaches", width: 1440, height: 900 },
];

const base = process.env.COMPASS_URL ?? "http://localhost:3015";
const browser = await chromium.launch();

for (const shot of shots) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${base}${shot.path}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(700);
  await page.screenshot({
    path: `screenshots/cx-polish-${shot.name}.png`,
    fullPage: false,
  });
  await context.close();
  console.log(`saved cx-polish-${shot.name}.png`);
}

await browser.close();
console.log("screenshots: ok");
