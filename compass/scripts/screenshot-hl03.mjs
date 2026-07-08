import fs from "node:fs";
import { chromium } from "playwright";

fs.mkdirSync("screenshots", { recursive: true });

const shots = [
  { name: "hero-360", width: 360, height: 860 },
  { name: "hero-desktop", width: 1440, height: 900 },
  { name: "conversation-desktop", width: 1440, height: 900, scrollTo: "#advantage-conversation" },
];

const base = process.env.COMPASS_URL ?? "http://localhost:3030";
const browser = await chromium.launch();

for (const shot of shots) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`${base}/home-loan`, { waitUntil: "networkidle", timeout: 60000 });
  if (shot.scrollTo) {
    await page.locator(shot.scrollTo).scrollIntoViewIfNeeded();
    await page.waitForTimeout(600);
  } else {
    await page.waitForTimeout(800);
  }
  await page.screenshot({ path: `screenshots/hl03-${shot.name}.png`, fullPage: false });
  await context.close();
  console.log(`saved hl03-${shot.name}.png`);
}

await browser.close();
console.log("screenshots: ok");
