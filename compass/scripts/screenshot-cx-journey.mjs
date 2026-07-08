import fs from "node:fs";
import { chromium } from "playwright";

fs.mkdirSync("screenshots", { recursive: true });

const shots = [
  { name: "home-360", path: "/", width: 360, height: 860 },
  { name: "home-desktop", path: "/", width: 1440, height: 900 },
  { name: "home-loan-360", path: "/home-loan", width: 360, height: 860 },
  { name: "home-loan-desktop", path: "/home-loan", width: 1440, height: 900 },
  { name: "loan-products-360", path: "/loan-products", width: 360, height: 860 },
  { name: "about-360", path: "/about", width: 360, height: 860 },
];

const browser = await chromium.launch();

for (const shot of shots) {
  const context = await browser.newContext({
    viewport: { width: shot.width, height: shot.height },
    deviceScaleFactor: 2,
  });
  const page = await context.newPage();
  await page.goto(`http://localhost:3011${shot.path}`, {
    waitUntil: "networkidle",
    timeout: 60000,
  });
  await page.waitForTimeout(800);
  await page.screenshot({
    path: `screenshots/cx-journey-${shot.name}.png`,
    fullPage: false,
  });
  await context.close();
  console.log(`saved cx-journey-${shot.name}.png`);
}

await browser.close();
console.log("screenshots: ok");
